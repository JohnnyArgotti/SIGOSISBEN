<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PasswordController extends Controller
{
    /**
     * Show the user's password settings page.
     *
     * Los usuarios de Active Directory no tienen contraseña local que cambiar,
     * así que se les devuelve a su perfil, donde se explica que sus datos y su
     * credencial se administran desde el directorio institucional.
     */
    public function edit(Request $request): Response|RedirectResponse
    {
        if ($request->user()->autenticacion_ad) {
            return to_route('profile.edit');
        }

        return Inertia::render('settings/password');
    }

    /**
     * Update the user's password.
     */
    public function update(PasswordUpdateRequest $request): RedirectResponse
    {
        $request->user()->update([
            'contrasena' => $request->password,
        ]);

        return back();
    }
}
