<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('parties', function (Blueprint $table) {
            // Epoch milliseconds when the next round starts by itself; null while nothing is counting down.
            $table->unsignedBigInteger('auto_next_at')->nullable();
            // builtin | mix | only: whether host-written prompts are used.
            $table->string('content_mode', 8)->default('builtin');
        });

        Schema::create('party_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('party_id')->constrained('parties')->cascadeOnDelete();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('guest_id')->nullable();
            $table->string('display_name', 80);
            $table->string('avatar_preset', 40)->nullable();
            $table->unsignedBigInteger('claim_player_id')->nullable();
            $table->string('status', 10)->default('pending'); // pending | approved | denied
            $table->timestamps();
            $table->index(['party_id', 'status']);
        });

        Schema::create('party_prompts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('party_id')->constrained('parties')->cascadeOnDelete();
            $table->string('game', 20);
            $table->string('prompt', 200);
            $table->string('answer', 200)->nullable();
            $table->timestamps();
            $table->index(['party_id', 'game']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('party_prompts');
        Schema::dropIfExists('party_requests');
        Schema::table('parties', function (Blueprint $table) {
            $table->dropColumn(['auto_next_at', 'content_mode']);
        });
    }
};
