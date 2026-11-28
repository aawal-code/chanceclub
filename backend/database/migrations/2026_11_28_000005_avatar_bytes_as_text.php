<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Postgres bytea over PDO truncated the picture at the first null byte, so a stored
 * WebP came back as a 6 byte header. Base64 in a text column is boring and always
 * round-trips exactly; the 200 KB cap keeps the size sane.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('user_avatars', function (Blueprint $table) {
            $table->text('data')->nullable();
        });
        // Anything already stored was cut at a null byte and cannot be repaired.
        Schema::table('user_avatars', function (Blueprint $table) {
            $table->dropColumn('bytes');
        });
    }

    public function down(): void
    {
        Schema::table('user_avatars', function (Blueprint $table) {
            $table->binary('bytes')->nullable();
            $table->dropColumn('data');
        });
    }
};
