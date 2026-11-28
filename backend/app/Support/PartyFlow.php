<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

/** Asking a host to let you in: a new player joining a running game, or someone taking back their old seat. */
class PartyFlow
{
    /** Seconds without a sign of life before a seat counts as abandoned and can be claimed. */
    public const SEAT_IDLE = 30;

    /** Create (or refresh) the pending request for this identity. Returns the public view of it. */
    public static function request(object $party, array $identity, ?int $claimPlayerId, ?string $preset): array
    {
        $userId = $identity['kind'] === 'user' ? $identity['id'] : null;
        $guestId = $identity['kind'] === 'guest' ? $identity['id'] : null;
        $mine = DB::table('party_requests')->where('party_id', $party->id)
            ->where($userId ? 'user_id' : 'guest_id', $userId ?: $guestId)->orderByDesc('id')->first();
        if ($mine && $mine->status === 'pending') {
            DB::table('party_requests')->where('id', $mine->id)->update(['claim_player_id' => $claimPlayerId ?: $mine->claim_player_id, 'updated_at' => now()]);
            return self::view(DB::table('party_requests')->find($mine->id));
        }
        if (DB::table('party_requests')->where('party_id', $party->id)->where('status', 'pending')->count() >= 12) {
            throw new HttpException(429, 'Too many people are waiting to join this party.');
        }
        $id = DB::table('party_requests')->insertGetId([
            'party_id' => $party->id, 'user_id' => $userId, 'guest_id' => $guestId,
            'display_name' => mb_substr((string) $identity['name'], 0, 80), 'avatar_preset' => $preset,
            'claim_player_id' => $claimPlayerId, 'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
        ]);
        return self::view(DB::table('party_requests')->find($id));
    }

    public static function view(?object $req): ?array
    {
        if (!$req) return null;
        return ['id' => (string) $req->id, 'status' => $req->status, 'claim_player_id' => $req->claim_player_id ? (string) $req->claim_player_id : null];
    }

    /** Seats a returning player could take over: people who have not been seen for a while. */
    public static function openSeats(object $party): array
    {
        return DB::table('party_players')->where('party_id', $party->id)->orderBy('id')->get()
            ->filter(fn ($p) => History::age($p->last_seen_at) >= self::SEAT_IDLE)
            ->map(fn ($p) => ['id' => (string) $p->id, 'name' => $p->display_name, 'score' => (int) $p->score])
            ->values()->all();
    }
}
