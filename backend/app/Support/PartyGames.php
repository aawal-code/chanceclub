<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * The three turn-based party games that run on the lobby API: Imposter, Word Bomb,
 * Two Truths and a Lie. Each round keeps its whole state in parties.state[game] so a
 * polling client sees one consistent picture, and mirrors status/outcome/turn onto
 * party_rounds so history, the host controls and the tournament pool work unchanged.
 */
class PartyGames
{
    public const GAMES = ['imposter', 'wordbomb', 'truths'];

    private const CLUE_MS = 45000;
    private const VOTE_MS = 40000;
    private const GUESS_MS = 25000;
    private const WRITE_MS = 180000;
    private const TRUTHS_VOTE_MS = 35000;
    private const TRUTHS_REVEAL_MS = 11000;
    private const BOMB_START_MS = 20000;
    private const BOMB_MIN_MS = 7000;
    private const BOMB_STEP_MS = 1500;

    public static function isNew(?string $game): bool
    {
        return in_array((string) $game, self::GAMES, true);
    }

    public static function ms(): int
    {
        return (int) floor(microtime(true) * 1000);
    }

    public static function title(string $game, string $locale): string
    {
        $titles = [
            'imposter' => ['en' => 'Who is the imposter?', 'ar' => 'مين المحتال؟', 'de' => 'Wer ist der Bluffer?'],
            'wordbomb' => ['en' => 'Word Bomb', 'ar' => 'قنبلة الكلمات', 'de' => 'Wortbombe'],
            'truths' => ['en' => 'Two truths and a lie', 'ar' => 'حقيقتين وكذبة', 'de' => 'Zwei Wahrheiten und eine Lüge'],
        ];
        return $titles[$game][$locale] ?? $titles[$game]['en'];
    }

    /** Build a fresh round: prompt, answer, whose turn, and the state to store. */
    public static function start(object $party, $members, string $game, string $locale): array
    {
        $ids = $members->pluck('id')->map(fn ($id) => (string) $id)->values()->all();
        if (count($ids) < 2) throw new HttpException(409, 'At least two players are needed.');
        return match ($game) {
            'imposter' => self::startImposter((int) $party->id, $ids, $locale),
            'wordbomb' => self::startBomb((int) $party->id, $ids, $locale),
            'truths' => self::startTruths($ids, $locale),
        };
    }

    /* ------------------------------------------------------------------ start */

    private static function startImposter(int $partyId, array $ids, string $locale): array
    {
        if (count($ids) < 3) throw new HttpException(422, 'Imposter needs at least three players.');
        $bank = Content::bank('imposter', $locale) ?? Content::bank('imposter', 'en');
        if (!$bank) throw new HttpException(503, 'The word bank is missing.');
        $used = array_flip(DB::table('party_rounds')->where('party_id', $partyId)->where('game', 'imposter')->pluck('answer')->filter()->all());
        $row = Content::choose($partyId, 'imposter', $bank, $used);
        shuffle($ids);
        $imposterId = $ids[random_int(0, count($ids) - 1)];
        $state = [
            'phase' => 'clues',
            'order' => $ids,
            'clueIndex' => 0,
            'civilian' => $row[0],
            'imposterWord' => $row[1][0] ?? $row[0],
            'imposterId' => $imposterId,
            'clues' => (object) [],
            'votes' => (object) [],
            'caught' => null,
            'guessed' => false,
            'locale' => $locale,
            'endsAt' => self::ms() + self::CLUE_MS,
        ];
        return ['prompt' => self::title('imposter', $locale), 'answer' => $row[0], 'turn' => (int) $ids[0], 'state' => $state];
    }

    private static function startBomb(int $partyId, array $ids, string $locale): array
    {
        $bank = Content::bank('wordbomb', $locale) ?? Content::bank('wordbomb', 'en');
        if (!$bank) throw new HttpException(503, 'The category bank is missing.');
        $used = array_flip(DB::table('party_rounds')->where('party_id', $partyId)->where('game', 'wordbomb')->pluck('prompt')->all());
        $pool = array_values(array_filter($bank, fn ($row) => !isset($used[$row[0]]) && count($row[1]) >= 5));
        if (!$pool) $pool = $bank;
        $row = $pool[random_int(0, count($pool) - 1)];
        shuffle($ids);
        $state = [
            'phase' => 'play',
            'order' => $ids,
            'holderId' => $ids[0],
            'category' => $row[0],
            'accepted' => array_values($row[1]),
            'used' => [],
            'passes' => 0,
            'fuseMs' => self::BOMB_START_MS,
            'locale' => $locale,
            'endsAt' => self::ms() + self::BOMB_START_MS,
        ];
        return ['prompt' => $row[0], 'answer' => null, 'turn' => (int) $ids[0], 'state' => $state];
    }

