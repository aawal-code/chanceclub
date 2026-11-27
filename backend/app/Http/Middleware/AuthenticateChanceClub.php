<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateChanceClub
{
    public function handle(Request $request, Closure $next): Response
    {
        $plain = $request->bearerToken();
        if (!$plain || strlen($plain) < 32) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $token = DB::table('api_tokens')
            ->where('token_hash', hash('sha256', $plain))
            ->where(function ($query) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })->first();

        if (!$token) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        DB::table('api_tokens')->where('id', $token->id)->update(['last_used_at' => now(), 'updated_at' => now()]);
        $user = \App\Models\User::find($token->user_id);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $request->attributes->set('cc.user', $user);
        $request->attributes->set('cc.token_id', $token->id);
        return $next($request);
    }
}
