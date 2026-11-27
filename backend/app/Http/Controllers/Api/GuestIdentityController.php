<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GuestIdentityController extends Controller
{
    public function create(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'min:2', 'max:60']]);
        $plain = Str::random(96);
        $id = DB::table('guest_identities')->insertGetId([
            'display_name' => trim($data['name']),
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addDays(30),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return response()->json(['token' => $plain, 'guest' => $this->view(DB::table('guest_identities')->find($id))], 201);
    }

    public function me(Request $request): JsonResponse
    {
        $guest = $request->attributes->get('cc.guest');
        return $guest
            ? response()->json(['guest' => $this->view($guest)])
            : response()->json(['message' => 'This session is not a guest session.'], 404);
    }

    public function logout(Request $request): JsonResponse
    {
        $guest = $request->attributes->get('cc.guest');
        if ($guest) {
            $hasActiveLobby = DB::table('party_players')->join('parties', 'parties.id', '=', 'party_players.party_id')
                ->where('party_players.guest_id', $guest->id)->whereIn('parties.status', ['lobby', 'playing'])->exists();
            if ($hasActiveLobby) return response()->json(['message' => 'Join an account or finish your active lobbies before ending this guest session.'], 409);
            DB::table('guest_identities')->where('id', $guest->id)->delete();
        }
        return response()->json(['message' => 'Guest session ended.']);
    }

    private function view(object $guest): array
    {
        return ['id' => (string) $guest->id, 'name' => $guest->display_name, 'expires_at' => $guest->expires_at];
    }
}
