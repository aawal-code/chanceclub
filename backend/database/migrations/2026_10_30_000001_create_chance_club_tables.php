<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('preferred_language', 5)->default('en');
            $table->string('theme', 10)->default('light');
        });

        Schema::create('api_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->char('token_hash', 64)->unique();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 80);
            $table->string('invite_code', 12)->unique();
            $table->timestamps();
        });

        Schema::create('team_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('display_name', 60);
            $table->string('role', 12)->default('member');
            $table->timestamps();
            $table->unique(['team_id', 'user_id']);
        });

        Schema::create('parties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 80);
            $table->string('invite_code', 12)->unique();
            $table->string('current_game', 40)->nullable();
            $table->json('state')->nullable();
            $table->string('status', 16)->default('active');
            $table->timestamps();
        });

        Schema::create('party_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('party_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('display_name', 60);
            $table->timestamps();
            $table->index(['party_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('party_players');
        Schema::dropIfExists('parties');
        Schema::dropIfExists('team_members');
        Schema::dropIfExists('teams');
        Schema::dropIfExists('api_tokens');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['preferred_language', 'theme']);
        });
    }
};
