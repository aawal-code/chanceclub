<?php

namespace App\Support;

class Wordle
{
    public const LENGTH = 5;
    public const MAX_GUESSES = 6;

    /**
     * Official Wordle lists, kept server-side so the client bundle never
     * contains the words rounds are drawn from. Answers come only from the
     * curated answer list; guesses are accepted from the full allowed list
     * (answers included), exactly like the real game.
     */
    private static function wordFile(string $name): array
    {
        $path = base_path('resources/wordle/' . $name);
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        return array_values(array_filter(array_map('trim', $lines), fn ($w) => strlen($w) === self::LENGTH));
    }

    /** @return string[] */
    private static function answerList(): array
    {
        static $list = null;
        if ($list === null) $list = self::wordFile('answers.txt');
        return $list;
    }

    /** @return array<string,bool> */
    private static function validMap(): array
    {
        static $map = null;
        if ($map === null) {
            $map = [];
            foreach (array_merge(self::answerList(), self::wordFile('guesses.txt')) as $word) {
                $map[$word] = true;
            }
        }
        return $map;
    }

    public static function pick(): string
    {
        $words = self::answerList();
        return $words[random_int(0, count($words) - 1)];
    }

    public static function isValid(string $word): bool
    {
        return isset(self::validMap()[mb_strtolower($word)]);
    }

    /** @return string[] hit|near|miss per letter */
    public static function pattern(string $guess, string $target): array
    {
        $guess = mb_str_split(mb_strtolower($guess));
        $target = mb_str_split(mb_strtolower($target));
        $result = array_fill(0, count($guess), 'miss');
        $pool = [];
        foreach ($target as $i => $letter) {
            if (($guess[$i] ?? null) === $letter) $result[$i] = 'hit';
            else $pool[$letter] = ($pool[$letter] ?? 0) + 1;
        }
        foreach ($guess as $i => $letter) {
            if ($result[$i] === 'hit') continue;
            if (($pool[$letter] ?? 0) > 0) { $result[$i] = 'near'; $pool[$letter]--; }
        }
        return $result;
    }
}
