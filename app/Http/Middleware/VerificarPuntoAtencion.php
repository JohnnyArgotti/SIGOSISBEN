<?php

namespace App\Http\Middleware;

use Closure;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Evento;

class VerificarPuntoAtencion
{
    public function handle(Request $request, Closure $next)
    {
        if (!session()->has('punto_atencion_id') && !session()->has('evento_id')) {
            return redirect('/login')->with('error', 'Seleccionar un punto de atención o evento para continuar.');
        }

        // La sesión solo es válida mientras el evento siga en curso: si lo
        // desactivaron, lo cancelaron, ya terminó o le cambiaron la programación
        // a una franja que todavía no empieza, se cierra la sesión.
        if (session()->has('evento_id')) {
            $evento = Evento::find(session('evento_id'));

            if (!$evento || !$evento->estado || $evento->estado_evento === 'cancelado') {
                $this->cerrarSesion($request);
                return redirect('/login')->with('error', 'El evento fue desactivado. Tu sesión ha sido cerrada.');
            }

            if (!$evento->estaEnCurso()) {
                $this->cerrarSesion($request);

                return redirect('/login')->with(
                    'error',
                    $evento->yaFinalizo()
                        ? 'El evento ha finalizado. Tu sesión ha sido cerrada.'
                        : 'El evento aún no ha iniciado. Tu sesión ha sido cerrada.'
                );
            }
        }

        return $next($request);
    }

    private function cerrarSesion(Request $request): void
    {
        Auth::logout();
        $request->session()->forget('punto_atencion_id');
        $request->session()->forget('evento_id');
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
