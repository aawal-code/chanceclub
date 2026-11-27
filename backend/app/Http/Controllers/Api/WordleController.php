<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Wordle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class WordleController extends Controller
{
    public function start(Request $request): JsonResponse
    {
        $identity = $request->attributes->get('cc.identity') ?? throw new HttpException(401, 'Unauthenticated.');
        $id = DB::table('wordle_solo_games')->insertGetId([
            'user_id' => $identity['kind'] === 'user' ? $identity['id'] : null,
            'guest_id' => $identity['kind'] === 'guest' ? $identity['id'] : null,
            'word' => Wordle::pick(),
            'guesses' => json_encode([]),
            'solved' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return response()->json(['data' => $this->view($this->game($request, $id))], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json(['data' => $this->view($this->game($request, $id))]);
    }

    public function guess(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['word' => ['required', 'string', 'max:10']]);
        $game = $this->game($request, $id);
        $guess = mb_strtolower(trim($data['word']));
        if (!preg_match('/^[a-z]{5}$/', $guess)) {
            throw ValidationException::withMessages(['word' => 'Enter a five-letter word.']);
        }
        if (!Wordle::isValid($guess)) {
            throw ValidationException::withMessages(['word' => 'That word is not in the dictionary.']);
        }
        $guesses = json_decode($game->guesses ?? '[]', true) ?: [];
        if ($game->solved) throw new HttpException(409, 'This round is already solved.');
        if (count($guesses) >= Wordle::MAX_GUESSES) throw new HttpException(409, 'No guesses left.');
        if (in_array($guess, array_column($guesses, 'word'), true)) throw new HttpException(409, 'You already tried that word.');
        $guesses[] = ['word' => $guess, 'pattern' => Wordle::pattern($guess, $game->word)];
        $solved = $guess === mb_strtolower($game->word);
        DB::table('wordle_solo_games')->where('id', $game->id)->update([
            'guesses' => json_encode($guesses),
            'solved' => $solved,
            'updated_at' => now(),
        ]);
        return response()->json(['data' => $this->view($this->game($request, $id))]);
    }

    private function game(Request $request, int $id): object
    {
        $identity = $request->attributes->get('cc.identity') ?? throw new HttpException(401, 'Unauthenticated.');
        $query = DB::table('wordle_solo_games')->where('id', $id);
        if ($identity['kind'] === 'user') $query->where('user_id', $identity['id']);
        else $query->where('guest_id', $identity['id']);
        return $query->first() ?? throw new HttpException(404, 'Game not found.');
    }

    private function view(object $game): array
    {
        $guesses = json_decode($game->guesses ?? '[]', true) ?: [];
        $done = (bool) $game->solved || count($guesses) >= Wordle::MAX_GUESSES;
        return [
            'id' => (string) $game->id,
            'length' => Wordle::LENGTH,
            'max' => Wordle::MAX_GUESSES,
            'attempts' => $guesses,
            'solved' => (bool) $game->solved,
            'done' => $done,
            'word' => $done ? mb_strtoupper($game->word) : null,
        ];
    }
}
