<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Support\Wordle;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class LobbyController extends Controller
{
    private const GAMES = ['categories', 'whoami', 'trivia', 'charades', 'wyr', 'likely', 'yesno', 'dice', 'coin', 'wheel', 'number', 'wordle', 'bracket', 'draw', 'imposter', 'wordbomb', 'truths'];

    private const PROMPTS = [
        'categories' => ['Things you find at the beach', 'Fruits and vegetables', 'Movie characters', 'Countries and cities', 'Things that are red', 'Sports and hobbies'],
        'whoami' => ['A sleepy koala', 'The moon landing', 'A famous chef', 'A roller coaster', 'A detective', 'The last slice of pizza'],
        'trivia' => ['Which planet has the most moons?', 'What is the largest desert on Earth?', 'How many hearts does an octopus have?', 'What is the smallest prime number?', 'Which country invented paper?'],
        'charades' => ['Brushing your teeth', 'A cat seeing a cucumber', 'Winning an Olympic medal', 'A very slow elevator', 'Making the perfect sandwich'],
        'wyr' => ['Explore space or the deep ocean?', 'Always sing instead of speaking or dance everywhere?', 'Live without music or without movies?', 'Have a rewind button or a pause button for life?'],
        'likely' => ['Who is most likely to become a famous chef?', 'Who would survive longest on a desert island?', 'Who is most likely to laugh at the wrong moment?', 'Who would plan the best surprise party?'],
        'yesno' => ['Ask chance to decide!'], 'dice' => ['Ready to roll?'], 'coin' => ['Flip the coin'],
        'bracket' => ['Who takes the crown?'], 'draw' => ['Draw it, guess it!'], 'wheel' => ['Who will chance pick?'], 'number' => ['Pick a number from 1 to 100'],
        'wordle' => ['Guess the five-letter word'],
    ];

    private const ANSWERS = [
        'trivia' => ['Saturn', 'Antarctica', 'Three', 'Two', 'China'],
        'whoami' => ['A sleepy koala', 'The moon landing', 'A famous chef', 'A roller coaster', 'A detective', 'The last slice of pizza'],
        'charades' => ['Brushing your teeth', 'A cat seeing a cucumber', 'Winning an Olympic medal', 'A very slow elevator', 'Making the perfect sandwich'],
    ];

    private const PROMPTS_AR = [
        'categories' => ['أشياء تجدها على الشاطئ', 'فواكه وخضروات', 'شخصيات أفلام', 'بلدان ومدن', 'أشياء لونها أحمر', 'رياضات وهوايات'],
        'whoami' => ['كوالا نائمة', 'الهبوط على القمر', 'طاهٍ مشهور', 'أفعوانية', 'محقق', 'آخر قطعة بيتزا'],
        'trivia' => ['ما الكوكب الذي يملك أكبر عدد من الأقمار؟', 'ما أكبر صحراء على الأرض؟', 'كم قلباً للأخطبوط؟', 'ما أصغر عدد أولي؟', 'أي بلد اخترع الورق؟'],
        'charades' => ['تنظيف أسنانك', 'قطة رأت خياراً', 'الفوز بميدالية أولمبية', 'مصعد بطيء جداً', 'تحضير الشطيرة المثالية'],
        'wyr' => ['استكشاف الفضاء أم أعماق المحيط؟', 'الغناء دائماً أم الرقص في كل مكان؟', 'العيش بلا موسيقى أم بلا أفلام؟', 'زر لإعادة الوقت أم لإيقافه؟'],
        'likely' => ['من الأكثر احتمالاً أن يصبح طاهياً مشهوراً؟', 'من سيصمد أكثر في جزيرة مهجورة؟', 'من سيضحك في وقت غير مناسب؟', 'من سينظم أفضل حفلة مفاجأة؟'],
        'yesno' => ['اسأل الحظ ليقرر!'], 'dice' => ['ارمِ النرد'], 'coin' => ['اقلب العملة'],
        'bracket' => ['من سيحمل التاج؟'], 'draw' => ['ارسم وخمّن!'], 'wheel' => ['من سيختاره الحظ؟'], 'number' => ['اختر رقماً من 1 إلى 100'],
        'wordle' => ['خمّن الكلمة'],
    ];

    private const ANSWERS_AR = [
        'trivia' => ['زحل', 'القارة القطبية الجنوبية', 'ثلاثة', 'اثنان', 'الصين'],
        'whoami' => ['كوالا نائمة', 'الهبوط على القمر', 'طاهٍ مشهور', 'أفعوانية', 'محقق', 'آخر قطعة بيتزا'],
        'charades' => ['تنظيف أسنانك', 'قطة رأت خياراً', 'الفوز بميدالية أولمبية', 'مصعد بطيء جداً', 'تحضير الشطيرة المثالية'],
    ];


    private const PROMPTS_DE = [
        'categories' => ['Dinge, die man am Strand findet', 'Obst und Gemüse', 'Filmfiguren', 'Länder und Städte', 'Dinge, die rot sind', 'Sport und Hobbys'],
        'whoami' => ['Ein schlafender Koala', 'Die Mondlandung', 'Eine berühmte Köchin', 'Eine Achterbahn', 'Ein Detektiv', 'Das letzte Stück Pizza'],
        'trivia' => ['Welcher Planet hat die meisten Monde?', 'Was ist die größte Wüste der Erde?', 'Wie viele Herzen hat ein Oktopus?', 'Was ist die kleinste Primzahl?', 'Welches Land hat das Papier erfunden?'],
        'charades' => ['Zähne putzen', 'Eine Katze sieht eine Gurke', 'Eine olympische Medaille gewinnen', 'Ein sehr langsamer Aufzug', 'Das perfekte Sandwich machen'],
        'wyr' => ['Weltraum oder Tiefsee erkunden?', 'Immer singen statt sprechen oder überall tanzen?', 'Ohne Musik oder ohne Filme leben?', 'Eine Rückspultaste oder eine Pausentaste fürs Leben?'],
        'likely' => ['Wer wird am ehesten ein berühmter Koch?', 'Wer überlebt am längsten auf einer einsamen Insel?', 'Wer lacht am ehesten im falschen Moment?', 'Wer plant die beste Überraschungsparty?'],
        'yesno' => ['Lass den Zufall entscheiden!'], 'dice' => ['Bereit zu würfeln?'], 'coin' => ['Münze werfen'],
        'bracket' => ['Wer holt sich die Krone?'], 'draw' => ['Zeichnen und raten!'], 'wheel' => ['Wen wählt der Zufall?'], 'number' => ['Wähle eine Zahl von 1 bis 100'],
        'wordle' => ['Errate das fünfstellige Wort'],
    ];

    private const ANSWERS_DE = [
        'trivia' => ['Saturn', 'Antarktis', 'Drei', 'Zwei', 'China'],
        'whoami' => ['Ein schlafender Koala', 'Die Mondlandung', 'Eine berühmte Köchin', 'Eine Achterbahn', 'Ein Detektiv', 'Das letzte Stück Pizza'],
        'charades' => ['Zähne putzen', 'Eine Katze sieht eine Gurke', 'Eine olympische Medaille gewinnen', 'Ein sehr langsamer Aufzug', 'Das perfekte Sandwich machen'],
    ];

    public function index(Request $request): JsonResponse
    {
        $identity = $this->identity($request);
        $query = DB::table('party_players');
        if ($identity['kind'] === 'user') $query->where('user_id', $identity['id']);
        else $query->where('guest_id', $identity['id']);
        $ids = $query->pluck('party_id');
        $parties = DB::table('parties')->whereIn('id', $ids)->whereIn('status', ['lobby', 'playing'])->orderByDesc('updated_at')->limit(50)->get();
        $key = ($identity['kind'] === 'user' ? 'u' : 'g').$identity['id'];
        $pids = $parties->pluck('id');
        $stats = DB::table('matches')->whereIn('party_id', $pids)->groupBy('party_id')->selectRaw('party_id, max(finished_at) as last_played, count(*) as games')->get()->keyBy('party_id');
        $wins = DB::table('match_results')->whereIn('party_id', $pids)->where('player_key', $key)->where('is_winner', true)->groupBy('party_id')->selectRaw('party_id, count(*) as wins')->get()->keyBy('party_id');
        return response()->json(['data' => $parties->map(fn ($party) => $this->partyView($party, $identity) + [
            'last_played' => $stats[$party->id]->last_played ?? null,
            'games_played' => (int) ($stats[$party->id]->games ?? 0),
            'my_wins' => (int) ($wins[$party->id]->wins ?? 0),
        ])->values()]);
    }

    public function create(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'min:1', 'max:80']]);
        $identity = $this->identity($request);
        $preset = $this->presetFrom($request);
        $party = DB::transaction(function () use ($data, $identity, $preset) {
            $code = $this->uniqueCode();
            $partyId = DB::table('parties')->insertGetId([
                'owner_id' => $identity['kind'] === 'user' ? $identity['id'] : null,
                'name' => trim($data['name']),
                'invite_code' => $code,
                'status' => 'lobby',
                'round_number' => 0,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $playerId = $this->insertPlayer($partyId, $identity, true, $preset);
            DB::table('parties')->where('id', $partyId)->update(['host_player_id' => $playerId]);
            return DB::table('parties')->find($partyId);
        });
        return response()->json(['data' => $this->partyView($party, $identity)], 201);
    }

    public function show(Request $request, string $code): JsonResponse
    {
        $identity = $this->identity($request);
        $party = $this->party($code);
        $player = $this->player($party->id, $identity);
        if (!$player) return response()->json(['message' => 'Party not found.'], 404);
        if (!$player->last_seen_at || \App\Support\History::age($player->last_seen_at) >= 8) {
            DB::table('party_players')->where('id', $player->id)->update(['last_seen_at' => now(), 'updated_at' => now()]);
        }
        if ($party->status === 'playing') {
            \App\Support\PartyGames::tick($party, DB::table('party_players')->where('party_id', $party->id)->get());
            $party = DB::table('parties')->find($party->id) ?? $party;
        }
        $this->maintain((int) $party->id);
        $party = DB::table('parties')->find($party->id) ?? $party;
        return response()->json(['data' => $this->partyView($party, $identity)]);
    }

    public function heartbeat(Request $request, string $code): JsonResponse
    {
        $data = $request->validate(['rtt_ms' => ['required', 'integer', 'min:0', 'max:60000']]);
        $identity = $this->identity($request);
        $party = $this->party($code);
        $player = $this->player($party->id, $identity);
        if (!$player) return response()->json(['message' => 'Party not found.'], 404);
        DB::table('party_players')->where('id', $player->id)->update(['last_rtt_ms' => $data['rtt_ms'], 'last_seen_at' => now(), 'updated_at' => now()]);
        return response()->json(['ok' => true]);
    }

    public function join(Request $request, string $code): JsonResponse
    {
        $identity = $this->identity($request);
        $preset = $this->presetFrom($request);
        $party = DB::table('parties')->where('invite_code', strtoupper($code))->first();
        if (!$party) return response()->json(['message' => 'Lobby not found or already started.'], 404);
        if ($party->status !== 'lobby') {
            // A game is running. Someone already in it just returns; anyone else asks the host.
            if ($this->player((int) $party->id, $identity)) return response()->json(['data' => $this->partyView($party, $identity), 'message' => 'Back in.']);
            $pending = \App\Support\PartyFlow::request($party, $identity, null, $this->presetFrom($request));
            return response()->json(['requested' => true, 'request' => $pending], 202);
        }
        $joined = DB::transaction(function () use ($party, $identity, $preset) {
            $locked = DB::table('parties')->where('id', $party->id)->lockForUpdate()->first();
            if (!$locked || $locked->status !== 'lobby') throw new HttpException(409, 'This lobby has already started.');
            $existing = $this->player($locked->id, $identity);
            if ($existing) {
                DB::table('party_players')->where('id', $existing->id)->update(['last_seen_at' => now(), 'updated_at' => now()]);
                return DB::table('parties')->find($locked->id);
            }
            if (DB::table('party_players')->where('party_id', $locked->id)->count() >= 20) throw new HttpException(409, 'This lobby is full.');
            $this->insertPlayer($locked->id, $identity, false, $preset);
            DB::table('parties')->where('id', $locked->id)->update(['updated_at' => now()]);
            return DB::table('parties')->find($locked->id);
        });
        return response()->json(['data' => $this->partyView($joined, $identity), 'message' => 'Joined lobby.']);
    }

    public function ready(Request $request, string $code): JsonResponse
    {
        $data = $request->validate(['ready' => ['required', 'boolean']]);
        $identity = $this->identity($request);
        $party = $this->party($code);
        $player = $this->requireMember($party, $identity);
        if ($party->status !== 'lobby') throw new HttpException(409, 'Readiness is locked after the game starts.');
        DB::table('party_players')->where('id', $player->id)->update(['is_ready' => $data['ready'], 'last_seen_at' => now(), 'updated_at' => now()]);
        DB::table('parties')->where('id', $party->id)->update(['updated_at' => now()]);
        return response()->json(['data' => $this->partyView(DB::table('parties')->find($party->id), $identity)]);
    }

    public function start(Request $request, string $code): JsonResponse
    {
        $data = $request->validate([
            'game' => ['required', 'string', 'in:'.implode(',', self::GAMES)],
            'locale' => ['sometimes', 'in:en,ar,de'],
            'entries' => ['nullable', 'array', 'max:24'],
            'entries.*' => ['string', 'max:40'],
            'eliminate' => ['nullable', 'boolean'],
            'teams' => ['nullable', 'array', 'max:32'],
            'teams.*.name' => ['required', 'string', 'max:40'],
            'teams.*.members' => ['nullable', 'array', 'max:12'],
            'teams.*.members.*' => ['string', 'max:40'],
        ]);
        $identity = $this->identity($request);
        $party = $this->party($code);
        $this->requireHost($party, $identity);
        if (DB::table('tournaments')->where('party_id', $party->id)->where('status', 'active')->exists()) throw new HttpException(409, 'A tournament is running. Continue it or cancel it first.');
        return $this->launch($party, $data, $identity, false);
    }

    private function launch(object $party, array $data, array $identity, bool $skipReady): JsonResponse
    {
        $result = DB::transaction(function () use ($party, $data, $identity, $skipReady) {
            $locked = DB::table('parties')->where('id', $party->id)->lockForUpdate()->first();
            if ($locked->status !== 'lobby') throw new HttpException(409, 'The game has already started.');
            $players = DB::table('party_players')->where('party_id', $locked->id)->orderBy('id')->get();
            $isOnline = fn ($p) => $p->last_seen_at && \App\Support\History::age($p->last_seen_at) < 25;
            $present = $players->filter(fn ($p) => $isOnline($p) || (int) $p->id === (int) $locked->host_player_id)->values();
            if ($present->count() < 2) throw new HttpException(409, 'At least two players are needed.');
            if (!$skipReady && $present->contains(fn ($player) => !$player->is_ready)) throw new HttpException(409, 'Everyone must be ready first.');
            $players = $present;
            $number = (int) $locked->round_number + 1;
            $game = $data['game'];
            $locale = $data['locale'] ?? 'en';
            $promptBank = $locale === 'ar' ? self::PROMPTS_AR : self::PROMPTS;
            $answerBank = $locale === 'ar' ? self::ANSWERS_AR : self::ANSWERS;
            if ($locale === 'de') { $promptBank = self::PROMPTS_DE; $answerBank = self::ANSWERS_DE; }
            [$prompt, $answer] = $this->pickPrompt((int) $locked->id, $game, $locale, $promptBank, $answerBank);
            if ($game === 'wordle') $answer = Wordle::pick();
            $turn = $players->first(fn ($player) => (int) $player->id === (int) $locked->host_player_id) ?? $players->first();
            $gameState = null;
            if (\App\Support\PartyGames::isNew($game)) {
                $built = \App\Support\PartyGames::start($locked, $players, $game, $locale);
                $prompt = $built['prompt'];
                $answer = $built['answer'];
                $turn = $players->first(fn ($person) => (int) $person->id === (int) $built['turn']) ?? $turn;
                $gameState = [$game => $built['state']];
            }
            $wheelState = null;
            if ($game === 'wheel') {
                $entries = array_values(array_filter(array_map(fn ($entry) => trim((string) $entry), $data['entries'] ?? []), fn ($entry) => $entry !== ''));
                if (count($entries) < 2) $entries = $players->pluck('display_name')->all();
                $wheelState = ['entries' => $entries, 'remaining' => $entries, 'eliminate' => (bool) ($data['eliminate'] ?? false)];
            }
            $bracketState = $game === 'bracket' ? $this->buildBracket($data['teams'] ?? [], $players) : null;
            DB::table('party_rounds')->insert([
                'party_id' => $locked->id, 'round_number' => $number, 'game' => $game, 'locale' => $locale,
                'prompt' => $prompt, 'answer' => $answer, 'status' => 'active',
                'turn_player_id' => $turn->id, 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('parties')->where('id', $locked->id)->update(['status' => 'playing', 'auto_next_at' => null, 'current_game' => $game, 'round_number' => $number, 'state' => $gameState ? json_encode($gameState, JSON_THROW_ON_ERROR) : ($wheelState ? json_encode(['wheel' => $wheelState], JSON_THROW_ON_ERROR) : ($bracketState ? json_encode(['bracket' => $bracketState], JSON_THROW_ON_ERROR) : null)), 'updated_at' => now()]);
            return DB::table('parties')->find($locked->id);
        });
        return response()->json(['data' => $this->partyView($result, $identity)]);
    }

    public function action(Request $request, string $code): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', 'string', 'in:answer,vote,roll,point,guess,pick,clue,word,submit'],
            'target_player_id' => ['nullable', 'integer', 'min:1'],
            'value' => ['nullable', 'string', 'max:160'],
            'count' => ['nullable', 'integer', 'in:1,2'],
            'max' => ['nullable', 'integer', 'min:2', 'max:10000'],
            'choice' => ['nullable', 'integer', 'min:0', 'max:2'],
            'lines' => ['nullable', 'array', 'max:3'],
            'lines.*' => ['string', 'max:160'],
        ]);
        $identity = $this->identity($request);
        $party = $this->party($code);
        $player = $this->requireMember($party, $identity);
        $responseParty = DB::transaction(function () use ($party, $player, $data, $identity) {
            $round = DB::table('party_rounds')->where('party_id', $party->id)->orderByDesc('round_number')->lockForUpdate()->first();
            if (!$round || $round->status !== 'active') throw new HttpException(409, 'This round is already resolved.');
            $members = DB::table('party_players')->where('party_id', $party->id)->orderBy('id')->get();
            if (\App\Support\PartyGames::isNew($round->game)) {
                $fresh = DB::table('parties')->where('id', $party->id)->lockForUpdate()->first();
                \App\Support\PartyGames::act($fresh, $round, $player, $data, $members);
                DB::table('party_players')->where('id', $player->id)->update(['last_seen_at' => now(), 'updated_at' => now()]);
                return DB::table('parties')->find($party->id);
            }
            if ($data['type'] === 'point') {
                if (!in_array($round->game, ['categories', 'whoami', 'charades'], true)) throw new HttpException(422, 'Host-awarded points are not available for this game.');
                if ((int) $party->host_player_id !== (int) $player->id) throw new HttpException(403, 'Only the host can award points.');
                $target = $members->first(fn ($person) => (int) $person->id === (int) ($data['target_player_id'] ?? 0));
                if (!$target) throw new HttpException(422, 'Choose a player in this lobby.');
                if (DB::table('party_round_scores')->where('round_id', $round->id)->where('player_id', $target->id)->exists()) throw new HttpException(409, 'A point was already awarded to that player this round.');
                DB::table('party_round_scores')->insert(['round_id' => $round->id, 'player_id' => $target->id, 'awarded_by' => $player->id, 'created_at' => now(), 'updated_at' => now()]);
                DB::table('party_players')->where('id', $target->id)->increment('score');
            } elseif ($data['type'] === 'roll') {
                if (!in_array($round->game, ['dice', 'coin', 'yesno', 'number', 'wheel'], true)) throw new HttpException(422, 'This game does not use a random draw.');
                if ((int) $round->turn_player_id !== (int) $player->id) throw new HttpException(403, 'It is not your turn.');
                $outcome = match ($round->game) {
                    'dice' => $this->rollDice((int) ($data['count'] ?? 2)),
                    'coin' => ['result' => $round->locale === 'ar' ? (random_int(0, 1) ? 'وجه' : 'كتابة') : (random_int(0, 1) ? 'Heads' : 'Tails')],
                    'yesno' => ['result' => $round->locale === 'ar' ? ['بالتأكيد نعم!', 'ليس هذه المرة.', 'الحظ يقول نعم.', 'اسأل لاحقاً.', 'لا بكل تأكيد.', 'الأمر محتمل.'][random_int(0, 5)] : ['Absolutely yes!', 'Not this time.', 'The odds say yes.', 'Ask again later.', 'A confident no.', 'It could go either way.'][random_int(0, 5)]],
                    'number' => ['result' => (string) random_int(1, (int) ($data['max'] ?? 100))],
                    'wheel' => $this->spinWheel($party->id, $members),
                };
                DB::table('party_rounds')->where('id', $round->id)->update(['outcome' => json_encode($outcome, JSON_THROW_ON_ERROR), 'status' => 'complete', 'updated_at' => now()]);
            } elseif ($data['type'] === 'pick') {
                if ($round->game !== 'bracket') throw new HttpException(422, 'This game has no bracket.');
                if ((int) $party->host_player_id !== (int) $player->id) throw new HttpException(403, 'Only the host can pick winners.');
                $fresh = DB::table('parties')->where('id', $party->id)->lockForUpdate()->first();
                $bracket = $fresh && $fresh->state ? (json_decode($fresh->state, true)['bracket'] ?? null) : null;
                if (!$bracket) throw new HttpException(409, 'No bracket yet.');
                $parts = explode(':', (string) ($data['value'] ?? ''));
                if (count($parts) !== 3 || !in_array($parts[2], ['a', 'b'], true)) throw new HttpException(422, 'Pick a side of a match.');
                $r = (int) $parts[0]; $m = (int) $parts[1];
                $match = $bracket['rounds'][$r][$m] ?? null;
                if (!$match || $match['a'] === null || $match['b'] === null) throw new HttpException(422, 'That match is not ready.');
                $bracket['rounds'][$r][$m]['w'] = $parts[2] === 'a' ? $match['a'] : $match['b'];
                $bracket = $this->normalizeBracket($bracket);
                DB::table('parties')->where('id', $party->id)->update(['state' => json_encode(['bracket' => $bracket], JSON_THROW_ON_ERROR), 'updated_at' => now()]);
            } elseif ($data['type'] === 'guess') {
                if ($round->game !== 'wordle') throw new HttpException(422, 'This game does not take word guesses.');
                $guess = mb_strtolower(trim($data['value'] ?? ''));
                if (!preg_match('/^[a-z]{5}$/', $guess)) throw ValidationException::withMessages(['value' => 'Enter a five-letter word.']);
                if (!Wordle::isValid($guess)) throw ValidationException::withMessages(['value' => 'That word is not in the dictionary.']);
                $row = DB::table('party_submissions')->where('round_id', $round->id)->where('player_id', $player->id)->first();
                $payload = $row ? (json_decode($row->payload, true) ?: []) : [];
                $attempts = $payload['guesses'] ?? [];
                if (!empty($payload['solved'])) throw new HttpException(409, 'You already solved this word.');
                if (count($attempts) >= Wordle::MAX_GUESSES) throw new HttpException(409, 'No guesses left.');
                if (in_array($guess, array_column($attempts, 'word'), true)) throw new HttpException(409, 'You already tried that word.');
                $attempts[] = ['word' => $guess, 'pattern' => Wordle::pattern($guess, (string) $round->answer)];
                $solved = $guess === mb_strtolower((string) $round->answer);
                $payload = ['guesses' => $attempts, 'solved' => $solved];
                if ($row) DB::table('party_submissions')->where('id', $row->id)->update(['payload' => json_encode($payload, JSON_THROW_ON_ERROR), 'updated_at' => now()]);
                else DB::table('party_submissions')->insert(['round_id' => $round->id, 'player_id' => $player->id, 'payload' => json_encode($payload, JSON_THROW_ON_ERROR), 'created_at' => now(), 'updated_at' => now()]);
                if ($solved) {
                    DB::table('party_players')->where('id', $player->id)->increment('score');
                    DB::table('party_rounds')->where('id', $round->id)->update([
                        'outcome' => json_encode(['word' => mb_strtoupper((string) $round->answer), 'winner_player_id' => (string) $player->id, 'solved' => true, 'attempts' => count($attempts)], JSON_THROW_ON_ERROR),
                        'status' => 'complete', 'updated_at' => now(),
                    ]);
                } else {
                    $all = DB::table('party_submissions')->where('round_id', $round->id)->whereIn('player_id', $members->pluck('id'))->get();
                    $exhausted = $all->count() >= $members->count() && $all->every(function ($submission) {
                        $payload = json_decode($submission->payload, true) ?: [];
                        return !empty($payload['solved']) || count($payload['guesses'] ?? []) >= Wordle::MAX_GUESSES;
                    });
                    if ($exhausted) {
                        DB::table('party_rounds')->where('id', $round->id)->update([
                            'outcome' => json_encode(['word' => mb_strtoupper((string) $round->answer), 'winner_player_id' => null, 'solved' => false], JSON_THROW_ON_ERROR),
                            'status' => 'complete', 'updated_at' => now(),
                        ]);
                    }
                }
            } else {
                if (!in_array($round->game, ['trivia', 'wyr', 'likely'], true)) throw new HttpException(422, 'This game does not accept private submissions.');
                $value = trim($data['value'] ?? '');
                if ($value === '') throw ValidationException::withMessages(['value' => 'A response is required.']);
                if ($data['type'] === 'vote' && !in_array($round->game, ['wyr', 'likely'], true)) throw new HttpException(422, 'Voting is not available in this game.');
                if ($data['type'] === 'answer' && $round->game !== 'trivia') throw new HttpException(422, 'Answer submissions are only available for trivia.');
                if (DB::table('party_submissions')->where('round_id', $round->id)->where('player_id', $player->id)->exists()) throw new HttpException(409, 'You already submitted for this round.');
                DB::table('party_submissions')->insert(['round_id' => $round->id, 'player_id' => $player->id, 'payload' => json_encode(['value' => $value], JSON_THROW_ON_ERROR), 'created_at' => now(), 'updated_at' => now()]);
                $this->settleSubmissions($round, $members, (int) $party->id);
            }
            DB::table('party_players')->where('id', $player->id)->update(['last_seen_at' => now(), 'updated_at' => now()]);
            return DB::table('parties')->find($party->id);
        });
        return response()->json(['data' => $this->partyView($responseParty, $identity)]);
    }

    public function advance(Request $request, string $code): JsonResponse
    {
        $identity = $this->identity($request);
        $party = $this->party($code);
        $this->requireHost($party, $identity);
        $result = $this->advanceParty((int) $party->id);
        return response()->json(['data' => $this->partyView($result, $identity)]);
    }

    /** Start the next round of the running game. Shared by the host's Next button and the countdown. */
    public function advanceParty(int $partyId): object
    {
        $party = (object) ['id' => $partyId];
        $result = DB::transaction(function () use ($party) {
            $locked = DB::table('parties')->where('id', $party->id)->lockForUpdate()->first();
            if ($locked->status !== 'playing' || !$locked->current_game) throw new HttpException(409, 'There is no active game.');
            $number = (int) $locked->round_number + 1;
            $game = $locked->current_game;
            $previousRound = DB::table('party_rounds')->where('party_id', $locked->id)->orderByDesc('round_number')->first();
            $locale = $previousRound?->locale ?? 'en';
            $promptBank = $locale === 'ar' ? self::PROMPTS_AR : self::PROMPTS;
            $answerBank = $locale === 'ar' ? self::ANSWERS_AR : self::ANSWERS;
            if ($locale === 'de') { $promptBank = self::PROMPTS_DE; $answerBank = self::ANSWERS_DE; }
            [$nextPrompt, $nextAnswer] = $this->pickPrompt((int) $locked->id, $game, $locale, $promptBank, $answerBank);
            $players = DB::table('party_players')->where('party_id', $locked->id)->orderBy('id')->get();
            $nextState = null;
            $previousTurnIndex = $players->search(fn ($person) => (int) $person->id === (int) ($previousRound?->turn_player_id ?? 0));
            $turn = $players->get($previousTurnIndex === false ? 0 : (($previousTurnIndex + 1) % $players->count()));
            if (!$previousRound?->turn_player_id) $turn = $players->first(fn ($person) => (int) $person->id === (int) $locked->host_player_id) ?? $players->first();
            // Turns skip anyone who has dropped out, so a dead phone never holds the dice.
            $isHere = fn ($person) => $person->last_seen_at && \App\Support\History::age($person->last_seen_at) < 25;
            if ($turn && !$isHere($turn)) {
                $from = $players->search(fn ($person) => (int) $person->id === (int) $turn->id);
                for ($step = 1; $step <= $players->count(); $step++) {
                    $candidate = $players->get((($from === false ? 0 : $from) + $step) % $players->count());
                    if ($isHere($candidate)) { $turn = $candidate; break; }
                }
            }
            $nextAnswer = $game === 'wordle' ? Wordle::pick() : $nextAnswer;
            if (\App\Support\PartyGames::isNew($game)) {
                $built = \App\Support\PartyGames::start($locked, $players, $game, $locale);
                $nextPrompt = $built['prompt'];
                $nextAnswer = $built['answer'];
                $turn = $players->first(fn ($person) => (int) $person->id === (int) $built['turn']) ?? $turn;
                $nextState = [$game => $built['state']];
            }
            DB::table('party_rounds')->insert([
                'party_id' => $locked->id, 'round_number' => $number, 'game' => $game, 'locale' => $locale,
                'prompt' => $nextPrompt, 'answer' => $nextAnswer,
                'status' => 'active', 'turn_player_id' => $turn->id, 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('parties')->where('id', $locked->id)->update($nextState
                ? ['round_number' => $number, 'state' => json_encode($nextState, JSON_THROW_ON_ERROR), 'auto_next_at' => null, 'updated_at' => now()]
                : ['round_number' => $number, 'auto_next_at' => null, 'updated_at' => now()]);
            return DB::table('parties')->find($locked->id);
        });
        return $result;
    }

    public function tournamentCreate(Request $request, string $code): JsonResponse
    {
        $data = $request->validate(['games' => ['required', 'array', 'min:1', 'max:6'], 'games.*' => ['string', 'in:'.implode(',', \App\Support\Tournament::GAMES)], 'count' => ['required', 'integer', 'min:2', 'max:10']]);
        $identity = $this->identity($request);
        $party = $this->party($code);
        $this->requireHost($party, $identity);
        $result = DB::transaction(function () use ($party, $data) {
            $locked = DB::table('parties')->where('id', $party->id)->lockForUpdate()->first();
            if ($locked->status !== 'lobby') throw new HttpException(409, 'Finish the current game first.');
            DB::table('tournaments')->where('party_id', $locked->id)->where('status', 'active')->update(['status' => 'canceled', 'updated_at' => now()]);
            $pool = array_values(array_unique($data['games']));
            $lineup = [];
            while (count($lineup) < $data['count']) { $bag = $pool; shuffle($bag); $lineup = array_merge($lineup, $bag); }
            $lineup = array_slice($lineup, 0, $data['count']);
            shuffle($lineup);
            DB::table('tournaments')->insert(['party_id' => $locked->id, 'status' => 'active', 'total_games' => $data['count'], 'current_index' => 0, 'lineup' => json_encode($lineup), 'points' => json_encode((object) []), 'created_at' => now(), 'updated_at' => now()]);
            return DB::table('parties')->find($locked->id);
        });
        return response()->json(['data' => $this->partyView($result, $identity)], 201);
    }

    public function tournamentAction(Request $request, string $code, string $action): JsonResponse
    {
        $identity = $this->identity($request);
        $party = $this->party($code);
        $this->requireHost($party, $identity);
        $tour = DB::table('tournaments')->where('party_id', $party->id)->where('status', 'active')->orderByDesc('id')->first();
        if (!$tour) throw new HttpException(404, 'No active tournament.');
        $lineup = json_decode($tour->lineup, true) ?: [];
        $idx = (int) $tour->current_index;
        if ($action === 'cancel') {
            DB::table('tournaments')->where('id', $tour->id)->update(['status' => 'canceled', 'updated_at' => now()]);
        } elseif ($action === 'shuffle') {
            $rest = array_slice($lineup, $idx); shuffle($rest);
            DB::table('tournaments')->where('id', $tour->id)->update(['lineup' => json_encode(array_merge(array_slice($lineup, 0, $idx), $rest)), 'updated_at' => now()]);
        } elseif ($action === 'reorder') {
            $data = $request->validate(['lineup' => ['required', 'array', 'max:10'], 'lineup.*' => ['string']]);
            $rest = array_slice($lineup, $idx); $new = array_values($data['lineup']);
            sort($rest); $check = $new; sort($check);
            if ($rest !== $check) throw new HttpException(422, 'The lineup must keep the same games.');
            DB::table('tournaments')->where('id', $tour->id)->update(['lineup' => json_encode(array_merge(array_slice($lineup, 0, $idx), $new)), 'updated_at' => now()]);
        } elseif ($action === 'next') {
            $data = $request->validate(['locale' => ['sometimes', 'in:en,ar,de']]);
            if ($party->status !== 'lobby') throw new HttpException(409, 'A game is already running.');
            if ($idx >= count($lineup)) throw new HttpException(409, 'The tournament is finished.');
            return $this->launch($party, ['game' => $lineup[$idx], 'locale' => $data['locale'] ?? 'en'], $identity, true);
        } else {
            throw new HttpException(404, 'Unknown action.');
        }
        return response()->json(['data' => $this->partyView(DB::table('parties')->find($party->id), $identity)]);
    }

    public function leave(Request $request, string $code): JsonResponse
    {
        $identity = $this->identity($request);
        $party = $this->party($code);
        $me = $this->requireMember($party, $identity);
        DB::transaction(function () use ($party, $me) {
            $locked = DB::table('parties')->where('id', $party->id)->lockForUpdate()->first();
            $others = DB::table('party_players')->where('party_id', $locked->id)->where('id', '!=', $me->id)->orderBy('id')->get();
            if ($others->isEmpty()) {
                DB::table('parties')->where('id', $locked->id)->update(['host_player_id' => null]);
                DB::table('party_players')->where('party_id', $locked->id)->delete();
                DB::table('parties')->where('id', $locked->id)->delete();
                return;
            }
            if ((int) $locked->host_player_id === (int) $me->id) {
                $next = $others->first(fn ($p) => $p->last_seen_at && \App\Support\History::age($p->last_seen_at) < 60) ?? $others->first();
                DB::table('parties')->where('id', $locked->id)->update(['host_player_id' => $next->id, 'updated_at' => now()]);
                DB::table('party_players')->where('id', $next->id)->update(['is_ready' => true]);
            }
            DB::table('party_players')->where('id', $me->id)->delete();
            DB::table('parties')->where('id', $locked->id)->update(['updated_at' => now()]);
        });
        return response()->json(['ok' => true]);
    }

    public function finish(Request $request, string $code): JsonResponse
    {
        $identity = $this->identity($request);
        $party = $this->party($code);
        $this->requireHost($party, $identity);
        $result = DB::transaction(function () use ($party) {
            $locked = DB::table('parties')->where('id', $party->id)->lockForUpdate()->first();
            if ($locked->status === 'playing') {
                if ($locked->current_game !== 'draw') \App\Support\History::recordParty($locked);
                // Play again with the same people: whoever is still here stays ready, so nobody taps ready twice.
                $players = DB::table('party_players')->where('party_id', $locked->id)->get();
                foreach ($players as $person) {
                    $here = (int) $person->id === (int) $locked->host_player_id || ($person->last_seen_at && \App\Support\History::age($person->last_seen_at) < 25);
                    DB::table('party_players')->where('id', $person->id)->update(['score' => 0, 'is_ready' => $here, 'updated_at' => now()]);
                }
                DB::table('parties')->where('id', $locked->id)->update(['status' => 'lobby', 'current_game' => null, 'state' => null, 'auto_next_at' => null, 'updated_at' => now()]);
            }
            return DB::table('parties')->find($locked->id);
        });
        return response()->json(['data' => $this->partyView($result, $identity)]);
    }

    private const AUTO_NEXT = ['trivia' => 10, 'wyr' => 8, 'likely' => 8, 'wordle' => 10, 'imposter' => 16, 'wordbomb' => 10, 'truths' => 16];

    /**
     * Keeps a party moving without anyone's hand on it. Runs on every poll but only writes when needed:
     * hands the host role to someone who is here when the host has vanished, finishes a round that is
     * only waiting on dropped players, and runs the countdown into the next round.
     */
    private function maintain(int $partyId): void
    {
        $party = DB::table('parties')->find($partyId);
        if (!$party) return;
        $hostRow = $party->host_player_id ? DB::table('party_players')->find($party->host_player_id) : null;
        $hostGone = !$hostRow || \App\Support\History::age($hostRow->last_seen_at) >= 30;
        $round = $party->status === 'playing' ? DB::table('party_rounds')->where('party_id', $partyId)->orderByDesc('round_number')->first() : null;
        $needsSettle = $round && $round->status === 'active' && in_array($round->game, ['trivia', 'wyr', 'likely'], true);
        $needsAuto = $round && $round->status === 'complete' && isset(self::AUTO_NEXT[$round->game]);
        $stale = $party->auto_next_at !== null && !$needsAuto;
        if (!$hostGone && !$needsSettle && !$needsAuto && !$stale) return;
        $advance = false;
        DB::transaction(function () use ($partyId, &$advance) {
            $locked = DB::table('parties')->where('id', $partyId)->lockForUpdate()->first();
            if (!$locked) return;
            $players = DB::table('party_players')->where('party_id', $partyId)->orderBy('id')->get();
            $isHere = fn ($person) => $person->last_seen_at && \App\Support\History::age($person->last_seen_at) < 25;
            $host = $players->first(fn ($person) => (int) $person->id === (int) $locked->host_player_id);
            if (!$host || \App\Support\History::age($host->last_seen_at) >= 30) {
                $next = $players->first(fn ($person) => $isHere($person) && (int) $person->id !== (int) $locked->host_player_id);
                if ($next) {
                    DB::table('parties')->where('id', $partyId)->update(['host_player_id' => $next->id, 'updated_at' => now()]);
                    DB::table('party_players')->where('id', $next->id)->update(['is_ready' => true]);
                }
            }
            if ($locked->status !== 'playing') return;
            $round = DB::table('party_rounds')->where('party_id', $partyId)->orderByDesc('round_number')->lockForUpdate()->first();
            if (!$round) return;
            if ($round->status === 'active') {
                if (in_array($round->game, ['trivia', 'wyr', 'likely'], true)) $this->settleSubmissions($round, $players, $partyId);
                return;
            }
            if (!isset(self::AUTO_NEXT[$round->game])) {
                if ($locked->auto_next_at !== null) DB::table('parties')->where('id', $partyId)->update(['auto_next_at' => null]);
                return;
            }
            $now = \App\Support\PartyGames::ms();
            if ($locked->auto_next_at === null) {
                DB::table('parties')->where('id', $partyId)->update(['auto_next_at' => $now + self::AUTO_NEXT[$round->game] * 1000]);
            } elseif ($now >= (int) $locked->auto_next_at) {
                $advance = true;
            }
        });
        if ($advance) {
            try { $this->advanceParty($partyId); } catch (HttpException $e) { /* the host got there first */ }
        }
    }

    private function identity(Request $request): array
    {
        return $request->attributes->get('cc.identity') ?? throw new HttpException(401, 'Unauthenticated.');
    }

    private function party(string $code): object
    {
        return DB::table('parties')->where('invite_code', strtoupper($code))->first() ?? throw new HttpException(404, 'Party not found.');
    }

    private function player(int $partyId, array $identity): ?object
    {
        return DB::table('party_players')->where('party_id', $partyId)
            ->where($identity['kind'] === 'user' ? 'user_id' : 'guest_id', $identity['id'])->first();
    }

    private function requireMember(object $party, array $identity): object
    {
        return $this->player($party->id, $identity) ?? throw new HttpException(404, 'Party not found.');
    }

    private function requireHost(object $party, array $identity): void
    {
        $player = $this->requireMember($party, $identity);
        if ((int) $party->host_player_id !== (int) $player->id) throw new HttpException(403, 'Only the host can control this lobby.');
    }

    private function insertPlayer(int $partyId, array $identity, bool $ready, ?string $preset = null): int
    {
        // Snapshot the face at join time so the roster renders without extra lookups.
        $avatar = $this->identityAvatar($identity);
        if ($preset) {
            $avatar['preset'] = $preset;
            // A guest's choice follows them to the next lobby, not just this one.
            if ($identity['kind'] === 'guest') {
                DB::table('guest_identities')->where('id', $identity['id'])->update(['avatar_preset' => $preset]);
            }
        }
        return (int) DB::table('party_players')->insertGetId([
            'party_id' => $partyId,
            'user_id' => $identity['kind'] === 'user' ? $identity['id'] : null,
            'guest_id' => $identity['kind'] === 'guest' ? $identity['id'] : null,
            'display_name' => $identity['name'], 'is_ready' => $ready,
            'avatar_preset' => $avatar['preset'], 'avatar_version' => $avatar['version'],
            'last_seen_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    /** The preset and version a joining player brings with them. */
    /** The preset the device is showing right now, so a face picked offline still shows up. */
    private function presetFrom(Request $request): ?string
    {
        $preset = $request->input('avatar_preset');
        if (!is_string($preset)) return null;
        return in_array($preset, \App\Http\Controllers\Api\AvatarController::PRESETS, true) ? $preset : null;
    }

    private function identityAvatar(array $identity): array
    {
        if ($identity['kind'] === 'user') {
            $row = DB::table('users')->where('id', $identity['id'])->first(['avatar_preset', 'avatar_version']);
            return ['preset' => $row->avatar_preset ?? null, 'version' => (int) ($row->avatar_version ?? 0)];
        }
        $row = DB::table('guest_identities')->where('id', $identity['id'])->first(['avatar_preset']);
        return ['preset' => $row->avatar_preset ?? null, 'version' => 0];
    }

    private function partyView(object $party, array $identity): array
    {
        $members = DB::table('party_players')->where('party_id', $party->id)->orderBy('id')->get();
        // One query for every custom picture in the party, so the 0.9s poll stays cheap.
        $customAvatars = DB::table('user_avatars')->whereIn('user_id', $members->pluck('user_id')->filter()->all())->pluck('user_id')->map(fn ($id) => (int) $id)->all();
        // Live version, not the one snapshotted at join: a new photo must get a new address.
        $avatarVersions = DB::table('users')->whereIn('id', $members->pluck('user_id')->filter()->all())->pluck('avatar_version', 'id');
        $myPlayer = $members->first(fn ($person) => ($identity['kind'] === 'user' ? (int) $person->user_id : (int) $person->guest_id) === (int) $identity['id']);
        if (!$myPlayer) throw new HttpException(404, 'Party not found.');
        $round = DB::table('party_rounds')->where('party_id', $party->id)->orderByDesc('round_number')->first();
        $submissions = $round ? DB::table('party_submissions')->where('round_id', $round->id)->get() : collect();
        $ownSubmission = $round ? $submissions->firstWhere('player_id', $myPlayer->id) : null;
        $roundScores = $round ? DB::table('party_round_scores')->where('round_id', $round->id)->pluck('player_id')->map(fn ($id) => (string) $id)->all() : [];
        $outcome = $round?->outcome ? json_decode($round->outcome, true) : null;
        $displayPrompt = $round?->prompt;
        if ($round?->game === 'whoami') $displayPrompt = $round->locale === 'ar' ? 'من أنا؟' : 'Who am I?';
        if ($round?->game === 'charades') $displayPrompt = $round->locale === 'ar' ? 'مثّلها!' : 'Act it out!';
        $privateClue = null;
        if ($round?->game === 'charades' && (int) $round->turn_player_id === (int) $myPlayer->id) $privateClue = $round->answer;
        if ($round?->game === 'whoami' && (int) $round->turn_player_id !== (int) $myPlayer->id) $privateClue = $round->answer;
        $wordle = null;
        if ($round && $round->game === 'wordle') {
            $ownRow = $submissions->firstWhere('player_id', $myPlayer->id);
            $ownPayload = $ownRow ? (json_decode($ownRow->payload, true) ?: []) : [];
            $wordle = [
                'length' => Wordle::LENGTH,
                'max' => Wordle::MAX_GUESSES,
                'attempts' => $ownPayload['guesses'] ?? [],
                'solved' => !empty($ownPayload['solved']),
            ];
        }
        $wheel = null;
        if ($party->current_game === 'wheel' && $party->state) {
            $wheel = json_decode($party->state, true)['wheel'] ?? null;
        }
        $bracketView = null;
        if ($party->current_game === 'bracket' && $party->state) {
            $bracketView = json_decode($party->state, true)['bracket'] ?? null;
        }
        $gameState = null;
        if ($round && \App\Support\PartyGames::isNew($round->game)) {
            $gameState = \App\Support\PartyGames::view($party, $round, $myPlayer, $members);
        }
        $isHostView = (int) $party->host_player_id === (int) $myPlayer->id;
        $nextInMs = ($party->status === 'playing' && $party->auto_next_at !== null) ? max(0, (int) $party->auto_next_at - \App\Support\PartyGames::ms()) : null;
        $requests = [];
        $customCounts = (object) [];
        if ($isHostView) {
            $seatNames = $members->pluck('display_name', 'id');
            foreach (DB::table('party_requests')->where('party_id', $party->id)->where('status', 'pending')->orderBy('id')->get() as $req) {
                $requests[] = ['id' => (string) $req->id, 'name' => $req->display_name, 'claim_player_id' => $req->claim_player_id ? (string) $req->claim_player_id : null, 'claim_name' => $req->claim_player_id ? ($seatNames[$req->claim_player_id] ?? null) : null];
            }
            $customCounts = (object) DB::table('party_prompts')->where('party_id', $party->id)->groupBy('game')->selectRaw('game, count(*) as n')->pluck('n', 'game')->map(fn ($n) => (int) $n)->all();
        }
        $roundView = $round ? [
            'number' => (int) $round->round_number,
            'game' => $round->game,
            'prompt' => $displayPrompt,
            'options' => ($round->game === 'wyr' && $round->answer && str_contains((string) $round->answer, '|')) ? explode('|', (string) $round->answer, 2) : null,
            'status' => $round->status,
            'turn_player_id' => $round->turn_player_id ? (string) $round->turn_player_id : null,
            'private_clue' => $privateClue,
            'wordle' => $wordle,
            'result' => $outcome,
            'submitted' => (bool) $ownSubmission,
            'submission_count' => $submissions->count(),
            'scored_player_ids' => $roundScores,
            'submission_status' => $members->map(fn ($person) => ['player_id' => (string) $person->id, 'submitted' => $submissions->contains('player_id', $person->id)])->values()->all(),
        ] : null;
        return [
            'id' => (string) $party->id, 'name' => $party->name, 'code' => $party->invite_code,
            'players' => $members->pluck('display_name')->all(),
            'members' => $members->map(fn ($person) => [
                'id' => (string) $person->id, 'name' => $person->display_name,
                'ready' => (bool) $person->is_ready, 'score' => (int) $person->score,
                'is_host' => (int) $person->id === (int) $party->host_player_id,
                'online' => $person->last_seen_at && \App\Support\History::age($person->last_seen_at) < 20,
                'sitting_out' => !($person->last_seen_at && \App\Support\History::age($person->last_seen_at) < 25),
                'rtt' => $person->last_rtt_ms === null ? null : (int) $person->last_rtt_ms,
                'avatar' => \App\Http\Controllers\Api\AvatarController::avatarFrom(
                    $person->user_id ? in_array((int) $person->user_id, $customAvatars, true) : false,
                    $person->user_id ? (int) $person->user_id : null,
                    $person->avatar_preset,
                    (int) ($avatarVersions[$person->user_id] ?? 0)
                ),
            ])->values()->all(),
            'self_player_id' => $myPlayer ? (string) $myPlayer->id : null,
            'is_host' => (int) $party->host_player_id === (int) $myPlayer->id,
            'status' => $party->status, 'game' => $party->current_game,
            'wheel' => $wheel,
            'bracket' => $bracketView,
            'game_state' => $gameState,
            'tournament' => \App\Support\Tournament::view($party->id),
            'next_in_ms' => $nextInMs,
            'content_mode' => $party->content_mode ?: 'builtin',
            'requests' => $requests,
            'custom_counts' => $customCounts,
            'round' => $roundView, 'createdAt' => $party->created_at,
        ];
    }

    private function uniqueCode(): string
    {
        // 5 characters, easy to say aloud: no 0/O, 1/I/L, S/5. Pattern CVCVC or CVCDD.
        $c = 'BDFGHJKMNPRTVWZ'; $v = 'AEU'; $d = '2346789';
        $pick = fn (string $set) => $set[random_int(0, strlen($set) - 1)];
        $tries = 0;
        do {
            $code = $pick($c).$pick($v).$pick($c).(random_int(0, 3) === 0 ? $pick($d).$pick($d) : $pick($v).$pick($c));
            if (++$tries > 200) $code = Str::upper(Str::random(8));
        } while (DB::table('parties')->where('invite_code', $code)->exists());
        return $code;
    }

    private function buildBracket(array $teams, $players): array
    {
        $clean = [];
        foreach ($teams as $team) {
            $name = trim((string) ($team['name'] ?? ''));
            if ($name === '') continue;
            $members = array_values(array_filter(array_map(fn ($x) => trim((string) $x), $team['members'] ?? []), fn ($x) => $x !== ''));
            $clean[] = ['name' => $name, 'members' => $members];
        }
        if (count($clean) < 2) $clean = $players->map(fn ($person) => ['name' => $person->display_name, 'members' => []])->values()->all();
        $clean = array_slice($clean, 0, 32);
        $seeds = array_keys($clean);
        shuffle($seeds);
        $size = 2;
        while ($size < count($seeds)) $size *= 2;
        $half = intdiv($size, 2);
        $rounds = [];
        $matches = [];
        for ($i = 0; $i < $half; $i++) $matches[] = ['a' => $seeds[$i], 'b' => $seeds[$half + $i] ?? null, 'w' => null];
        $rounds[] = $matches;
        while (count($matches) > 1) {
            $matches = array_map(fn () => ['a' => null, 'b' => null, 'w' => null], range(1, intdiv(count($matches), 2)));
            $rounds[] = $matches;
        }
        return $this->normalizeBracket(['teams' => $clean, 'rounds' => $rounds]);
    }

    private function normalizeBracket(array $bracket): array
    {
        $rounds = $bracket['rounds'];
        foreach ($rounds as $r => $matches) {
            foreach ($matches as $m => $match) {
                if ($r > 0) {
                    $match['a'] = $rounds[$r - 1][2 * $m]['w'];
                    $match['b'] = $rounds[$r - 1][2 * $m + 1]['w'];
                } elseif (($match['a'] === null) !== ($match['b'] === null)) {
                    $match['w'] = $match['a'] ?? $match['b'];
                }
                if ($match['w'] !== null && $match['w'] !== $match['a'] && $match['w'] !== $match['b']) $match['w'] = null;
                $rounds[$r][$m] = $match;
            }
        }
        $bracket['rounds'] = $rounds;
        return $bracket;
    }

    private function spinWheel(int $partyId, $members): array
    {
        $row = DB::table('parties')->where('id', $partyId)->first();
        $wheel = $row && $row->state ? (json_decode($row->state, true)['wheel'] ?? null) : null;
        $entries = $wheel['entries'] ?? $members->pluck('display_name')->all();
        $remaining = $wheel['remaining'] ?? $entries;
        if (count($remaining) === 0) $remaining = $entries;
        $index = random_int(0, count($remaining) - 1);
        $picked = $remaining[$index];
        $eliminate = !empty($wheel['eliminate']);
        if ($eliminate) {
            array_splice($remaining, $index, 1);
            if (count($remaining) === 0) $remaining = $entries;
        }
        if ($wheel) {
            $wheel['remaining'] = $remaining;
            DB::table('parties')->where('id', $partyId)->update(['state' => json_encode(['wheel' => $wheel], JSON_THROW_ON_ERROR), 'updated_at' => now()]);
        }
        return ['result' => $picked, 'remaining' => $remaining, 'eliminate' => $eliminate];
    }

    private function rollDice(int $count): array
    {
        $faces = array_map(fn () => random_int(1, 6), range(1, $count));
        return ['faces' => $faces, 'result' => array_sum($faces)];
    }

    /** Pick a prompt without repeating inside this party until the bank is exhausted. */
    private function pickPrompt(int $partyId, string $game, string $locale, array $promptBank, array $answerBank): array
    {
        $bank = \App\Support\Content::bank($game, $locale);
        if ($game === 'wyr' && $bank !== null) {
            // The file holds "A|B"; the round shows "A or B?" and keeps the two sides for the buttons.
            $joiner = ['en' => ' or ', 'ar' => ' أم ', 'de' => ' oder '][$locale] ?? ' or ';
            $mark = $locale === 'ar' ? '؟' : '?';
            $bank = array_map(fn ($row) => [rtrim($row[0], '?؟').$joiner.rtrim($row[1][0] ?? '', '?؟').$mark, [$row[0], $row[1][0] ?? '']], $bank);
            $used = array_flip(DB::table('party_rounds')->where('party_id', $partyId)->where('game', 'wyr')->pluck('prompt')->all());
            $custom = [];
            if ((string) DB::table('parties')->where('id', $partyId)->value('content_mode') !== 'builtin') {
                foreach (\App\Support\Content::custom($partyId, 'wyr') as [$a, $b]) $custom[] = [rtrim($a, '?؟').$joiner.rtrim($b[0] ?? '', '?؟').$mark, [$a, $b[0] ?? '']];
            }
            $row = $this->chooseRow($partyId, $bank, $custom, $used);
            return [$row[0], implode('|', $row[1])];
        }
        if ($bank === null) {
            $list = $promptBank[$game] ?? [''];
            $i = random_int(0, count($list) - 1);
            return [$list[$i], isset($answerBank[$game]) ? $answerBank[$game][$i] : null];
        }
        $used = array_flip(DB::table('party_rounds')->where('party_id', $partyId)->where('game', $game)->pluck('prompt')->all());
        $row = \App\Support\Content::choose($partyId, $game, $bank, $used);
        return [$row[0], $game === 'trivia' || $game === 'charades' || $game === 'whoami' ? ($row[1][0] ?? $row[0]) : null];
    }

    /** Same choice as Content::choose, for rows already shaped by the caller. */
    private function chooseRow(int $partyId, array $bank, array $custom, array $used): array
    {
        $mode = (string) (DB::table('parties')->where('id', $partyId)->value('content_mode') ?: 'builtin');
        $fresh = fn (array $rows) => array_values(array_filter($rows, fn ($row) => !isset($used[$row[0]])));
        $mine = $fresh($custom);
        $built = $fresh($bank);
        if ($mode === 'only' && $custom) $pool = $mine ?: $custom;
        elseif ($mode === 'mix' && $mine && (!$built || random_int(1, 100) <= 40)) $pool = $mine;
        else $pool = $built ?: $bank;
        return $pool[random_int(0, count($pool) - 1)];
    }

    /**
     * Finish a submission round (trivia, would you rather, most likely) once every player who is
     * actually here has answered. A player who dropped out no longer holds the room up.
     */
    public function settleSubmissions(object $round, $members, int $partyId): bool
    {
        if ($round->status !== 'active' || !in_array($round->game, ['trivia', 'wyr', 'likely'], true)) return false;
        $subs = DB::table('party_submissions')->where('round_id', $round->id)->get();
        if ($subs->isEmpty()) return false;
        $done = $subs->pluck('player_id')->map(fn ($id) => (int) $id)->all();
        $waiting = $members->filter(fn ($person) => !in_array((int) $person->id, $done, true) && $person->last_seen_at && \App\Support\History::age($person->last_seen_at) < 25);
        if ($waiting->isNotEmpty()) return false;
        if ($round->game === 'trivia') {
            foreach ($subs as $submission) {
                $given = json_decode($submission->payload, true)['value'] ?? '';
                if (\App\Support\Content::matches((string) $given, (string) $round->answer, \App\Support\Content::aliases('trivia', (string) $round->locale, (string) $round->prompt, $partyId))) DB::table('party_players')->where('id', $submission->player_id)->increment('score');
            }
            $outcome = ['answer' => $round->answer];
        } else {
            $outcome = ['tally' => $this->tally($round->id)];
        }
        DB::table('party_rounds')->where('id', $round->id)->update(['outcome' => json_encode($outcome, JSON_THROW_ON_ERROR), 'status' => 'complete', 'updated_at' => now()]);
        return true;
    }

    private function normalized(string $answer): string
    {
        return mb_strtolower(preg_replace('/\s+/u', ' ', trim($answer)) ?? trim($answer));
    }

    private function tally(int $roundId): array
    {
        $counts = [];
        foreach (DB::table('party_submissions')->where('round_id', $roundId)->get() as $submission) {
            $value = json_decode($submission->payload, true)['value'] ?? '';
            $counts[$value] = ($counts[$value] ?? 0) + 1;
        }
        arsort($counts);
        return $counts;
    }
}
