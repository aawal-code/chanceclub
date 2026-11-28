<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_preset', 24)->nullable();
            $table->unsignedInteger('avatar_version')->default(0);
        });

        Schema::table('guest_identities', function (Blueprint $table) {
            $table->string('avatar_preset', 24)->nullable();
        });

        // Snapshot on the player row so a party roster never needs a join to render faces.
        Schema::table('party_players', function (Blueprint $table) {
            $table->string('avatar_preset', 24)->nullable();
            $table->unsignedInteger('avatar_version')->default(0);
        });

        Schema::create('user_avatars', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->string('mime', 40);
            $table->binary('bytes');
            $table->unsignedInteger('byte_size');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_avatars');
        Schema::table('party_players', function (Blueprint $table) {
            $table->dropColumn(['avatar_preset', 'avatar_version']);
        });
        Schema::table('guest_identities', function (Blueprint $table) {
            $table->dropColumn('avatar_preset');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['avatar_preset', 'avatar_version']);
        });
    }
};
