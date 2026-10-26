<?php

use App\Http\Controllers\Install\InstallerController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| First-run setup wizard
|--------------------------------------------------------------------------
|
| Loaded with the minimal `install` middleware group (session + CSRF, no
| application stack, so it works before the database is configured). Every
| step except the completion page is gated by `not.installed`.
|
*/

Route::middleware(['not.installed', 'throttle:20,1'])->group(function () {
    Route::get('/install', [InstallerController::class, 'index'])->name('install.index');
    Route::get('/install/{step}', [InstallerController::class, 'show'])
        ->whereIn('step', InstallerController::STEPS)->name('install.show');
    Route::post('/install/{step}', [InstallerController::class, 'store'])
        ->whereIn('step', InstallerController::STEPS)->name('install.store');
});

Route::get('/install/complete', [InstallerController::class, 'complete'])->name('install.complete');
