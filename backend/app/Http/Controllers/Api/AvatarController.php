<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\DB;

/**
 * Profile pictures: ten themed presets anyone can pick (guests keep theirs on the
 * device), plus a custom upload that only a signed-in account can store. Bytes live
 * in the database so no file system or bucket has to be provisioned, and every read
 * is immutable-cached per avatar version.
 */
class AvatarController extends Controller
{
    /** Preset ids line up with the ten themes, so each preset is drawn in that palette. */
    public const PRESETS = ['ink', 'paper', 'midnight', 'sand', 'neon', 'brutal', 'terminal', 'candy', 'forest', 'newsprint'];

    /** A 128x128 picture never needs more than this; the client resizes before sending. */
    private const MAX_BYTES = 200_000;

    private const MIMES = ['image/png', 'image/jpeg', 'image/webp'];

    /** Public read: a face is shown to everyone in the party, no auth needed. */
    public function show(string $userId): HttpResponse
    {
        $row = DB::table('user_avatars')->where('user_id', (int) $userId)->first();
        if (!$row) {
            return new HttpResponse('', 404, ['Cache-Control' => 'public, max-age=60']);
        }
        $bytes = $row->bytes;
        if (is_resource($bytes)) $bytes = stream_get_contents($bytes);
        if (is_string($bytes) && str_starts_with($bytes, '\\x')) $bytes = hex2bin(str_replace('\\x', '', $bytes));

        return new HttpResponse($bytes, 200, [
            'Content-Type' => $row->mime,
            'Content-Length' => (string) strlen($bytes),
            // The url carries ?v=<avatar_version>, so this can be cached forever.
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'ETag' => '"'.$row->user_id.'-'.$row->updated_at.'"',
        ]);
    }

    /** Custom upload, signed-in accounts only. Body: {"data":"data:image/png;base64,..."} */
    public function store(Request $request): JsonResponse
    {
        $user = $request->attributes->get('cc.user');
        if (!$user) {
            return response()->json(['message' => 'Custom pictures need a free account. Pick a preset instead.'], 403);
        }

        $data = $request->validate(['data' => ['required', 'string']]);
        $raw = $data['data'];
        if (!preg_match('#^data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$#', $raw, $m)) {
            return response()->json(['message' => 'That file is not a PNG, JPEG or WebP picture.'], 422);
        }
        $mime = $m[1];
        $bytes = base64_decode($m[2], true);
        if ($bytes === false || $bytes === '') {
            return response()->json(['message' => 'That picture could not be read.'], 422);
        }
        if (strlen($bytes) > self::MAX_BYTES) {
            return response()->json(['message' => 'That picture is too big. Try a smaller one.'], 422);
        }
        if (!in_array($mime, self::MIMES, true)) {
            return response()->json(['message' => 'That file is not a PNG, JPEG or WebP picture.'], 422);
        }

        DB::transaction(function () use ($user, $mime, $bytes) {
            DB::table('user_avatars')->updateOrInsert(
                ['user_id' => $user->id],
                ['mime' => $mime, 'bytes' => $bytes, 'byte_size' => strlen($bytes), 'updated_at' => now(), 'created_at' => now()]
            );
            DB::table('users')->where('id', $user->id)->increment('avatar_version');
        });

        $fresh = DB::table('users')->where('id', $user->id)->first();

        return response()->json(['avatar' => self::avatarView((int) $user->id, $fresh->avatar_preset ?? null, (int) ($fresh->avatar_version ?? 0))]);
    }

    /** Back to the preset. */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->attributes->get('cc.user');
        if (!$user) {
            return response()->json(['message' => 'Nothing to remove.'], 403);
        }
        DB::transaction(function () use ($user) {
            DB::table('user_avatars')->where('user_id', $user->id)->delete();
            DB::table('users')->where('id', $user->id)->increment('avatar_version');
        });

        $fresh = DB::table('users')->where('id', $user->id)->first();

        return response()->json(['avatar' => self::avatarView((int) $user->id, $fresh->avatar_preset ?? null, (int) ($fresh->avatar_version ?? 0))]);
    }

    /** Shape the web reads: which preset, and whether a custom picture exists. */
    public static function avatarView(?int $userId, ?string $preset = null, int $version = 0): array
    {
        $custom = $userId ? DB::table('user_avatars')->where('user_id', $userId)->exists() : false;

        return self::avatarFrom($custom, $userId, $preset, $version);
    }

    /** Same shape when the caller already knows whether a custom picture exists (no extra query per member). */
    public static function avatarFrom(bool $custom, ?int $userId, ?string $preset = null, int $version = 0): array
    {
        return [
            'preset' => $preset ?: 'ink',
            'custom' => $custom,
            'url' => $custom ? '/v1/avatars/'.$userId.'?v='.$version : null,
        ];
    }
}