    private static function startTruths(array $ids, string $locale = 'en'): array
    {
        shuffle($ids);
        $topics = Content::bank('truths', $locale) ?? Content::bank('truths', 'en') ?? [];
        $topic = $topics ? $topics[random_int(0, count($topics) - 1)][0] : '';
        $state = [
            'phase' => 'write',
            'topic' => $topic,
            'order' => $ids,
            'statements' => (object) [],
            'lies' => (object) [],
            'votes' => (object) [],
            'results' => (object) [],
            'subjectIndex' => 0,
            'locale' => $locale,
            'endsAt' => self::ms() + self::WRITE_MS,
        ];
        return ['prompt' => self::title('truths', $locale), 'answer' => null, 'turn' => null, 'state' => $state];
    }

    /* ------------------------------------------------------------------ state io */

    public static function read(object $party, string $game): array
    {
        $all = $party->state ? (json_decode((string) $party->state, true) ?: []) : [];
        return is_array($all[$game] ?? null) ? $all[$game] : [];
    }

    private static function persist(object $party, object $round, array $state): void
    {
        $game = $round->game;
        $status = $state['status'] ?? 'active';
        $outcome = $state['outcome'] ?? null;
        $turn = self::turnOf($game, $state);
        $copy = $state;
        unset($copy['status'], $copy['outcome']);
        DB::table('parties')->where('id', $party->id)->update([
            'state' => json_encode([$game => $copy], JSON_UNESCAPED_UNICODE),
            'updated_at' => now(),
        ]);
        DB::table('party_rounds')->where('id', $round->id)->update([
            'status' => $status,
            'outcome' => $outcome === null ? null : json_encode($outcome, JSON_UNESCAPED_UNICODE),
            'turn_player_id' => $turn,
            'updated_at' => now(),
        ]);
    }

    private static function turnOf(string $game, array $state): ?int
    {
        if ($game === 'imposter') {
            if (($state['phase'] ?? '') === 'clues') return isset($state['order'][$state['clueIndex']]) ? (int) $state['order'][$state['clueIndex']] : null;
            if (($state['phase'] ?? '') === 'guess') return (int) $state['imposterId'];
            return null;
        }
        if ($game === 'wordbomb') return isset($state['holderId']) ? (int) $state['holderId'] : null;
        return null;
    }

    private static function award(int $playerId, int $points): void
    {
        if ($points > 0) DB::table('party_players')->where('id', $playerId)->increment('score', $points);
    }

    private static function onlineIds($members): array
    {
        return $members->filter(fn ($p) => $p->last_seen_at && History::age($p->last_seen_at) < 25)->pluck('id')->map(fn ($id) => (string) $id)->values()->all();
    }

    /* ------------------------------------------------------------------ tick */

    /** Resolve any phase whose clock ran out. Safe to call on every read. */
    public static function tick(object $party, $members): void
    {
        $round = DB::table('party_rounds')->where('party_id', $party->id)->orderByDesc('round_number')->first();
        if (!$round || !self::isNew($round->game) || $round->status !== 'active') return;
        $fresh = DB::table('parties')->where('id', $party->id)->first();
        if (!$fresh) return;
        $state = self::read($fresh, $round->game);
        if (!$state) return;
        $now = self::ms();
        $guard = 0;
        $changed = false;
        while (($state['status'] ?? 'active') === 'active' && (int) ($state['endsAt'] ?? 0) > 0 && $now >= (int) $state['endsAt'] && $guard++ < 40) {
            self::expire($fresh, $round, $state, $members);
            $changed = true;
        }
        if ($changed) self::persist($fresh, $round, $state);
    }

