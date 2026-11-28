<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class ChanceClubController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email:rfc', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(8)],
        ]);

        $user = User::create(['name' => trim($data['name']), 'email' => strtolower(trim($data['email'])), 'password' => Hash::make($data['password'])]);
        $this->linkGuestToAccount($request, $user);
        return $this->issueToken($user, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string', 'max:200']]);
        $user = User::where('email', strtolower(trim($data['email'])))->first();
        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'The email or password was incorrect.'], 422);
        }
        $this->linkGuestToAccount($request, $user);
        return $this->issueToken($user);
    }

    public function me(Request $request): JsonResponse
    {
        $identity = $request->attributes->get('cc.identity');
        $user = $this->user($request);

        return response()->json([
            'identity' => $identity,
            'user' => $user ? $this->userView($user) : null,
            'guest' => $user ? null : $this->guestView($request->attributes->get('cc.guest')),
        ]);
    }

    public function updateMe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:80'],
            'preferred_language' => ['sometimes', 'in:en,ar,de'],
            'theme' => ['sometimes', 'in:ink,paper,midnight,sand,neon,brutal,terminal,candy,forest,newsprint,light,dark'],
        ]);

        $user = $this->user($request);
        if ($user) {
            $user->fill($data)->save();
            return response()->json(['user' => $this->userView($user->fresh())]);
        }

        // Guests can rename themselves; language and theme live on the device for a guest.
        $guest = $request->attributes->get('cc.guest');
        if (isset($data['name']) && $guest) {
            DB::table('guest_identities')->where('id', $guest->id)->update([
                'display_name' => trim($data['name']),
                'updated_at' => now(),
            ]);
            $guest = DB::table('guest_identities')->find($guest->id);
        }

        return response()->json(['guest' => $this->guestView($guest)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $tokenId = $request->attributes->get('cc.token_id');
        if ($tokenId) {
            DB::table('api_tokens')->where('id', $tokenId)->delete();
            return response()->json(['message' => 'Signed out.']);
        }

        // Guest sessions end here too, so no screen needs an account to sign out.
        $guest = $request->attributes->get('cc.guest');
        if ($guest) {
            $hasActiveLobby = DB::table('party_players')->join('parties', 'parties.id', '=', 'party_players.party_id')
                ->where('party_players.guest_id', $guest->id)->whereIn('parties.status', ['lobby', 'playing'])->exists();
            if ($hasActiveLobby) {
                return response()->json(['message' => 'Finish or leave your active lobby before ending this guest session.'], 409);
            }
            DB::table('guest_identities')->where('id', $guest->id)->delete();
        }

        return response()->json(['message' => 'Signed out.']);
    }

    public function parties(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $memberIds = DB::table('party_players')->where('user_id', $user->id)->pluck('party_id');
        $items = DB::table('parties')->where('owner_id', $user->id)->orWhereIn('id', $memberIds)->latest()->limit(50)->get();
        return response()->json(['data' => $items->map(fn ($party) => $this->partyView($party))]);
    }

    public function createParty(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:1', 'max:80'],
            'players' => ['sometimes', 'array', 'max:20'],
            'players.*' => ['string', 'min:1', 'max:60'],
        ]);
        $user = $this->user($request);
        $party = DB::transaction(function () use ($data, $user) {
            $code = $this->uniqueCode('parties', 'invite_code');
            $id = DB::table('parties')->insertGetId(['owner_id' => $user->id, 'name' => trim($data['name']), 'invite_code' => $code, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
            $names = collect($data['players'] ?? [])->map(fn ($name) => trim($name))->filter()->unique()->values();
            if (!$names->contains($user->name)) $names->prepend($user->name);
            foreach ($names as $name) DB::table('party_players')->insert(['party_id' => $id, 'display_name' => $name, 'user_id' => $name === $user->name ? $user->id : null, 'created_at' => now(), 'updated_at' => now()]);
            return DB::table('parties')->where('id', $id)->first();
        });
        return response()->json(['data' => $this->partyView($party)], 201);
    }

    public function showParty(string $code): JsonResponse
    {
        $party = DB::table('parties')->where('invite_code', strtoupper($code))->where('status', 'active')->first();
        return $party ? response()->json(['data' => $this->partyView($party)]) : response()->json(['message' => 'Party not found.'], 404);
    }

    public function joinParty(Request $request, string $code): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'min:1', 'max:60']]);
        $party = DB::table('parties')->where('invite_code', strtoupper($code))->where('status', 'active')->first();
        if (!$party) return response()->json(['message' => 'Party not found.'], 404);
        $name = trim($data['name']);
        $user = $request->attributes->get('cc.user');
        $already = DB::table('party_players')->where('party_id', $party->id)->where('display_name', $name)->exists();
        if (!$already) DB::table('party_players')->insert(['party_id' => $party->id, 'user_id' => $user?->id, 'display_name' => $name, 'created_at' => now(), 'updated_at' => now()]);
        return response()->json(['data' => $this->partyView($party), 'message' => 'Joined party.']);
    }

    public function updatePartyState(Request $request, string $code): JsonResponse
    {
        $data = $request->validate(['game' => ['required', 'string', 'max:40'], 'state' => ['required', 'array', 'max:30']]);
        $party = DB::table('parties')->where('invite_code', strtoupper($code))->where('status', 'active')->first();
        if (!$party) return response()->json(['message' => 'Party not found.'], 404);
        DB::table('parties')->where('id', $party->id)->update(['current_game' => $data['game'], 'state' => json_encode($data['state'], JSON_THROW_ON_ERROR), 'updated_at' => now()]);
        return response()->json(['data' => $this->partyView(DB::table('parties')->where('id', $party->id)->first())]);
    }

    public function teams(Request $request): JsonResponse
    {
        $user = $this->user($request);
        if (!$user) return response()->json(['data' => []]);
        $memberIds = DB::table('team_members')->where('user_id', $user->id)->pluck('team_id');
        $items = DB::table('teams')->where('owner_id', $user->id)->orWhereIn('id', $memberIds)->latest()->limit(50)->get();
        return response()->json(['data' => $items->map(fn ($team) => $this->teamView($team))]);
    }

    public function createTeam(Request $request): JsonResponse
    {
        if (!$user = $this->user($request)) return $this->needsAccount();
        $data = $request->validate(['name' => ['required', 'string', 'min:2', 'max:80']]);
        $id = DB::transaction(function () use ($data, $user) {
            $id = DB::table('teams')->insertGetId(['owner_id' => $user->id, 'name' => trim($data['name']), 'invite_code' => $this->uniqueCode('teams', 'invite_code'), 'created_at' => now(), 'updated_at' => now()]);
            DB::table('team_members')->insert(['team_id' => $id, 'user_id' => $user->id, 'display_name' => $user->name, 'role' => 'owner', 'created_at' => now(), 'updated_at' => now()]);
            return $id;
        });
        return response()->json(['data' => $this->teamView(DB::table('teams')->where('id', $id)->first())], 201);
    }

    public function showTeam(string $code): JsonResponse
    {
        $team = DB::table('teams')->where('invite_code', strtoupper($code))->first();
        return $team ? response()->json(['data' => $this->teamView($team)]) : response()->json(['message' => 'Team not found.'], 404);
    }

    public function joinTeam(Request $request, string $code): JsonResponse
    {
        $team = DB::table('teams')->where('invite_code', strtoupper($code))->first();
        if (!$team) return response()->json(['message' => 'Team not found.'], 404);
        if (!$user = $this->user($request)) return $this->needsAccount();
        DB::table('team_members')->updateOrInsert(['team_id' => $team->id, 'user_id' => $user->id], ['display_name' => $user->name, 'role' => 'member', 'updated_at' => now(), 'created_at' => now()]);
        return response()->json(['data' => $this->teamView($team)]);
    }

    private function issueToken(User $user, int $status = 200): JsonResponse
    {
        $plain = Str::random(80);
        $refresh = Str::random(80);
        DB::table('api_tokens')->insert([
            'user_id' => $user->id, 'token_hash' => hash('sha256', $plain), 'expires_at' => now()->addDays(2),
            'refresh_hash' => hash('sha256', $refresh), 'refresh_expires_at' => now()->addDays(365),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return response()->json(['token' => $plain, 'refresh_token' => $refresh, 'expires_in' => 2 * 86400, 'user' => $this->userView($user)], $status);
    }

    /** Exchange a long-lived refresh token for a fresh access token. The refresh token slides forward on use. */
    public function refresh(Request $request): JsonResponse
    {
        $data = $request->validate(['refresh_token' => ['required', 'string', 'min:32', 'max:200']]);
        $row = DB::table('api_tokens')->where('refresh_hash', hash('sha256', $data['refresh_token']))->where('refresh_expires_at', '>', now())->first();
        if (!$row) return response()->json(['message' => 'Session expired. Please sign in again.'], 401);
        $user = User::find($row->user_id);
        if (!$user) return response()->json(['message' => 'Session expired. Please sign in again.'], 401);
        $plain = Str::random(80);
        DB::table('api_tokens')->where('id', $row->id)->update([
            'token_hash' => hash('sha256', $plain), 'expires_at' => now()->addDays(2),
            'refresh_expires_at' => now()->addDays(365), 'updated_at' => now(),
        ]);
        return response()->json(['token' => $plain, 'refresh_token' => $data['refresh_token'], 'expires_in' => 2 * 86400, 'user' => $this->userView($user)]);
    }

    private function user(Request $request): ?User { return $request->attributes->get('cc.user'); }

    private function guestView(?object $guest): ?array
    {
        return $guest ? ['id' => (string) $guest->id, 'name' => $guest->display_name] : null;
    }

    private function needsAccount(): JsonResponse
    {
        return response()->json(['message' => 'Teams need a free account. Everything else works as a guest.'], 403);
    }

    private function userView(User $user): array
    {
        return ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'preferred_language' => $user->preferred_language, 'theme' => $user->theme];
    }

    private function partyView(object $party): array
    {
        return ['id' => (string) $party->id, 'name' => $party->name, 'code' => $party->invite_code, 'players' => DB::table('party_players')->where('party_id', $party->id)->orderBy('id')->pluck('display_name')->all(), 'game' => $party->current_game, 'state' => $party->state ? json_decode($party->state, true) : null, 'createdAt' => $party->created_at];
    }

    private function teamView(object $team): array
    {
        return ['id' => (string) $team->id, 'name' => $team->name, 'code' => $team->invite_code, 'members' => DB::table('team_members')->where('team_id', $team->id)->orderBy('id')->pluck('display_name')->all()];
    }

    private function linkGuestToAccount(Request $request, User $user): void
    {
        $plain = $request->bearerToken();
        if (!$plain) return;
        $guest = DB::table('guest_identities')->where('token_hash', hash('sha256', $plain))->where('expires_at', '>', now())->first();
        if (!$guest) return;
        DB::transaction(function () use ($guest, $user) {
            foreach (DB::table('party_players')->where('guest_id', $guest->id)->get() as $player) {
                $existing = DB::table('party_players')->where('party_id', $player->party_id)->where('user_id', $user->id)->first();
                if ($existing) {
                    DB::table('party_players')->where('id', $existing->id)->update([
                        'score' => (int) $existing->score + (int) $player->score,
                        'is_ready' => (bool) $existing->is_ready || (bool) $player->is_ready,
                        'updated_at' => now(),
                    ]);
                    DB::table('party_players')->where('id', $player->id)->delete();
                } else {
                    DB::table('party_players')->where('id', $player->id)->update(['guest_id' => null, 'user_id' => $user->id, 'display_name' => $user->name, 'updated_at' => now()]);
                }
            }
            DB::table('match_results')->where('guest_id', $guest->id)->update(['user_id' => $user->id, 'guest_id' => null, 'player_key' => 'u'.$user->id, 'display_name' => $user->name]);
            DB::table('guest_identities')->where('id', $guest->id)->delete();
        });
    }

    private function uniqueCode(string $table, string $column): string
    {
        do { $code = Str::upper(Str::random(8)); } while (DB::table($table)->where($column, $code)->exists());
        return $code;
    }
}
