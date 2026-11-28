<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/** File-backed prompt banks (backend/content/{game}.{locale}.txt, one "prompt|answer;alt;alt" per line). */
class Content
{
    private static array $cache = [];

    /** @return array<int, array{0:string,1:string[]}>|null */
    public static function bank(string $game, string $locale): ?array
    {
        $key = $game.'.'.$locale;
        if (array_key_exists($key, self::$cache)) return self::$cache[$key];
        $path = base_path("content/{$game}.{$locale}.txt");
        if (!is_file($path) && $locale !== 'en') $path = base_path("content/{$game}.en.txt");
        if (!is_file($path)) return self::$cache[$key] = null;
        $out = [];
        $seen = [];
        foreach (preg_split('/\R/u', (string) file_get_contents($path)) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') continue;
            $parts = explode('|', $line, 2);
            $prompt = trim($parts[0]);
            if ($prompt === '' || isset($seen[$prompt])) continue;
            $seen[$prompt] = true;
            $answers = isset($parts[1]) ? array_values(array_filter(array_map('trim', explode(';', $parts[1])), fn ($a) => $a !== '')) : [];
            $out[] = [$prompt, $answers];
        }
        return self::$cache[$key] = $out ?: null;
    }

    public static function aliases(string $game, string $locale, string $prompt, ?int $partyId = null): array
    {
        foreach (self::bank($game, $locale) ?? [] as [$p, $a]) if ($p === $prompt) return $a;
        if ($partyId) {
            foreach (self::custom($partyId, $game) as [$p, $a]) if ($p === $prompt) return array_slice($a, 1);
        }
        return [];
    }

    /** Games a host can write their own prompts for, and the line format each one takes. */
    public const CUSTOM_GAMES = ['trivia', 'categories', 'whoami', 'charades', 'wyr', 'likely', 'imposter'];

    /** @return array<int, array{0:string,1:string[]}> the host's own prompts for one game, same shape as bank(). */
    public static function custom(int $partyId, string $game): array
    {
        $out = [];
        foreach (DB::table('party_prompts')->where('party_id', $partyId)->where('game', $game)->orderBy('id')->get() as $row) {
            $answers = $row->answer === null || $row->answer === '' ? [] : array_values(array_filter(array_map('trim', explode(';', $row->answer)), fn ($a) => $a !== ''));
            $out[] = [$row->prompt, $answers];
        }
        return $out;
    }

    /**
     * Choose one row for the next round: the built-in bank, the host's own prompts, or a mix,
     * never repeating inside the party until the pool runs out.
     * @param array<int, array{0:string,1:string[]}> $bank
     * @param array<string,int> $used prompts already played, as keys
     */
    public static function choose(int $partyId, string $game, array $bank, array $used): array
    {
        $mode = (string) (DB::table('parties')->where('id', $partyId)->value('content_mode') ?: 'builtin');
        $custom = ($mode === 'builtin' || !in_array($game, self::CUSTOM_GAMES, true)) ? [] : self::custom($partyId, $game);
        $fresh = fn (array $rows) => array_values(array_filter($rows, fn ($row) => !isset($used[$row[0]])));
        $mine = $fresh($custom);
        $built = $fresh($bank);
        if ($mode === 'only' && $custom) $pool = $mine ?: $custom;
        elseif ($mode === 'mix' && $mine && (!$built || random_int(1, 100) <= 40)) $pool = $mine;
        else $pool = $built ?: ($bank ?: $custom);
        if (!$pool) return ['', []];
        return $pool[random_int(0, count($pool) - 1)];
    }

    public static function norm(string $s): string
    {
        $s = mb_strtolower(trim($s));
        $s = strtr($s, ['٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9']);
        $s = preg_replace('/[\x{064B}-\x{065F}\x{0640}]/u', '', $s) ?? $s;
        $s = strtr($s, ['أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ة' => 'ه', 'ى' => 'ي', 'ؤ' => 'و', 'ئ' => 'ي', 'ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss', 'é' => 'e', 'í' => 'i']);
        $s = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $s) ?? $s;
        $words = preg_split('/\s+/u', trim($s), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $words = array_map(fn ($w) => (mb_strlen($w) > 3 && str_starts_with($w, 'ال')) ? mb_substr($w, 2) : $w, $words);
        if (($words[0] ?? '') === 'the' && count($words) > 1) array_shift($words);
        return implode(' ', $words);
    }

    public static function matches(string $given, string $primary, array $aliases): bool
    {
        $g = self::norm($given);
        if ($g === '') return false;
        foreach (array_merge([$primary], $aliases) as $a) if ($g === self::norm((string) $a)) return true;
        return false;
    }
}
