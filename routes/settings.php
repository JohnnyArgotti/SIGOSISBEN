<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');

    // Página informativa para usuarios autenticados sin roles asignados,
    // o cuyos roles asignados están todos inactivos.
    // Redirige al home si el usuario ya tiene al menos un rol activo.
    Route::get('settings/sin-acceso', function () {
        $user = auth()->user();
        if ($user && $user->tieneAlgunRolActivo()) {
            return redirect('/home');
        }

        return inertia('settings/sin-acceso', [
            'autenticacion_ad' => (bool) ($user?->autenticacion_ad ?? false),
            'nombre' => trim(($user?->nombres ?? '') . ' ' . ($user?->apellidos ?? '')) ?: ($user?->nombre_usuario ?? ''),
        ]);
    })->name('sin-acceso');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('user-password.edit');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');
});
