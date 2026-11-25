<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckSessionInactivity
{
    /**
     * Minutos de inactividad permitidos antes de cerrar sesión.
     * Red de seguridad del servidor: ligeramente mayor que el frontend (10 min)
     * para dar margen y evitar que el middleware mate la sesión antes de que
     * el frontend pueda advertir al usuario.
     */
    private const INACTIVITY_MINUTES = 11;

    /**
     * Rutas que el navegador dispara solo (polling y heartbeats), sin que el
     * usuario haga nada. Se les sigue aplicando el corte por inactividad, pero
     * NO renuevan el contador: si no lo excluyéramos, dejar abierta una pantalla
     * con polling mantendría la sesión viva indefinidamente y el cierre
     * automático nunca se dispararía.
     *
     * La actividad real del usuario la reporta el frontend con POST /keep-alive
     * (ver resources/js/hooks/useInactivityLogout.ts).
     */
    private const RUTAS_SIN_ACTIVIDAD = [
        'gestion_campo.reservadas',
        'gestion_campo.heartbeat',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $lastActivity = session('last_activity_time');

            if ($lastActivity !== null) {
                $inactiveSeconds = time() - $lastActivity;

                if ($inactiveSeconds > self::INACTIVITY_MINUTES * 60) {
                    Auth::logout();
                    $request->session()->forget('punto_atencion_id');
                    $request->session()->forget('evento_id');
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();

                    if ($request->expectsJson()) {
                        return response()->json(['message' => 'Sesión expirada por inactividad.'], 401);
                    }

                    return redirect('/login')->with('error', 'Tu sesión fue cerrada por inactividad.');
                }
            }

            if (! $request->routeIs(...self::RUTAS_SIN_ACTIVIDAD)) {
                session(['last_activity_time' => time()]);
            }
        }

        return $next($request);
    }
}
