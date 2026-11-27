<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class Tournament
{
    public const GAMES = ['trivia', 'wordle', 'draw', 'categories', 'whoami', 'charades'];
    public const POINTS = [1 => 10, 2 => 7, 3 => 5, 4 => 4, 5 => 3, 6 => 2];

    /** Give placement points for a just-recorded match to the party's active tournament. */
    public static function award(int $partyId, int $matchId): void
    {
        DB::transaction(function () use ($partyId, $matchId) {
            $tour = DB::table('tournaments')->where('party_id', $partyId)->where('status', 'active')->orderByDesc('id')->lockForUpdate()->first();
            if (!$tour) return;
            $points = json_decode($tour->points, true) ?: [];
            foreach (DB::table('match_results')->where('match_id', $matchId)->get() as $r) {
                $row = $points[$r->player_key] ?? ['name' => $r->display_name, 'points' => 0, 'wins' => 0];
                $row['name'] = $r->display_name;
                if ($r->place) $row['points'] += self::POINTS[(int) $r->place] ?? 1;
                if ($r->is_winner) $row['wins']++;
                $points[$r->player_key] = $row;
            }
            $idx = (int) $tour->current_index + 1;
            DB::table('tournaments')->where('id', $tour->id)->update([
                'points' => json_encode((object) $points), 'current_index' => $idx,
                'status' => $idx >= (int) $tour->total_games ? 'done' : 'active', 'updated_at' => now(),
            ]);
        });
    }

    public static function view(int $partyId): ?array
    {
        $tour = DB::table('tournaments')->where('party_id', $partyId)->whereIn('status', ['active', 'done'])->orderByDesc('id')->first();
        if (!$tour) return null;
        $lineup = json_decode($tour->lineup, true) ?: [];
        $points = json_decode($tour->points, true) ?: [];
        $standings = [];
        foreach ($points as $key => $row) $standings[] = ['player_key' => $key, 'name' => $row['name'], 'points' => (int) $row['points'], 'wins' => (int) $row['wins']];
        usort($standings, fn ($a, $b) => [$b['points'], $b['wins']] <=> [$a['points'], $a['wins']]);
        $idx = (int) $tour->current_index;
        return [
            'id' => (string) $tour->id, 'status' => $tour->status, 'total' => (int) $tour->total_games, 'index' => $idx,
            'lineup' => $lineup, 'next' => $tour->status === 'active' ? ($lineup[$idx] ?? null) : null, 'standings' => $standings,
        ];
    }
}
