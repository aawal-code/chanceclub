<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Content;
use App\Support\History;
use App\Support\PartyFlow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

/** Getting back into a party, handing the host role over, and the host's own prompts. */
class PartyFlowController extends Controller
{
    /* ------------------------------------------------------------ seats and requests */

    /** Open seats of a party, for someone who is not in it yet. The invite code is what grants the look. */
    public function seats(Request $request, string $code): JsonResponse
    {
        $identity = $this->identity($request);
        $party = $this->party($code);
        if ($this->player((int) $party->id, $identity)) return response()->json(['member' => true, 'seats' => []]);
        return response()->json([
            'member' => false, 'name' => $party->name, 'status' => $party->status,
            'seats' => PartyFlow::openSeats($party),
            'request' => PartyFlow::view(DB::table('party_requests')->where('party_id', $party->id)->where($identity['kind'] === 'user' ? 'user_id' : 'guest_id', $identity['id'])->orderByDesc('id')->first()),
        ]);
    }

    /** "That was me": ask the host to give an abandoned seat, with its score and place, to this device. */
    public function claim(Request $request, string $code): JsonResponse
    {
        $data = $request->validate(['player_id' => ['required', 'integer', 'min:1']]);
        $identity = $this->identity($request);
        $party = $this->party($code);
        if ($this->player((int) $party->id, $identity)) return response()->json(['message' => 'You are already in this party.'], 409);
        $seat = DB::table('party_players')->where('party_id', $party->id)->where('id', $data['player_id'])->first();
        if (!$seat || History::age($seat->last_seen_at) < PartyFlow::SEAT_IDLE) throw new HttpException(409, 'That seat is still in use.');
        $preset = is_string($request->input('avatar_preset')) ? $request->input('avatar_preset') : null;
        return response()->json(['requested' => true, 'request' => PartyFlow::request($party, $identity, (int) $seat->id, $preset)], 202);
    }

    /** Where my request stands. Approved means the next GET of the party works. */
    public function myRequest(Request $request, string $code): JsonResponse
    {
        $identity = $this->identity($request);
        $party = $this->party($code);
        if ($this->player((int) $party->id, $identity)) return response()->json(['request' => ['id' => '0', 'status' => 'approved', 'claim_player_id' => null]]);
        $req = DB::table('party_requests')->where('party_id', $party->id)->where($identity['kind'] === 'user' ? 'user_id' : 'guest_id', $identity['id'])->orderByDesc('id')->first();
        return response()->json(['request' => PartyFlow::view($req)]);
    }

    public function decide(Request $request, string $code, int $id, string $action): JsonResponse
    {
        $identity = $this->identity($request);
        $party = $this->party($code);
        $this->requireHost($party, $identity);
        DB::transaction(function () use ($party, $id, $action) {
            $locked = DB::table('parties')->where('id', $party->id)->lockForUpdate()->first();
            $req = DB::table('party_requests')->where('id', $id)->where('party_id', $party->id)->lockForUpdate()->first();
            if (!$req) throw new HttpException(404, 'That request is gone.');
            if ($req->status !== 'pending') return;
            if ($action === 'deny') {
                DB::table('party_requests')->where('id', $id)->update(['status' => 'denied', 'updated_at' => now()]);
                return;
            }
            $col = $req->user_id ? 'user_id' : 'guest_id';
            $who = $req->user_id ?: $req->guest_id;
            $already = DB::table('party_players')->where('party_id', $party->id)->where($col, $who)->first();
            if (!$already) {
                $seat = $req->claim_player_id ? DB::table('party_players')->where('party_id', $party->id)->where('id', $req->claim_player_id)->first() : null;
                if ($seat) {
                    // Same seat, new device: score, place and turn order stay exactly where they were.
                    DB::table('party_players')->where('id', $seat->id)->update([
                        'user_id' => $req->user_id, 'guest_id' => $req->guest_id, 'last_seen_at' => now(), 'updated_at' => now(),
                    ]);
                } else {
                    if (DB::table('party_players')->where('party_id', $party->id)->count() >= 20) throw new HttpException(409, 'This party is full.');
                    DB::table('party_players')->insert([
                        'party_id' => $party->id, 'user_id' => $req->user_id, 'guest_id' => $req->guest_id, 'display_name' => $req->display_name,
                        'is_ready' => true, 'avatar_preset' => $req->avatar_preset, 'avatar_version' => 0,
                        'last_seen_at' => now(), 'created_at' => now(), 'updated_at' => now(),
                    ]);
                }
            }
            DB::table('party_requests')->where('id', $id)->update(['status' => 'approved', 'updated_at' => now()]);
            DB::table('parties')->where('id', $party->id)->update(['updated_at' => now()]);
        });
        return response()->json(['ok' => true]);
    }

    /* ------------------------------------------------------------ host handoff */

