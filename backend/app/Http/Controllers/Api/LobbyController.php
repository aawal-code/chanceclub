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
    private const GAMES = ['categories', 'whoami', 'trivia', 'charades', 'wyr', 'likely', 'yesno', 'dice', 'coin', 'wheel', 'number', 'wordle', 'bracket', 'draw'];

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
        return response()->json(['data' => $parties->map(fn ($party) => $this->partyView($party, $identity))->values()]);
    }

    public function create(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'min:1', 'max:80']]);
        $identity = $this->identity($request);
        $party = DB::transaction(function () use ($data, $identity) {
            $code = $this->uniqueCode();
            $partyId = DB::table('parties')->insertGetId([
                'owner_id' => $identity['kind'] === 'user' ? $identity['id'] : null,
                'name' => trim($data['name']),
                'invite_code' => $code,
                'status' => 'lobby',
                'round_number' => 0,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $playerId = $this->insertPlayer($partyId, $identity, true);
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
        if (!$player->last_seen_at || now()->diffInSeconds($player->last_seen_at) >= 8) {
            DB::table('party_players')->where('id', $player->id)->update(['last_seen_at' => now(), 'updated_at' => now()]);
        }
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
        $party = DB::table('parties')->where('invite_code', strtoupper($code))->first();
        if (!$party || $party->status !== 'lobby') return response()->json(['message' => 'Lobby not found or already started.'], 404);
        $joined = DB::transaction(function () use ($party, $identity) {
            $locked = DB::table('parties')->where('id', $party->id)->lockForUpdate()->first();
            if (!$locked || $locked->status !== 'lobby') throw new HttpException(409, 'This lobby has already started.');
            $existing = $this->player($locked->id, $identity);
            if ($existing) {
                DB::table('party_players')->where('id', $existing->id)->update(['last_seen_at' => now(), 'updated_at' => now()]);
                return DB::table('parties')->find($locked->id);
            }
            if (DB::table('party_players')->where('party_id', $locked->id)->count() >= 20) throw new HttpException(409, 'This lobby is full.');
            $this->insertPlayer($locked->id, $identity, false);
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
        $result = DB::transaction(function () use ($party, $data, $identity) {
            $locked = DB::table('parties')->where('id', $party->id)->lockForUpdate()->first();
            if ($locked->status !== 'lobby') throw new HttpException(409, 'The game has already started.');
            $players = DB::table('party_players')->where('party_id', $locked->id)->orderBy('id')->get();
            $isOnline = fn ($p) => $p->last_seen_at && now()->diffInSeconds($p->last_seen_at) < 25;
            $present = $players->filter(fn ($p) => $isOnline($p) || (int) $p->id === (int) $locked->host_player_id)->values();
            if ($present->count() < 2) throw new HttpException(409, 'At least two players are needed.');
            if ($present->contains(fn ($player) => !$player->is_ready)) throw new HttpException(409, 'Everyone must be ready first.');
            $players = $present;
            $number = (int) $locked->round_number + 1;
            $game = $data['game'];
            $locale = $data['locale'] ?? 'en';
            $promptBank = $locale === 'ar' ? self::PROMPTS_AR : self::PROMPTS;
            $answerBank = $locale === 'ar' ? self::ANSWERS_AR : self::ANSWERS;
            if ($locale === 'de') { $promptBank = self::PROMPTS_DE; $answerBank = self::ANSWERS_DE; }
            $promptIndex = random_int(0, count($promptBank[$game]) - 1);
            $prompt = $promptBank[$game][$promptIndex];
            $answer = isset($answerBank[$game]) ? $answerBank[$game][$promptIndex] : null;
            if ($game === 'wordle') $answer = Wordle::pick();
            $turn = $players->first(fn ($player) => (int) $player->id === (int) $locked->host_player_id) ?? $players->first();
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
            DB::table('parties')->where('id', $locked->id)->update(['status' => 'playing', 'current_game' => $game, 'round_number' => $number, 'state' => $wheelState ? json_encode(['wheel' => $wheelState], JSON_THROW_ON_ERROR) : ($bracketState ? json_encode(['bracket' => $bracketState], JSON_THROW_ON_ERROR) : null), 'updated_at' => now()]);
            return DB::table('parties')->find($locked->id);
        });
        return response()->json(['data' => $this->partyView($result, $identity)]);
    }

    public function action(Request $request, string $code): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', 'string', 'in:answer,vote,roll,point,guess,pick'],
            'target_player_id' => ['nullable', 'integer', 'min:1'],
            'value' => ['nullable', 'string', 'max:120'],
            'count' => ['nullable', 'integer', 'in:1,2'],
            'max' => ['nullable', 'integer', 'min:2', 'max:10000'],
        ]);
        $identity = $this->identity($request);
        $party = $this->party($code);
        $player = $this->requireMember($party, $identity);
        $responseParty = DB::transaction(function () use ($party, $player, $data, $identity) {
            $round = DB::table('party_rounds')->where('party_id', $party->id)->orderByDesc('round_number')->lockForUpdate()->first();
            if (!$round || $round->status !== 'active') throw new HttpException(409, 'This round is already resolved.');
            $members = DB::table('party_players')->where('party_id', $party->id)->orderBy('id')->get();
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
                $submitted = DB::table('party_submissions')->where('round_id', $round->id)->whereIn('player_id', $members->pluck('id'))->count();
                if ($submitted >= $members->count()) {
                    if ($round->game === 'trivia') {
                        foreach (DB::table('party_submissions')->where('round_id', $round->id)->get() as $submission) {
                            $submittedValue = json_decode($submission->payload, true)['value'] ?? '';
                            if ($this->normalized($submittedValue) === $this->normalized((string) $round->answer)) DB::table('party_players')->where('id', $submission->player_id)->increment('score');
                        }
                        $outcome = ['answer' => $round->answer];
                    } else {
                        $outcome = ['tally' => $this->tally($round->id)];
                    }
                    DB::table('party_rounds')->where('id', $round->id)->update(['outcome' => json_encode($outcome, JSON_THROW_ON_ERROR), 'status' => 'complete', 'updated_at' => now()]);
                }
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
        $result = DB::transaction(function () use ($party, $identity) {
            $locked = DB::table('parties')->where('id', $party->id)->lockForUpdate()->first();
            if ($locked->status !== 'playing' || !$locked->current_game) throw new HttpException(409, 'There is no active game.');
            $number = (int) $locked->round_number + 1;
            $game = $locked->current_game;
            $previousRound = DB::table('party_rounds')->where('party_id', $locked->id)->orderByDesc('round_number')->first();
            $locale = $previousRound?->locale ?? 'en';
            $promptBank = $locale === 'ar' ? self::PROMPTS_AR : self::PROMPTS;
            $answerBank = $locale === 'ar' ? self::ANSWERS_AR : self::ANSWERS;
            if ($locale === 'de') { $promptBank = self::PROMPTS_DE; $answerBank = self::ANSWERS_DE; }
            $index = random_int(0, count($promptBank[$game]) - 1);
            $players = DB::table('party_players')->where('party_id', $locked->id)->orderBy('id')->get();
            $previousTurnIndex = $players->search(fn ($person) => (int) $person->id === (int) ($previousRound?->turn_player_id ?? 0));
            $turn = $players->get($previousTurnIndex === false ? 0 : (($previousTurnIndex + 1) % $players->count()));
            if (!$previousRound?->turn_player_id) $turn = $players->first(fn ($person) => (int) $person->id === (int) $locked->host_player_id) ?? $players->first();
            DB::table('party_rounds')->insert([
                'party_id' => $locked->id, 'round_number' => $number, 'game' => $game, 'locale' => $locale,
                'prompt' => $promptBank[$game][$index], 'answer' => $game === 'wordle' ? Wordle::pick() : ($answerBank[$game][$index] ?? null),
                'status' => 'active', 'turn_player_id' => $turn->id, 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('parties')->where('id', $locked->id)->update(['round_number' => $number, 'updated_at' => now()]);
            return DB::table('parties')->find($locked->id);
        });
        return response()->json(['data' => $this->partyView($result, $identity)]);
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
                DB::table('party_players')->where('party_id', $locked->id)->update(['score' => 0, 'is_ready' => false, 'updated_at' => now()]);
                DB::table('party_players')->where('id', $locked->host_player_id)->update(['is_ready' => true]);
                DB::table('parties')->where('id', $locked->id)->update(['status' => 'lobby', 'current_game' => null, 'state' => null, 'updated_at' => now()]);
            }
            return DB::table('parties')->find($locked->id);
        });
        return response()->json(['data' => $this->partyView($result, $identity)]);
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

    private function insertPlayer(int $partyId, array $identity, bool $ready): int
    {
        return (int) DB::table('party_players')->insertGetId([
            'party_id' => $partyId,
            'user_id' => $identity['kind'] === 'user' ? $identity['id'] : null,
            'guest_id' => $identity['kind'] === 'guest' ? $identity['id'] : null,
            'display_name' => $identity['name'], 'is_ready' => $ready,
            'last_seen_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function partyView(object $party, array $identity): array
    {
        $members = DB::table('party_players')->where('party_id', $party->id)->orderBy('id')->get();
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
        $roundView = $round ? [
            'number' => (int) $round->round_number,
            'game' => $round->game,
            'prompt' => $displayPrompt,
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
                'online' => $person->last_seen_at && now()->diffInSeconds($person->last_seen_at) < 20,
                'rtt' => $person->last_rtt_ms === null ? null : (int) $person->last_rtt_ms,
            ])->values()->all(),
            'self_player_id' => $myPlayer ? (string) $myPlayer->id : null,
            'is_host' => (int) $party->host_player_id === (int) $myPlayer->id,
            'status' => $party->status, 'game' => $party->current_game,
            'wheel' => $wheel,
            'bracket' => $bracketView,
            'round' => $roundView, 'createdAt' => $party->created_at,
        ];
    }

    private function uniqueCode(): string
    {
        do { $code = Str::upper(Str::random(8)); } while (DB::table('parties')->where('invite_code', $code)->exists());
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
