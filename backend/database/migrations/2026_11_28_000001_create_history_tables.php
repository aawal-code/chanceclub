<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete();
            $table->string('party_name', 80)->nullable();
            $table->string('mode', 8)->default('party'); // party | solo
            $table->string('game', 40);
            $table->unsignedInteger('round_number')->nullable();
            $table->unsignedSmallInteger('seq')->default(0);
            $table->unsignedSmallInteger('rounds')->default(1);
            $table->timestamp('finished_at');
            $table->timestamps();
            $table->unique(['party_id', 'round_number', 'seq'], 'matches_party_round_seq');
            $table->index(['game', 'finished_at']);
            $table->index('finished_at');
        });

        Schema::create('match_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->unsignedBigInteger('party_id')->nullable();
            $table->string('game', 40);
            $table->string('player_key', 24); // u12 (account) or g34 (guest)
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('guest_id')->nullable();
            $table->string('display_name', 80);
            $table->integer('score')->default(0);
            $table->unsignedSmallInteger('place')->nullable();
            $table->boolean('is_winner')->default(false);
            $table->timestamp('finished_at');
            $table->index(['player_key', 'finished_at']);
            $table->index(['party_id', 'finished_at']);
            $table->index(['game', 'is_winner']);
            $table->index('guest_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_results');
        Schema::dropIfExists('matches');
    }
};