    private static function expire(object $party, object $round, array &$state, $members): void
    {
        $online = self::onlineIds($members);
        if ($round->game === 'imposter') {
            if ($state['phase'] === 'clues') { self::advanceClue($party, $state, $members, true); return; }
            if ($state['phase'] === 'vote') { self::resolveImposterVote($party, $state, $members); return; }
            if ($state['phase'] === 'guess') { self::revealImposter($state, true, false); return; }
            $state['endsAt'] = 0;
            return;
        }
        if ($round->game === 'wordbomb') {
            if ($state['phase'] === 'play') { self::boom($state, $members); return; }
            $state['endsAt'] = 0;
            return;
        }
        if ($state['phase'] === 'write') { self::beginTruthsVote($state, $members); return; }
        if ($state['phase'] === 'vote') { self::revealSubject($state, $members); return; }
        if ($state['phase'] === 'reveal') { self::nextSubject($state, $members); return; }
        $state['endsAt'] = 0;
    }

    /* ------------------------------------------------------------------ act */

    public static function act(object $party, object $round, object $player, array $data, $members): void
    {
        $state = self::read($party, $round->game);
        if (!$state) throw new HttpException(409, 'This round has no state.');
        $online = self::onlineIds($members);
        $now = self::ms();
        if (($state['status'] ?? 'active') !== 'active') throw new HttpException(409, 'This round is already resolved.');
        if ((int) ($state['endsAt'] ?? 0) > 0 && $now >= (int) $state['endsAt']) {
            self::expire($party, $round, $state, $members);
            self::persist($party, $round, $state);
            throw new HttpException(409, 'Too late, the moment passed.');
        }
        if ($round->game === 'imposter') self::actImposter($party, $state, $player, $data, $members, $online);
        elseif ($round->game === 'wordbomb') self::actBomb($party, $state, $player, $data, $members, $online);
        else self::actTruths($party, $state, $player, $data, $members, $online);
        self::persist($party, $round, $state);
    }

    /* ------------------------------------------------------------------ imposter */

    private static function actImposter(object $party, array &$state, object $player, array $data, $members, array $online): void
    {
        $me = (string) $player->id;
        $phase = $state['phase'];
        if ($phase === 'clues') {
            $turn = (string) ($state['order'][$state['clueIndex']] ?? '');
            if ($turn !== $me) throw new HttpException(403, 'It is not your turn for a clue.');
            $clue = trim((string) ($data['value'] ?? ''));
            if ($clue === '') throw new HttpException(422, 'Write a clue first.');
            $clue = mb_substr(preg_replace('/\s+/u', ' ', $clue) ?? $clue, 0, 60);
            $clues = (array) $state['clues'];
            $clues[$me] = $clue;
            $state['clues'] = (object) $clues;
            self::advanceClue($party, $state, $members, false);
            return;
        }
        if ($phase === 'vote') {
            if (!in_array($me, array_map('strval', $state['order']), true)) throw new HttpException(403, 'You are not in this round.');
            $votes = (array) $state['votes'];
            if (isset($votes[$me])) throw new HttpException(409, 'You already voted.');
            $target = (string) (int) ($data['target_player_id'] ?? 0);
            if ($target === $me) throw new HttpException(422, 'You cannot vote for yourself.');
            if (!in_array($target, array_map('strval', $state['order']), true)) throw new HttpException(422, 'Vote for a player in this round.');
            $votes[$me] = $target;
            $state['votes'] = (object) $votes;
            $eligible = array_values(array_filter(array_map('strval', $state['order']), fn ($id) => in_array($id, $online, true)));
            if (count($eligible) < 2) $eligible = array_map('strval', $state['order']);
            if (count($votes) >= count($eligible)) self::resolveImposterVote($party, $state, $members);
            return;
        }
        if ($phase === 'guess') {
            if ($me !== (string) $state['imposterId']) throw new HttpException(403, 'Only the imposter guesses.');
            $guess = trim((string) ($data['value'] ?? ''));
            if ($guess === '') throw new HttpException(422, 'Type your guess.');
            $aliases = Content::aliases('imposter', self::localeOf($state), (string) $state['civilian']);
            $ok = Content::matches($guess, (string) $state['civilian'], $aliases);
            if ($ok) { self::revealImposter($state, true, true); return; }
            throw new HttpException(422, 'wrong');
        }
        throw new HttpException(409, 'The round is over.');
    }

