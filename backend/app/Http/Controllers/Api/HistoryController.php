<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\History;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class HistoryController extends Controller
{
    private const GAMES = ['categories', 'whoami', 'trivia', 'charades', 'wyr', 'likely', 'yesno', 'dice', 'coin', 'wheel', 'number', 'wordle', 'bracket', 'draw', 'imposter', 'wordbomb', 'truths', 'neverhave'];

    private function key(Request $request): string
    {
        $i = $request->attributes->get('cc.identity') ?? throw new HttpException(401, 'Unauthenticated.');
        return ($i['kind'] === 'user' ? 'u' : 'g').$i['id'];
    }

    private function board(?int $partyId, ?string $game, int $days): array
    {
        $q = DB::table('match_results')->select('player_key', DB::raw('max(display_name) as name'), DB::raw('count(*) as games'), DB::raw('sum(case when is_winner then 1 else 0 end) as wins'), DB::raw('sum(score) as points'));
        if ($partyId) $q->where('party_id', $partyId);
        if ($game) $q->where('game', $game);
        if ($days > 0) $q->where('finished_at', '>=', now()->subDays($days));
        $rows = $q->groupBy('player_key')->orderByDesc('wins')->orderBy('games')->orderBy('name')->limit(50)->get();
        $rank = 0; $last = null; $out = [];
        foreach ($rows as $i => $r) {
            if ($r->wins !== $last) { $rank = $i + 1; $last = $r->wins; }
            $out[] = ['rank' => $rank, 'player_key' => $r->player_key, 'name' => $r->name, 'games' => (int) $r->games, 'wins' => (int) $r->wins, 'points' => (int) $r->points];
        }
        return $out;
    }

    private function params(Request $request): array
    {
        $game = $request->query('game');
        if ($game !== null && !in_array($game, self::GAMES, true)) $game = null;
        $days = (int) $request->query('days', 30);
        if (!in_array($days, [0, 7, 30, 365], true)) $days = 30;
        return [$game, $days];
    }

    public function global(Request $request): JsonResponse
    {
        [$game, $days] = $this->params($request);
        $rows = Cache::remember("lb:global:{$game}:{$days}", 60, fn () => $this->board(null, $game, $days));
        $me = $this->key($request);
        $mine = collect($rows)->firstWhere('player_key', $me);
        return response()->json(['data' => ['game' => $game, 'days' => $days, 'rows' => $rows, 'me' => $me, 'mine' => $mine, 'most_winner' => $rows[0] ?? null]]);
    }

    public function party(Request $request, string $code): JsonResponse
    {
        $party = $this->member($request, $code);
        [$game, $days] = $this->params($request);
        $rows = $this->board((int) $party->id, $game, $days);
        return response()->json(['data' => ['game' => $game, 'days' => $days, 'rows' => $rows, 'me' => $this->key($request), 'most_winner' => $rows[0] ?? null]]);
    }

    public function partyHistory(Request $request, string $code): JsonResponse
    {
        $party = $this->member($request, $code);
        $matches = DB::table('matches')->where('party_id', $party->id)->orderByDesc('finished_at')->limit(30)->get();
        $results = DB::table('match_results')->whereIn('match_id', $matches->pluck('id'))->orderBy('place')->get()->groupBy('match_id');
        return response()->json(['data' => $matches->map(fn ($m) => [
            'id' => (string) $m->id, 'game' => $m->game, 'rounds' => (int) $m->rounds, 'finished_at' => $m->finished_at,
            'results' => ($results[$m->id] ?? collect())->map(fn ($r) => ['name' => $r->display_name, 'player_key' => $r->player_key, 'score' => (int) $r->score, 'place' => $r->place, 'winner' => (bool) $r->is_winner])->values(),
        ])->values()]);
    }

    public function mine(Request $request): JsonResponse
    {
        $key = $this->key($request);
        $rows = DB::table('match_results as r')->join('matches as m', 'm.id', '=', 'r.match_id')
            ->where('r.player_key', $key)->orderByDesc('r.finished_at')->limit(50)
            ->get(['m.id', 'r.game', 'm.mode', 'm.party_name', 'r.score', 'r.place', 'r.is_winner', 'r.finished_at', 'm.rounds']);
        $tot = DB::table('match_results')->where('player_key', $key)->selectRaw('count(*) as games, sum(case when is_winner then 1 else 0 end) as wins')->first();
        return response()->json(['data' => [
            'games' => (int) ($tot->games ?? 0), 'wins' => (int) ($tot->wins ?? 0),
            'recent' => $rows->map(fn ($r) => ['id' => (string) $r->id, 'game' => $r->game, 'mode' => $r->mode, 'party' => $r->party_name, 'score' => (int) $r->score, 'place' => $r->place, 'winner' => (bool) $r->is_winner, 'finished_at' => $r->finished_at, 'rounds' => (int) $r->rounds])->values(),
        ]]);
    }

    /** Called by the Node gateway in the same container when a Draw & Guess game ends. */
    public function drawResult(Request $request): JsonResponse
    {
        $given = (string) $request->header('X-Internal-Key', '');
        if ($request->header('X-Forwarded-For') || $given === '' || !hash_equals(hash('sha256', (string) config('app.key')), $given)) {
            throw new HttpException(403, 'Forbidden.');
        }
        $data = $request->validate(['code' => ['required', 'string', 'max:16'], 'seq' => ['required', 'integer', 'min:1', 'max:1000'], 'scores' => ['required', 'array', 'max:40'], 'scores.*' => ['integer']]);
        $party = DB::table('parties')->where('invite_code', strtoupper($data['code']))->first();
        if (!$party) throw new HttpException(404, 'Party not found.');
        $id = History::recordParty($party, array_map('intval', $data['scores']), (int) $data['seq'], 'draw');
        return response()->json(['recorded' => $id !== null]);
    }

    private function member(Request $request, string $code): object
    {
        $i = $request->attributes->get('cc.identity') ?? throw new HttpException(401, 'Unauthenticated.');
        $party = DB::table('parties')->where('invite_code', strtoupper($code))->first() ?? throw new HttpException(404, 'Party not found.');
        $ok = DB::table('party_players')->where('party_id', $party->id)->where($i['kind'] === 'user' ? 'user_id' : 'guest_id', $i['id'])->exists();
        if (!$ok) throw new HttpException(404, 'Party not found.');
        return $party;
    }
}
