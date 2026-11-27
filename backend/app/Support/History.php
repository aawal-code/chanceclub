<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class History
{
    /** Seconds since a stored timestamp (positive for the past). */
    public static function age($ts): int
    {
        return $ts ? max(0, now()->getTimestamp() - \Illuminate\Support\Carbon::parse($ts)->getTimestamp()) : PHP_INT_MAX;
    }

    public static function key(?int $userId, ?int $guestId): string
    {
        return $userId ? 'u'.$userId : 'g'.$guestId;
    }

    /**
     * Record one finished game. $scores: list of ['user_id'=>?,'guest_id'=>?,'name'=>str,'score'=>int].
     * Idempotent on (party_id, round_number, seq). Returns match id or null when already recorded.
     */
    public static function record(string $mode, string $game, ?object $party, ?int $roundNumber, int $seq, int $rounds, array $scores): ?int
    {
        if (count($scores) === 0) return null;
        if ($party && DB::table('matches')->where('party_id', $party->id)->where('round_number', $roundNumber)->where('seq', $seq)->exists()) return null;
        usort($scores, fn ($a, $b) => $b['score'] <=> $a['score']);
        $top = $scores[0]['score'];
        $now = now();
        $matchId = DB::table('matches')->insertGetId([
            'party_id' => $party?->id, 'party_name' => $party?->name, 'mode' => $mode, 'game' => $game,
            'round_number' => $roundNumber, 'seq' => $seq, 'rounds' => max(1, $rounds),
            'finished_at' => $now, 'created_at' => $now, 'updated_at' => $now,
        ]);
        $place = 0; $last = null; $i = 0; $rows = [];
        foreach ($scores as $row) {
            $i++;
            if ($row['score'] !== $last) { $place = $i; $last = $row['score']; }
            $scored = $top > 0;
            $rows[] = [
                'match_id' => $matchId, 'party_id' => $party?->id, 'game' => $game,
                'player_key' => self::key($row['user_id'] ?? null, $row['guest_id'] ?? null),
                'user_id' => $row['user_id'] ?? null, 'guest_id' => $row['guest_id'] ?? null,
                'display_name' => mb_substr($row['name'], 0, 80), 'score' => $row['score'],
                'place' => $scored ? $place : null, 'is_winner' => $scored && $place === 1, 'finished_at' => $now,
            ];
        }
        DB::table('match_results')->insert($rows);
        return $matchId;
    }

    /** Record a party game from party_players rows (score field), using the party's last round number. */
    public static function recordParty(object $party, ?array $scoreByPlayerId = null, int $seq = 0, ?string $game = null): ?int
    {
        $last = DB::table('party_rounds')->where('party_id', $party->id)->orderByDesc('round_number')->first();
        if (!$last) return null;
        $prev = (int) DB::table('matches')->where('party_id', $party->id)->max('round_number');
        $rounds = max(1, (int) $last->round_number - $prev);
        $players = DB::table('party_players')->where('party_id', $party->id)->get();
        $scores = [];
        foreach ($players as $p) {
            $online = $p->last_seen_at && \App\Support\History::age($p->last_seen_at) < 60;
            $score = $scoreByPlayerId !== null ? (int) ($scoreByPlayerId[(string) $p->id] ?? 0) : (int) $p->score;
            if (!$online && $score <= 0 && (int) $p->id !== (int) $party->host_player_id) continue;
            $scores[] = ['user_id' => $p->user_id ? (int) $p->user_id : null, 'guest_id' => $p->guest_id ? (int) $p->guest_id : null, 'name' => $p->display_name, 'score' => $score];
        }
        $matchId = self::record('party', $game ?: $party->current_game ?: $last->game, $party, (int) $last->round_number, $seq, $rounds, $scores);
        if ($matchId) Tournament::award($party->id, $matchId);
        return $matchId;
    }
}
