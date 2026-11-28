<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('api_tokens', function (Blueprint $table) {
            $table->char('refresh_hash', 64)->nullable()->unique();
            $table->timestamp('refresh_expires_at')->nullable();
        });
        // Existing sessions get a refresh window so nobody is signed out by this deploy.
        DB::table('api_tokens')->whereNull('refresh_hash')->update(['expires_at' => now()->addDays(2)]);
        // Theme: null means "never chosen", so a new device never overwrites a real choice with its default.
        DB::statement('ALTER TABLE users ALTER COLUMN theme DROP NOT NULL');
        DB::statement('ALTER TABLE users ALTER COLUMN theme DROP DEFAULT');
        DB::table('users')->where('theme', 'light')->update(['theme' => null]);
    }

    public function down(): void
    {
        Schema::table('api_tokens', function (Blueprint $table) {
            $table->dropColumn(['refresh_hash', 'refresh_expires_at']);
        });
    }
};