    private static function advanceClue(object $party, array &$state, $members, bool $skipped): void
    {
        $order = array_map('strval', $state['order']);
        $online = self::onlineIds($members);
        $index = (int) $state['clueIndex'] + 1;
        // Walk past anyone who has gone offline so the room never waits on a ghost.
        while ($index < count($order) && !in_array($order[$index], $online, true)) {
            $clues = (array) $state['clues'];
            $clues[$order[$index]] = '…';
            $state['clues'] = (object) $clues;
            $index++;
        }
        if ($index >= count($order)) {
            $state['phase'] = 'vote';
            $state['clueIndex'] = count($order);
            $state['endsAt'] = self::ms() + self::VOTE_MS;
            return;
        }
        $state['clueIndex'] = $index;
        $state['endsAt'] = self::ms() + self::CLUE_MS;
    }

    private static function resolveImposterVote(object $party, array &$state, $members): void
    {
        $votes = (array) $state['votes'];
        $tally = [];
        foreach ($votes as $voter => $target) $tally[(string) $target] = ($tally[(string) $target] ?? 0) + 1;
        arsort($tally);
        $top = $tally ? (string) array_key_first($tally) : '';
        $topCount = $top !== '' ? (int) $tally[$top] : 0;
        $tied = $topCount > 0 && count(array_filter($tally, fn ($count) => (int) $count === $topCount)) > 1;
        $caught = !$tied && $topCount > 0 && $top === (string) $state['imposterId'];
        $state['tally'] = (object) $tally;
        if (!$caught) {
            self::revealImposter($state, false, false);
            return;
        }
        $state['phase'] = 'guess';
        $state['caught'] = true;
        $state['endsAt'] = self::ms() + self::GUESS_MS;
    }

    private static function revealImposter(array &$state, bool $caught, bool $guessed): void
    {
        $imposter = (string) $state['imposterId'];
        $votes = (array) $state['votes'];
        $points = [];
        if ($caught && $guessed) {
            self::award((int) $imposter, 2);
            $points[$imposter] = 2;
            foreach ($votes as $voter => $target) {
                if ((string) $target === $imposter) { self::award((int) $voter, 1); $points[(string) $voter] = 1; }
            }
        } elseif ($caught) {
            foreach ($votes as $voter => $target) {
                if ((string) $target === $imposter) { self::award((int) $voter, 2); $points[(string) $voter] = 2; }
            }
        } else {
            self::award((int) $imposter, 3);
            $points[$imposter] = 3;
        }
        $state['phase'] = 'reveal';
        $state['status'] = 'complete';
        $state['caught'] = $caught;
        $state['guessed'] = $guessed;
        $state['endsAt'] = 0;
        $state['outcome'] = [
            'civilian' => $state['civilian'],
            'imposterWord' => $state['imposterWord'],
            'imposterId' => $imposter,
            'caught' => $caught,
            'guessed' => $guessed,
            'tally' => (object) ($state['tally'] ?? []),
            'points' => (object) $points,
        ];
    }

    /* ------------------------------------------------------------------ word bomb */

