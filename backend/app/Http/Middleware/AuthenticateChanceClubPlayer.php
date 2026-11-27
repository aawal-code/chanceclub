<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateChanceClubPlayer
{
    public function handle(Request $request, Closure $next): Response
    {
        $plain = $request->bearerToken();
        if (!$plain || strlen($plain) < 32) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $hash = hash('sha256', $plain);
        $token = DB::table('api_tokens')->where('token_hash', $hash)
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))->first();
        if ($token) {
            $user = User::find($token->user_id);
            if (!$user) return response()->json(['message' => 'Unauthenticated.'], 401);
            DB::table('api_tokens')->where('id', $token->id)->update(['last_used_at' => now(), 'updated_at' => now()]);
            $request->attributes->set('cc.user', $user);
            $request->attributes->set('cc.identity', ['kind' => 'user', 'id' => (int) $user->id, 'name' => $user->name]);
            return $next($request);
        }

        $guest = DB::table('guest_identities')->where('token_hash', $hash)->where('expires_at', '>', now())->first();
        if (!$guest) return response()->json(['message' => 'Unauthenticated.'], 401);
        DB::table('guest_identities')->where('id', $guest->id)->update(['last_used_at' => now(), 'updated_at' => now()]);
        $request->attributes->set('cc.guest', $guest);
        $request->attributes->set('cc.identity', ['kind' => 'guest', 'id' => (int) $guest->id, 'name' => $guest->display_name]);
        return $next($request);
    }
}
