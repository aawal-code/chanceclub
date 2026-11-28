<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PartyFlowTest extends TestCase
{
    use RefreshDatabase;

    private function guest(string $name): string
    {
        return $this->postJson('/api/v1/guest', ['name' => $name])->assertCreated()->json('token');
    }

    /** Host plus the given guests, all ready. Returns [code, partyId, tokens by name]. */
    private function party(array $names): array
    {
        $tokens = ['Host' => $this->guest('Host')];
        $created = $this->withToken($tokens['Host'])->postJson('/api/v1/parties', ['name' => 'Night'])->assertCreated();
        $code = $created->json('data.code');
        foreach ($names as $name) {
            $tokens[$name] = $this->guest($name);
            $this->withToken($tokens[$name])->postJson("/api/v1/parties/{$code}/join")->assertOk();
            $this->withToken($tokens[$name])->postJson("/api/v1/parties/{$code}/ready", ['ready' => true])->assertOk();
        }
        return [$code, (int) $created->json('data.id'), $tokens];
    }

    private function away(int $partyId, string $name, int $seconds = 120): void
    {
        DB::table('party_players')->where('party_id', $partyId)->where('display_name', $name)->update(['last_seen_at' => now()->subSeconds($seconds)]);
    }

    public function test_host_role_moves_to_someone_who_is_still_here_when_the_host_disappears(): void
    {
        [$code, $id, $t] = $this->party(['Mina', 'Omar']);
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/start", ['game' => 'trivia'])->assertOk();
        $this->away($id, 'Host');
        $view = $this->withToken($t['Mina'])->getJson("/api/v1/parties/{$code}")->assertOk();
        $view->assertJsonPath('data.is_host', true);
        $this->withToken($t['Mina'])->postJson("/api/v1/parties/{$code}/advance")->assertOk()->assertJsonPath('data.round.number', 2);
        $this->withToken($t['Omar'])->getJson("/api/v1/parties/{$code}")->assertJsonPath('data.is_host', false);
        // The old host comes back as an ordinary player, with their score and seat.
        $this->withToken($t['Host'])->getJson("/api/v1/parties/{$code}")->assertOk()->assertJsonPath('data.is_host', false);
    }

    public function test_host_can_hand_over_and_only_the_host_can(): void
    {
        [$code, $id, $t] = $this->party(['Mina']);
        $mina = DB::table('party_players')->where('party_id', $id)->where('display_name', 'Mina')->value('id');
        $this->withToken($t['Mina'])->postJson("/api/v1/parties/{$code}/host", ['player_id' => $mina])->assertForbidden();
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/host", ['player_id' => $mina])->assertOk();
        $this->withToken($t['Mina'])->getJson("/api/v1/parties/{$code}")->assertJsonPath('data.is_host', true);
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/start", ['game' => 'trivia'])->assertForbidden();
    }

    public function test_a_new_device_can_take_over_an_abandoned_seat_after_the_host_agrees(): void
    {
        [$code, $id, $t] = $this->party(['Mina', 'Omar']);
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/start", ['game' => 'trivia'])->assertOk();
        $minaId = DB::table('party_players')->where('party_id', $id)->where('display_name', 'Mina')->value('id');
        DB::table('party_players')->where('id', $minaId)->update(['score' => 4]);
        $newDevice = $this->guest('Mina again');

        $this->withToken($newDevice)->getJson("/api/v1/parties/{$code}")->assertNotFound();
        $this->withToken($newDevice)->postJson("/api/v1/parties/{$code}/claim", ['player_id' => $minaId])->assertStatus(409); // Mina is still here
        $this->away($id, 'Mina');
        $seats = $this->withToken($newDevice)->getJson("/api/v1/parties/{$code}/seats")->assertOk();
        $this->assertSame('Mina', $seats->json('seats.0.name'));
        $this->withToken($newDevice)->postJson("/api/v1/parties/{$code}/claim", ['player_id' => $minaId])->assertStatus(202)->assertJsonPath('request.status', 'pending');
        $this->withToken($newDevice)->getJson("/api/v1/parties/{$code}")->assertNotFound();

        $hostView = $this->withToken($t['Host'])->getJson("/api/v1/parties/{$code}")->assertOk();
        $this->assertSame('Mina', $hostView->json('data.requests.0.claim_name'));
        $reqId = $hostView->json('data.requests.0.id');
        $this->withToken($t['Omar'])->postJson("/api/v1/parties/{$code}/requests/{$reqId}/approve")->assertForbidden();
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/requests/{$reqId}/approve")->assertOk();

        $this->withToken($newDevice)->getJson("/api/v1/parties/{$code}/request")->assertJsonPath('request.status', 'approved');
        $mine = $this->withToken($newDevice)->getJson("/api/v1/parties/{$code}")->assertOk();
        $this->assertSame((string) $minaId, $mine->json('data.self_player_id'));
        $this->assertSame(4, collect($mine->json('data.members'))->firstWhere('id', (string) $minaId)['score']);
        $this->withToken($t['Mina'])->getJson("/api/v1/parties/{$code}")->assertNotFound(); // the old device no longer holds the seat
    }

    public function test_someone_new_can_ask_to_join_a_running_game_and_the_host_can_say_no(): void
    {
        [$code, $id, $t] = $this->party(['Mina', 'Omar']);
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/start", ['game' => 'imposter', 'locale' => 'en'])->assertOk();
        $late = $this->guest('Late');
        $this->withToken($late)->postJson("/api/v1/parties/{$code}/join")->assertStatus(202)->assertJsonPath('requested', true);
        $this->withToken($late)->postJson("/api/v1/parties/{$code}/join")->assertStatus(202); // asking twice is harmless
        $this->assertSame(1, DB::table('party_requests')->where('party_id', $id)->count());
        $reqId = $this->withToken($t['Host'])->getJson("/api/v1/parties/{$code}")->json('data.requests.0.id');
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/requests/{$reqId}/approve")->assertOk();
        // A player added mid-round watches this round and plays the next; nothing breaks for anyone.
        $this->withToken($late)->getJson("/api/v1/parties/{$code}")->assertOk()->assertJsonCount(4, 'data.members');
        foreach (['Host', 'Mina', 'Omar'] as $who) $this->withToken($t[$who])->getJson("/api/v1/parties/{$code}")->assertOk();
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/advance")->assertOk();
        $this->withToken($late)->getJson("/api/v1/parties/{$code}")->assertOk();

        $other = $this->guest('Nope');
        $this->withToken($other)->postJson("/api/v1/parties/{$code}/join")->assertStatus(202);
        $reqId = $this->withToken($t['Host'])->getJson("/api/v1/parties/{$code}")->json('data.requests.0.id');
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/requests/{$reqId}/deny")->assertOk();
        $this->withToken($other)->getJson("/api/v1/parties/{$code}/request")->assertJsonPath('request.status', 'denied');
        $this->withToken($other)->getJson("/api/v1/parties/{$code}")->assertNotFound();
    }

    public function test_a_dropped_player_no_longer_holds_up_trivia_and_the_next_round_starts_by_itself(): void
    {
        [$code, $id, $t] = $this->party(['Mina', 'Omar']);
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/start", ['game' => 'trivia'])->assertOk();
        $this->away($id, 'Omar');
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/action", ['type' => 'answer', 'value' => 'x'])->assertOk()->assertJsonPath('data.round.result', null);
        $done = $this->withToken($t['Mina'])->postJson("/api/v1/parties/{$code}/action", ['type' => 'answer', 'value' => 'y'])->assertOk();
        $done->assertJsonPath('data.round.status', 'complete');
        $view = $this->withToken($t['Host'])->getJson("/api/v1/parties/{$code}")->assertOk();
        $left = $view->json('data.next_in_ms');
        $this->assertGreaterThan(5000, $left);
        $this->assertLessThanOrEqual(10000, $left);
        DB::table('parties')->where('id', $id)->update(['auto_next_at' => (int) floor(microtime(true) * 1000) - 5]);
        $this->withToken($t['Mina'])->getJson("/api/v1/parties/{$code}")->assertJsonPath('data.round.number', 2)->assertJsonPath('data.round.status', 'active')->assertJsonPath('data.next_in_ms', null);
        // Polling again must not start a third round.
        $this->withToken($t['Host'])->getJson("/api/v1/parties/{$code}")->assertJsonPath('data.round.number', 2);
    }

    public function test_host_can_skip_the_countdown_and_decider_games_never_auto_advance(): void
    {
        [$code, $id, $t] = $this->party(['Mina']);
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/start", ['game' => 'dice'])->assertOk();
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/action", ['type' => 'roll'])->assertOk();
        $this->withToken($t['Mina'])->getJson("/api/v1/parties/{$code}")->assertJsonPath('data.next_in_ms', null)->assertJsonPath('data.round.status', 'complete');
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/finish")->assertOk();
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/start", ['game' => 'wyr'])->assertOk();
        $m = $this->withToken($t['Mina'])->getJson("/api/v1/parties/{$code}")->assertOk();
        $this->assertCount(2, $m->json('data.round.options'));
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/action", ['type' => 'vote', 'value' => $m->json('data.round.options.0')])->assertOk();
        $this->withToken($t['Mina'])->postJson("/api/v1/parties/{$code}/action", ['type' => 'vote', 'value' => $m->json('data.round.options.1')])->assertOk()->assertJsonPath('data.round.status', 'complete');
        $this->withToken($t['Mina'])->getJson("/api/v1/parties/{$code}")->assertJsonPath('data.next_in_ms', fn ($v) => $v > 0);
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/advance")->assertOk()->assertJsonPath('data.round.number', 3)->assertJsonPath('data.next_in_ms', null);
    }

    public function test_play_again_keeps_everyone_who_is_here_ready(): void
    {
        [$code, $id, $t] = $this->party(['Mina', 'Omar']);
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/start", ['game' => 'trivia'])->assertOk();
        $this->away($id, 'Omar');
        $view = $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/finish")->assertOk()->assertJsonPath('data.status', 'lobby');
        $ready = collect($view->json('data.members'))->pluck('ready', 'name');
        $this->assertTrue($ready['Host']);
        $this->assertTrue($ready['Mina']);
        $this->assertFalse($ready['Omar']);
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/start", ['game' => 'trivia'])->assertOk()->assertJsonPath('data.status', 'playing');
    }

    public function test_host_prompts_are_used_and_scored_with_their_own_alternate_answers(): void
    {
        [$code, $id, $t] = $this->party(['Mina']);
        $this->withToken($t['Mina'])->postJson("/api/v1/parties/{$code}/prompts", ['game' => 'trivia', 'lines' => ['Q? | A']])->assertForbidden();
        $add = $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/prompts", ['game' => 'trivia', 'lines' => ['Who is our group chat admin? | Sara ; Sarah', 'no answer here', '']])->assertOk();
        $add->assertJsonPath('added', 1)->assertJsonPath('skipped', 2);
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/prompt-mode", ['mode' => 'only'])->assertOk();
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/start", ['game' => 'trivia'])->assertOk()->assertJsonPath('data.round.prompt', 'Who is our group chat admin?')->assertJsonPath('data.custom_counts.trivia', 1);
        $this->withToken($t['Mina'])->postJson("/api/v1/parties/{$code}/action", ['type' => 'answer', 'value' => 'sarah'])->assertOk();
        $done = $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/action", ['type' => 'answer', 'value' => 'nobody'])->assertOk()->assertJsonPath('data.round.result.answer', 'Sara');
        $this->assertSame(1, collect($done->json('data.members'))->firstWhere('name', 'Mina')['score']);
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/prompts", ['game' => 'wyr', 'lines' => ['Tea | Coffee']])->assertOk();
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/finish")->assertOk();
        $this->withToken($t['Host'])->postJson("/api/v1/parties/{$code}/start", ['game' => 'wyr'])->assertOk()->assertJsonPath('data.round.prompt', 'Tea or Coffee?')->assertJsonPath('data.round.options.1', 'Coffee');
    }
}
