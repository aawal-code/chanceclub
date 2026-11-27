<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tournaments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('party_id')->constrained('parties')->cascadeOnDelete();
            $table->string('status', 10)->default('active'); // active | done | canceled
            $table->unsignedSmallInteger('total_games');
            $table->unsignedSmallInteger('current_index')->default(0);
            $table->text('lineup');
            $table->text('points');
            $table->timestamps();
            $table->index(['party_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournaments');
    }
};
