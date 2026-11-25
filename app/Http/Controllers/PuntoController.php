<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\PuntoAtencion;
use App\Models\Evento;
use App\Http\Controllers\Auth\AuthController;

class PuntoController extends Controller
{
    public function guardarSeleccion(Request $request)
    {
        $request->validate([
            'tipo'       => 'required|in:punto,evento',
            'seleccion_id' => 'required|integer',
        ]);

        $user = Auth::user();

        if ($request->tipo === 'evento') {
            $request->validate([
                'seleccion_id' => 'exists:evento,id',
            ]);

            // No basta con que el evento exista: solo se puede trabajar sobre un
            // evento que se esté ejecutando en este momento. Uno programado para
            // más adelante (o ya finalizado, cancelado o inactivo) se rechaza,
            // aunque llegue por una petición armada a mano.
            $evento = Evento::find($request->seleccion_id);

            if (! $evento?->estaEnCurso()) {
                return redirect('/login')->with(
                    'error',
                    'El evento seleccionado no está en curso. Solo puedes ingresar a un evento entre su hora de inicio y su hora de fin.'
                );
            }

            session()->forget('punto_atencion_id');
            session(['evento_id' => $evento->id]);
        } else {
            $request->validate([
                'seleccion_id' => 'exists:punto_atencion,id',
            ]);
            session()->forget('evento_id');
            session(['punto_atencion_id' => $request->seleccion_id]);
        }

        $ruta = app(AuthController::class)->getHomeRoute($user);

        if ($ruta === null) {
            // Sin permisos válidos: limpiar ubicación
            session()->forget('punto_atencion_id');
            session()->forget('evento_id');

            // Si es porque no tiene ningún rol activo, mostrar la página
            // informativa en lugar del error genérico.
            if (! $user->tieneAlgunRolActivo()) {
                return redirect('/settings/sin-acceso');
            }

            return redirect('/login')->with('error', 'Tu usuario no tiene permisos configurados. Contacta al administrador.');
        }

        return redirect()->to($ruta);
    }
}