    private static function actBomb(object $party, array &$state, object $player, array $data, $members, array $online): void
    {
        $me = (string) $player->id;
        if (($state['phase'] ?? '') !== 'play') throw new HttpException(409, 'The round is over.');
        if ((string) $state['holderId'] !== $me) throw new HttpException(403, 'The bomb is not in your hands.');
        $word = trim((string) ($data['value'] ?? ''));
        if ($word === '') throw new HttpException(422, 'Type a word.');
        $word = mb_substr(preg_replace('/\s+/u', ' ', $word) ?? $word, 0, 40);
        $norm = Content::norm($word);
        if ($norm === '') throw new HttpException(422, 'Type a word.');
        foreach ($state['used'] as $already) {
            if (Content::norm((string) $already) === $norm) throw new HttpException(422, 'duplicate');
        }
        $accepted = array_values($state['accepted']);
        $hit = null;
        foreach ($accepted as $candidate) {
            if (Content::matches($word, (string) $candidate, [])) { $hit = (string) $candidate; break; }
        }
        if ($hit === null) throw new HttpException(422, 'wrong');
        self::award((int) $me, 1);
        $used = array_values($state['used']);
        $used[] = $hit;
        $state['used'] = $used;
        $state['passes'] = (int) $state['passes'] + 1;
        $order = array_map('strval', $state['order']);
        $index = array_search($me, $order, true);
        $next = null;
        $count = count($order);
        for ($step = 1; $step <= $count; $step++) {
            $candidate = $order[(($index === false ? 0 : $index) + $step) % $count];
            if ($candidate !== $me && in_array($candidate, $online, true)) { $next = $candidate; break; }
        }
        if ($next === null) $next = $order[(($index === false ? 0 : $index) + 1) % $count];
        $state['holderId'] = $next;
        $state['fuseMs'] = max(self::BOMB_MIN_MS, self::BOMB_START_MS - ((int) $state['passes'] * self::BOMB_STEP_MS));
        $state['endsAt'] = self::ms() + (int) $state['fuseMs'];
        $state['lastPass'] = ['from' => $me, 'to' => $next, 'word' => $hit, 'at' => self::ms()];
    }

    private static function boom(array &$state, $members): void
    {
        $holder = (string) $state['holderId'];
        $points = [];
        foreach (array_map('strval', $state['order']) as $id) {
            if ($id !== $holder) { self::award((int) $id, 1); $points[$id] = 1; }
        }
        $state['phase'] = 'boom';
        $state['status'] = 'complete';
        $state['endsAt'] = 0;
        $state['outcome'] = [
            'holderId' => $holder,
            'passes' => (int) $state['passes'],
            'words' => array_values($state['used']),
            'points' => (object) $points,
        ];
    }

    /* ------------------------------------------------------------------ truths */

    private static function actTruths(object $party, array &$state, object $player, array $data, $members, array $online): void
    {
        $me = (string) $player->id;
        if ($state['phase'] === 'write') {
            $lines = array_values(array_filter(array_map(fn ($line) => trim(preg_replace('/\s+/u', ' ', (string) $line) ?? (string) $line), (array) ($data['lines'] ?? [])), fn ($line) => $line !== ''));
            if (count($lines) < 3) throw new HttpException(422, 'All three statements are needed.');
            $lines = array_map(fn ($line) => mb_substr($line, 0, 120), array_slice($lines, 0, 3));
            $lie = (int) ($data['choice'] ?? -1);
            if ($lie < 0 || $lie > 2) throw new HttpException(422, 'Pick which one is the lie.');
            $statements = (array) $state['statements'];
            if (isset($statements[$me])) throw new HttpException(409, 'You already sent your three.');
            $statements[$me] = $lines;
            $lies = (array) $state['lies'];
            $lies[$me] = $lie;
            $state['statements'] = (object) $statements;
            $state['lies'] = (object) $lies;
            $eligible = array_values(array_filter(array_map('strval', $state['order']), fn ($id) => in_array($id, $online, true)));
            if (count($eligible) < 2) $eligible = array_map('strval', $state['order']);
            if (count($statements) >= count($eligible)) self::beginTruthsVote($state, $members);
            return;
        }
        if ($state['phase'] === 'vote') {
            $subject = (string) ($state['subject'] ?? '');
            if ($subject === '') throw new HttpException(409, 'Nobody is up for a vote.');
            if ($me === $subject) throw new HttpException(403, 'Wait for the others to vote on yours.');
            if (!in_array($me, array_map('strval', $state['order']), true)) throw new HttpException(403, 'You are not in this round.');
            $votes = (array) $state['votes'];
            $mine = (array) ($votes[$subject] ?? []);
            if (isset($mine[$me])) throw new HttpException(409, 'You already voted on this one.');
            $choice = (int) ($data['choice'] ?? -1);
            if ($choice < 0 || $choice > 2) throw new HttpException(422, 'Pick one of the three.');
            $mine[$me] = $choice;
            $votes[$subject] = $mine;
            $state['votes'] = (object) $votes;
            $voters = array_values(array_filter(array_map('strval', $state['order']), fn ($id) => $id !== $subject && in_array($id, $online, true)));
            if (count($voters) < 1) $voters = array_values(array_filter(array_map('strval', $state['order']), fn ($id) => $id !== $subject));
            if (count($mine) >= count($voters)) self::revealSubject($state, $members);
            return;
        }
        throw new HttpException(409, 'Nothing to do right now.');
    }

