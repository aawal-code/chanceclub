<?php

namespace App\Support;

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

    public static function aliases(string $game, string $locale, string $prompt): array
    {
        foreach (self::bank($game, $locale) ?? [] as [$p, $a]) if ($p === $prompt) return $a;
        return [];
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
