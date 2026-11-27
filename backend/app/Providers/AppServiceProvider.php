<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Throttle per identity, not per IP: every player in a lobby polls the same
        // server behind the same proxy address, so an IP bucket throttles the whole party.
        RateLimiter::for('cc-player', function (Request $request) {
            $key = $request->bearerToken();

            return Limit::perMinute(240)->by($key ? hash('sha256', $key) : 'ip:'.$request->ip());
        });
    }
}