    private static function beginTruthsVote(array &$state, $members): void
    {
        $subjects = [];
        foreach (array_map('strval', $state['order']) as $id) {
            if (isset(((array) $state['statements'])[$id])) $subjects[] = $id;
        }
        if (count($subjects) < 2) {
            self::finishTruths($state);
            return;
        }
        $state['subjects'] = $subjects;
        $state['subjectIndex'] = 0;
        $state['subject'] = $subjects[0];
        $state['phase'] = 'vote';
        $state['endsAt'] = self::ms() + self::TRUTHS_VOTE_MS;
    }

    private static function revealSubject(array &$state, $members): void
    {
        $subject = (string) ($state['subject'] ?? '');
        $lies = (array) $state['lies'];
        $lie = (int) ($lies[$subject] ?? 0);
        $votes = (array) $state['votes'];
        $mine = (array) ($votes[$subject] ?? []);
        $correct = [];
        $fooled = [];
        foreach ($mine as $voter => $choice) {
            if ((int) $choice === $lie) $correct[] = (string) $voter; else $fooled[] = (string) $voter;
        }
        $points = [];
        foreach ($correct as $voter) { self::award((int) $voter, 1); $points[$voter] = 1; }
        if (count($fooled) > 0) { self::award((int) $subject, count($fooled)); $points[$subject] = count($fooled); }
        $results = (array) $state['results'];
        $results[$subject] = ['lie' => $lie, 'correct' => $correct, 'fooled' => $fooled, 'votes' => (object) $mine, 'points' => (object) $points];
        $state['results'] = (object) $results;
        $state['phase'] = 'reveal';
        $state['endsAt'] = self::ms() + self::TRUTHS_REVEAL_MS;
    }

    private static function nextSubject(array &$state, $members): void
    {
        $subjects = array_values((array) ($state['subjects'] ?? []));
        $index = (int) ($state['subjectIndex'] ?? 0) + 1;
        if ($index >= count($subjects)) { self::finishTruths($state); return; }
        $state['subjectIndex'] = $index;
        $state['subject'] = $subjects[$index];
        $state['phase'] = 'vote';
        $state['endsAt'] = self::ms() + self::TRUTHS_VOTE_MS;
    }

    private static function finishTruths(array &$state): void
    {
        $state['phase'] = 'done';
        $state['status'] = 'complete';
        $state['endsAt'] = 0;
        $state['outcome'] = ['results' => $state['results'] ?? (object) [], 'subjects' => $state['subjects'] ?? []];
    }

    /* ------------------------------------------------------------------ view */

    public static function view(object $party, object $round, object $me, $members): array
    {
        $state = self::read($party, (string) $round->game);
        if (!$state) return [];
        $base = ['phase' => $state['phase'] ?? 'done', 'endsAt' => (int) ($state['endsAt'] ?? 0), 'serverNow' => self::ms(), 'order' => array_map('strval', $state['order'] ?? [])];
        $outcome = $round->outcome ? (json_decode((string) $round->outcome, true) ?: []) : [];
        return match ($round->game) {
            'imposter' => $base + self::viewImposter($state, $me, $outcome),
            'wordbomb' => $base + self::viewBomb($state, $me, $outcome),
            'truths' => $base + self::viewTruths($state, $me, $outcome),
            default => $base,
        };
    }