    public function makeHost(Request $request, string $code): JsonResponse
    {
        $data = $request->validate(['player_id' => ['required', 'integer', 'min:1']]);
        $identity = $this->identity($request);
        $party = $this->party($code);
        $this->requireHost($party, $identity);
        $target = DB::table('party_players')->where('party_id', $party->id)->where('id', $data['player_id'])->first();
        if (!$target) throw new HttpException(404, 'That player is not in this party.');
        DB::table('parties')->where('id', $party->id)->update(['host_player_id' => $target->id, 'updated_at' => now()]);
        DB::table('party_players')->where('id', $target->id)->update(['is_ready' => true]);
        return response()->json(['ok' => true]);
    }

    /* ------------------------------------------------------------ host-written prompts */

    public function prompts(Request $request, string $code): JsonResponse
    {
        $party = $this->party($code);
        $this->requireHost($party, $this->identity($request));
        return response()->json(['data' => $this->promptsView($party)]);
    }

    /** Add prompts in bulk, one per line. Line shapes are fixed per game, see parse(). */
    public function addPrompts(Request $request, string $code): JsonResponse
    {
        $data = $request->validate(['game' => ['required', 'string', 'in:'.implode(',', Content::CUSTOM_GAMES)], 'lines' => ['required', 'array', 'min:1', 'max:200'], 'lines.*' => ['nullable', 'string', 'max:400']]);
        $party = $this->party($code);
        $this->requireHost($party, $this->identity($request));
        $have = DB::table('party_prompts')->where('party_id', $party->id)->where('game', $data['game'])->count();
        $rows = [];
        $skipped = 0;
        foreach ($data['lines'] as $line) {
            $parsed = $this->parse($data['game'], (string) $line);
            if (!$parsed) { $skipped++; continue; }
            if ($have + count($rows) >= 300) { $skipped++; continue; }
            $rows[] = ['party_id' => $party->id, 'game' => $data['game'], 'prompt' => $parsed[0], 'answer' => $parsed[1], 'created_at' => now(), 'updated_at' => now()];
        }
        if ($rows) DB::table('party_prompts')->insert($rows);
        return response()->json(['data' => $this->promptsView($party), 'added' => count($rows), 'skipped' => $skipped]);
    }

    public function removePrompt(Request $request, string $code, int $id): JsonResponse
    {
        $party = $this->party($code);
        $this->requireHost($party, $this->identity($request));
        DB::table('party_prompts')->where('party_id', $party->id)->where('id', $id)->delete();
        return response()->json(['data' => $this->promptsView($party)]);
    }

    public function promptMode(Request $request, string $code): JsonResponse
    {
        $data = $request->validate(['mode' => ['required', 'in:builtin,mix,only']]);
        $party = $this->party($code);
        $this->requireHost($party, $this->identity($request));
        DB::table('parties')->where('id', $party->id)->update(['content_mode' => $data['mode'], 'updated_at' => now()]);
        return response()->json(['data' => $this->promptsView(DB::table('parties')->find($party->id))]);
    }

    private function promptsView(object $party): array
    {
        return [
            'mode' => $party->content_mode ?: 'builtin',
            'items' => DB::table('party_prompts')->where('party_id', $party->id)->orderBy('id')->get()->map(fn ($r) => ['id' => (string) $r->id, 'game' => $r->game, 'prompt' => $r->prompt, 'answer' => $r->answer])->values()->all(),
        ];
    }

    /** @return array{0:string,1:?string}|null */
    private function parse(string $game, string $line): ?array
    {
        $line = trim(preg_replace('/\s+/u', ' ', $line) ?? $line);
        if ($line === '') return null;
        $parts = array_map('trim', explode('|', $line, 2));
        $prompt = mb_substr($parts[0], 0, 190);
        $answer = isset($parts[1]) && $parts[1] !== '' ? mb_substr($parts[1], 0, 190) : null;
        if ($prompt === '') return null;
        return match ($game) {
            'trivia', 'wyr', 'imposter' => $answer === null ? null : [$prompt, $answer],
            default => [$prompt, null],
        };
    }

    /* ------------------------------------------------------------ plumbing */

    private function identity(Request $request): array
    {
        return $request->attributes->get('cc.identity') ?? throw new HttpException(401, 'Unauthenticated.');
    }

    private function party(string $code): object
    {
        return DB::table('parties')->where('invite_code', strtoupper($code))->first() ?? throw new HttpException(404, 'Party not found.');
    }

    private function player(int $partyId, array $identity): ?object
    {
        return DB::table('party_players')->where('party_id', $partyId)->where($identity['kind'] === 'user' ? 'user_id' : 'guest_id', $identity['id'])->first();
    }

    private function requireHost(object $party, array $identity): void
    {
        $player = $this->player((int) $party->id, $identity) ?? throw new HttpException(404, 'Party not found.');
        if ((int) $party->host_player_id !== (int) $player->id) throw new HttpException(403, 'Only the host can do this.');
    }
}
