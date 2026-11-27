<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ChanceClubApiTest extends TestCase
{
    use RefreshDatabase;

    private function account(): array
    {
        $response = $this->postJson('/api/v1/register', [
            'name' => 'Test Player',
            'email' => 'player@example.test',
            'password' => 'TestPassword123',
            'password_confirmation' => 'TestPassword123',
        ]);
        $response->assertCreated()->assertJsonPath('user.name', 'Test Player');
        return [$response->json('token'), $response->json('user')];
    }

    public function test_registration_login_and_profile_preferences(): void
    {
        [$token] = $this->account();
        $this->withToken($token)->getJson('/api/v1/me')->assertOk()->assertJsonPath('user.email', 'player@example.test');
        $this->withToken($token)->patchJson('/api/v1/me', ['preferred_language' => 'ar', 'theme' => 'dark'])
            ->assertOk()->assertJsonPath('user.preferred_language', 'ar')->assertJsonPath('user.theme', 'dark');
        $login = $this->postJson('/api/v1/login', ['email' => 'player@example.test', 'password' => 'TestPassword123']);
        $login->assertOk()->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);
    }

    public function test_bearer_authentication_is_required_for_private_routes(): void
    {
        $this->getJson('/api/v1/me')->assertUnauthorized();
        [$token] = $this->account();
        $this->withToken($token)->postJson('/api/v1/logout')->assertOk();
        $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_guest_lobby_readiness_private_answers_server_scoring_and_duplicate_rejection(): void
    {
        [$hostToken] = $this->account();
        $created = $this->withToken($hostToken)->postJson('/api/v1/parties', ['name' => 'Game night', 'players' => ['Fake name must be ignored']]);
        $created->assertCreated()->assertJsonPath('data.name', 'Game night')->assertJsonCount(1, 'data.players')->assertJsonPath('data.is_host', true);
        $code = $created->json('data.code');

        $guestA = $this->postJson('/api/v1/guest', ['name' => 'Mina'])->assertCreated();
        $guestB = $this->postJson('/api/v1/guest', ['name' => 'Omar'])->assertCreated();
        $tokenA = $guestA->json('token');
        $tokenB = $guestB->json('token');
        $this->assertNotSame($tokenA, $guestA->json('guest.id'));
        $this->assertSame(hash('sha256', $tokenA), DB::table('guest_identities')->where('id', $guestA->json('guest.id'))->value('token_hash'));

        $this->withToken($tokenA)->postJson("/api/v1/parties/{$code}/join")->assertOk()->assertJsonCount(2, 'data.players');
        $this->withToken($tokenA)->postJson("/api/v1/parties/{$code}/join")->assertOk()->assertJsonCount(2, 'data.players');
        $this->withToken($tokenB)->postJson("/api/v1/parties/{$code}/join")->assertOk()->assertJsonCount(3, 'data.players');
        $this->withToken($hostToken)->postJson("/api/v1/parties/{$code}/start", ['game' => 'trivia'])->assertStatus(409);
        $this->withToken($tokenA)->postJson("/api/v1/parties/{$code}/ready", ['ready' => true])->assertOk();
        $this->withToken($tokenB)->postJson("/api/v1/parties/{$code}/ready", ['ready' => true])->assertOk();
        $this->withToken($tokenA)->postJson("/api/v1/parties/{$code}/start", ['game' => 'trivia'])->assertForbidden();
        $this->withToken($hostToken)->postJson("/api/v1/parties/{$code}/start", ['game' => 'trivia'])->assertOk()->assertJsonPath('data.status', 'playing');

        $roundId = DB::table('party_rounds')->where('party_id', $created->json('data.id'))->value('id');
        $correct = DB::table('party_rounds')->where('id', $roundId)->value('answer');
        $answer = $this->withToken($tokenA)->postJson("/api/v1/parties/{$code}/action", ['type' => 'answer', 'value' => $correct]);
        $answer->assertOk()->assertJsonPath('data.round.result', null)->assertJsonPath('data.round.submitted', true);
        $this->withToken($tokenA)->postJson("/api/v1/parties/{$code}/action", ['type' => 'answer', 'value' => $correct])->assertStatus(409);
        $this->withToken($hostToken)->getJson("/api/v1/parties/{$code}")->assertOk()->assertJsonPath('data.round.result', null)->assertJsonPath('data.members.1.score', 0);
        $this->withToken($tokenB)->postJson("/api/v1/parties/{$code}/action", ['type' => 'answer', 'value' => 'not the answer'])->assertOk()->assertJsonPath('data.round.result', null);
        $this->withToken($hostToken)->postJson("/api/v1/parties/{$code}/action", ['type' => 'answer', 'value' => 'also incorrect'])->assertOk()->assertJsonPath('data.round.result.answer', $correct)->assertJsonPath('data.members.1.score', 1);
    }

    public function test_lobbies_hide_members_from_nonmembers_and_enforce_host_and_turn_permissions(): void
    {
        $host = $this->postJson('/api/v1/guest', ['name' => 'Host Guest'])->assertCreated();
        $hostToken = $host->json('token');
        $party = $this->withToken($hostToken)->postJson('/api/v1/parties', ['name' => 'Private lobby'])->assertCreated();
        $code = $party->json('data.code');
        $guest = $this->postJson('/api/v1/guest', ['name' => 'Second Guest'])->assertCreated();
        $guestToken = $guest->json('token');
        $this->withToken($guestToken)->postJson("/api/v1/parties/{$code}/join")->assertOk();
        $outsider = $this->postJson('/api/v1/guest', ['name' => 'Outside Player'])->assertCreated()->json('token');
        $this->withToken($outsider)->getJson("/api/v1/parties/{$code}")->assertNotFound();
        $this->getJson("/api/v1/parties/{$code}", ['Authorization' => ''])->assertUnauthorized();
        $this->withToken($guestToken)->postJson("/api/v1/parties/{$code}/start", ['game' => 'dice'])->assertForbidden();
        $this->withToken($hostToken)->postJson("/api/v1/parties/{$code}/ready", ['ready' => true])->assertOk();
        $this->withToken($guestToken)->postJson("/api/v1/parties/{$code}/ready", ['ready' => true])->assertOk();
        $this->withToken($hostToken)->postJson("/api/v1/parties/{$code}/start", ['game' => 'dice'])->assertOk();
        $this->withToken($guestToken)->postJson("/api/v1/parties/{$code}/action", ['type' => 'roll'])->assertForbidden();
        $this->withToken($hostToken)->postJson("/api/v1/parties/{$code}/action", ['type' => 'roll'])->assertOk();
        $this->withToken($hostToken)->postJson("/api/v1/parties/{$code}/action", ['type' => 'roll'])->assertStatus(409);
        $this->withToken($outsider)->postJson("/api/v1/parties/{$code}/advance")->assertNotFound();
    }

    public function test_whoami_clue_is_personalized_and_host_points_cannot_be_duplicated(): void
    {
        $host = $this->postJson('/api/v1/guest', ['name' => 'Clue Host'])->assertCreated();
        $hostToken = $host->json('token');
        $party = $this->withToken($hostToken)->postJson('/api/v1/parties', ['name' => 'Clue round'])->assertCreated();
        $code = $party->json('data.code');
        $member = $this->postJson('/api/v1/guest', ['name' => 'Guesser'])->assertCreated();
        $memberToken = $member->json('token');
        $joined = $this->withToken($memberToken)->postJson("/api/v1/parties/{$code}/join")->assertOk();
        $targetId = $joined->json('data.members.1.id');
        $this->withToken($memberToken)->postJson("/api/v1/parties/{$code}/ready", ['ready' => true])->assertOk();
        $started = $this->withToken($hostToken)->postJson("/api/v1/parties/{$code}/start", ['game' => 'whoami', 'locale' => 'ar'])->assertOk();
        $started->assertJsonPath('data.round.prompt', 'من أنا؟')->assertJsonPath('data.round.private_clue', null);
        $memberView = $this->withToken($memberToken)->getJson("/api/v1/parties/{$code}")->assertOk()->assertJsonPath('data.round.prompt', 'من أنا؟');
        $this->assertNotEmpty($memberView->json('data.round.private_clue'));
        $this->withToken($memberToken)->postJson("/api/v1/parties/{$code}/action", ['type' => 'point', 'target_player_id' => $targetId])->assertForbidden();
        $this->withToken($hostToken)->postJson("/api/v1/parties/{$code}/action", ['type' => 'point', 'target_player_id' => $targetId])->assertOk()->assertJsonPath('data.members.1.score', 1);
        $this->withToken($hostToken)->postJson("/api/v1/parties/{$code}/action", ['type' => 'point', 'target_player_id' => $targetId])->assertStatus(409);
        $this->withToken($hostToken)->getJson("/api/v1/parties/{$code}")->assertOk()->assertJsonPath('data.members.1.score', 1);
    }

    public function test_registering_from_a_guest_session_keeps_party_membership_and_scores(): void
    {
        $guest = $this->postJson('/api/v1/guest', ['name' => 'Guest Progress'])->assertCreated();
        $guestToken = $guest->json('token');
        $party = $this->withToken($guestToken)->postJson('/api/v1/parties', ['name' => 'Saved progress'])->assertCreated();
        $response = $this->withToken($guestToken)->postJson('/api/v1/register', [
            'name' => 'Registered Player', 'email' => 'upgrade@example.test',
            'password' => 'StrongPassword123', 'password_confirmation' => 'StrongPassword123',
        ]);
        $response->assertCreated()->assertJsonPath('user.name', 'Registered Player');
        $this->withToken($response->json('token'))->getJson('/api/v1/parties')->assertOk()->assertJsonPath('data.0.name', 'Saved progress');
        $this->withToken($guestToken)->getJson('/api/v1/guest/me')->assertUnauthorized();
        $this->assertDatabaseHas('party_players', ['party_id' => $party->json('data.id'), 'user_id' => $response->json('user.id'), 'guest_id' => null]);
    }

    public function test_teams_can_be_created_and_joined_by_authenticated_accounts(): void
    {
        [$ownerToken] = $this->account();
        $team = $this->withToken($ownerToken)->postJson('/api/v1/teams', ['name' => 'Friday crew']);
        $team->assertCreated()->assertJsonPath('data.name', 'Friday crew')->assertJsonCount(1, 'data.members');
        $code = $team->json('data.code');
        $member = User::factory()->create(['email' => 'member@example.test']);
        $this->actingAs($member);
        $memberToken = $this->postJson('/api/v1/login', ['email' => $member->email, 'password' => 'password'])->json('token');
        $this->withToken($memberToken)->postJson("/api/v1/teams/{$code}/join")->assertOk()->assertJsonCount(2, 'data.members');
    }

    public function test_api_tokens_are_stored_only_as_hashes(): void
    {
        [$token] = $this->account();
        $stored = DB::table('api_tokens')->first();
        $this->assertNotSame($token, $stored->token_hash);
        $this->assertSame(hash('sha256', $token), $stored->token_hash);
        $this->assertNotNull($stored->expires_at);
    }

    public function test_registration_rejects_weak_passwords(): void
    {
        $this->postJson('/api/v1/register', ['name' => 'Player', 'email' => 'weak@example.test', 'password' => 'password', 'password_confirmation' => 'password'])
            ->assertUnprocessable()->assertJsonValidationErrors('password');
    }
}
