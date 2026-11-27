<?php

use App\Http\Controllers\Api\ChanceClubController;
use App\Http\Controllers\Api\GuestIdentityController;
use App\Http\Controllers\Api\LobbyController;
use App\Http\Controllers\Api\WordleController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::middleware('throttle:30,1')->group(function () {
        Route::post('/register', [ChanceClubController::class, 'register']);
        Route::post('/login', [ChanceClubController::class, 'login']);
        Route::post('/guest', [GuestIdentityController::class, 'create']);
    });

    // Session + teams answer for guests too: no screen may require an account.
    Route::middleware(['cc.player', 'throttle:120,1'])->group(function () {
        Route::get('/me', [ChanceClubController::class, 'me']);
        Route::patch('/me', [ChanceClubController::class, 'updateMe']);
        Route::post('/logout', [ChanceClubController::class, 'logout']);
        Route::get('/teams', [ChanceClubController::class, 'teams']);
        Route::post('/teams', [ChanceClubController::class, 'createTeam']);
        Route::post('/teams/{code}/join', [ChanceClubController::class, 'joinTeam']);
    });

    Route::middleware(['cc.player', 'throttle:60,1'])->group(function () {
        Route::get('/guest/me', [GuestIdentityController::class, 'me']);
        Route::post('/guest/logout', [GuestIdentityController::class, 'logout']);
        Route::get('/parties', [LobbyController::class, 'index']);
        Route::post('/parties', [LobbyController::class, 'create']);
        Route::get('/parties/{code}', [LobbyController::class, 'show']);
        Route::post('/parties/{code}/join', [LobbyController::class, 'join']);
        Route::post('/parties/{code}/ready', [LobbyController::class, 'ready']);
        Route::post('/parties/{code}/start', [LobbyController::class, 'start']);
        Route::post('/parties/{code}/action', [LobbyController::class, 'action']);
        Route::post('/parties/{code}/advance', [LobbyController::class, 'advance']);
        Route::post('/wordle/solo', [WordleController::class, 'start']);
        Route::get('/wordle/solo/{id}', [WordleController::class, 'show']);
        Route::post('/wordle/solo/{id}/guess', [WordleController::class, 'guess']);
    });

    Route::middleware('throttle:30,1')->group(function () {
        Route::get('/teams/{code}', [ChanceClubController::class, 'showTeam']);
    });
});