    private static function viewImposter(array $state, object $me, array $outcome = []): array
    {
        $id = (string) $me->id;
        $reveal = in_array($state['phase'], ['reveal'], true);
        $imposter = (string) $state['imposterId'];
        return [
            'youAreImposter' => $id === $imposter,
            'yourWord' => $id === $imposter ? (string) $state['imposterWord'] : (string) $state['civilian'],
            'clueIndex' => (int) ($state['clueIndex'] ?? 0),
            'clues' => (object) ($state['clues'] ?? []),
            'votedCount' => count((array) ($state['votes'] ?? [])),
            'voterCount' => count((array) ($state['order'] ?? [])),
            'myVote' => (string) (((array) ($state['votes'] ?? []))[$id] ?? ''),
            'hasVoted' => isset(((array) ($state['votes'] ?? []))[$id]),
            'caught' => $state['caught'] ?? null,
            'caughtId' => (($state['phase'] ?? '') === 'guess') ? $imposter : '',
            'guessed' => (bool) ($state['guessed'] ?? false),
            'reveal' => $reveal ? [
                'civilian' => (string) ($outcome['civilian'] ?? $state['civilian']),
                'imposterWord' => (string) ($outcome['imposterWord'] ?? $state['imposterWord']),
                'imposterId' => (string) ($outcome['imposterId'] ?? $imposter),
                'caught' => (bool) ($outcome['caught'] ?? $state['caught'] ?? false),
                'guessed' => (bool) ($outcome['guessed'] ?? $state['guessed'] ?? false),
                'tally' => (object) (($outcome['tally'] ?? $state['tally'] ?? []) ?: []),
                'points' => (object) (($outcome['points'] ?? []) ?: []),
            ] : null,
        ];
    }

    private static function viewBomb(array $state, object $me, array $outcome = []): array
    {
        $id = (string) $me->id;
        return [
            'category' => (string) ($state['category'] ?? ''),
            'holderId' => (string) ($state['holderId'] ?? ''),
            'youHold' => (string) ($state['holderId'] ?? '') === $id,
            'used' => array_values($state['used'] ?? []),
            'passes' => (int) ($state['passes'] ?? 0),
            'fuseMs' => (int) ($state['fuseMs'] ?? 0),
            'lastPass' => $state['lastPass'] ?? null,
            'boom' => in_array($state['phase'], ['boom'], true) ? [
                'holderId' => (string) ($outcome['holderId'] ?? $state['holderId'] ?? ''),
                'passes' => (int) ($outcome['passes'] ?? $state['passes'] ?? 0),
                'words' => array_values($outcome['words'] ?? $state['used'] ?? []),
                'points' => (object) (($outcome['points'] ?? []) ?: []),
            ] : null,
        ];
    }

    private static function viewTruths(array $state, object $me, array $outcome = []): array
    {
        $id = (string) $me->id;
        $statements = (array) ($state['statements'] ?? []);
        $lies = (array) ($state['lies'] ?? []);
        $results = (array) ($state['results'] ?? []);
        $phase = $state['phase'] ?? 'done';
        $subject = (string) ($state['subject'] ?? '');
        $votes = (array) ($state['votes'] ?? []);
        $mine = (array) ($votes[$subject] ?? []);
        $publicStatements = [];
        if ($subject !== '' && isset($statements[$subject])) $publicStatements = array_values($statements[$subject]);
        $revealed = $results[$subject] ?? null;
        $submitted = [];
        foreach ($statements as $pid => $lines) $submitted[] = (string) $pid;
        return [
            'topic' => (string) ($state['topic'] ?? ''),
            'myStatements' => array_values($statements[$id] ?? []),
            'myLie' => isset($lies[$id]) ? (int) $lies[$id] : null,
            'hasSubmitted' => isset($statements[$id]),
            'submittedIds' => $submitted,
            'submittedCount' => count($submitted),
            'playerCount' => count((array) ($state['order'] ?? [])),
            'subject' => $subject,
            'subjectIndex' => (int) ($state['subjectIndex'] ?? 0),
            'subjectCount' => count((array) ($state['subjects'] ?? [])),
            'statements' => $publicStatements,
            'votedCount' => count($mine),
            'voterCount' => max(0, count((array) ($state['order'] ?? [])) - 1),
            'hasVoted' => isset($mine[$id]),
            'myChoice' => isset($mine[$id]) ? (int) $mine[$id] : null,
            'reveal' => $revealed ? [
                'subject' => $subject,
                'lie' => (int) $revealed['lie'],
                'correct' => array_values($revealed['correct'] ?? []),
                'fooled' => array_values($revealed['fooled'] ?? []),
                'points' => (object) (($revealed['points'] ?? []) ?: []),
            ] : null,
            'allResults' => $phase === 'done' ? (object) $results : (object) [],
        ];
    }

    private static function localeOf(array $state): string
    {
        return (string) ($state['locale'] ?? 'en');
    }
}
