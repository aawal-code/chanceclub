<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('guest_identities', function (Blueprint $table) {
            $table->id();
            $table->string('display_name', 60);
            $table->char('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
        });

        Schema::table('parties', function (Blueprint $table) {
            $table->foreignId('owner_id')->nullable()->change();
            $table->unsignedInteger('round_number')->default(0);
        });

        Schema::table('party_players', function (Blueprint $table) {
            $table->foreignId('guest_id')->nullable()->after('user_id')->constrained('guest_identities')->nullOnDelete();
            $table->boolean('is_ready')->default(false);
            $table->unsignedInteger('score')->default(0);
            $table->timestamp('last_seen_at')->nullable();
            $table->unique(['party_id', 'user_id'], 'party_player_user_once');
            $table->unique(['party_id', 'guest_id'], 'party_player_guest_once');
        });

        Schema::table('parties', function (Blueprint $table) {
            $table->foreignId('host_player_id')->nullable()->after('owner_id')->constrained('party_players')->nullOnDelete();
        });

        Schema::create('party_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('party_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('round_number');
            $table->string('game', 40);
            $table->string('locale', 5)->default('en');
            $table->string('prompt', 240);
            $table->string('answer', 240)->nullable();
            $table->json('outcome')->nullable();
            $table->string('status', 16)->default('active');
            $table->foreignId('turn_player_id')->nullable()->constrained('party_players')->nullOnDelete();
            $table->timestamps();
            $table->unique(['party_id', 'round_number']);
        });

        Schema::create('party_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('round_id')->constrained('party_rounds')->cascadeOnDelete();
            $table->foreignId('player_id')->constrained('party_players')->cascadeOnDelete();
            $table->json('payload');
            $table->timestamps();
            $table->unique(['round_id', 'player_id']);
        });

        Schema::create('party_round_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('round_id')->constrained('party_rounds')->cascadeOnDelete();
            $table->foreignId('player_id')->constrained('party_players')->cascadeOnDelete();
            $table->foreignId('awarded_by')->constrained('party_players')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['round_id', 'player_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('party_round_scores');
        Schema::dropIfExists('party_submissions');
        Schema::dropIfExists('party_rounds');
        Schema::table('parties', function (Blueprint $table) {
            $table->dropConstrainedForeignId('host_player_id');
            $table->dropColumn('round_number');
        });
        Schema::table('party_players', function (Blueprint $table) {
            $table->dropUnique('party_player_user_once');
            $table->dropUnique('party_player_guest_once');
            $table->dropConstrainedForeignId('guest_id');
            $table->dropColumn(['is_ready', 'score', 'last_seen_at']);
        });
        Schema::table('parties', function (Blueprint $table) {
            $table->foreignId('owner_id')->nullable(false)->change();
        });
        Schema::dropIfExists('guest_identities');
    }
};
