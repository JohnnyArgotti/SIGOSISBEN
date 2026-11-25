<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Evento;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class VerificarEventoActivo
{
    public function handle(Request $request, Closure $next)
    {
        if (!session()->has('evento_id')) {
            return $next($request);
        }

        $evento = Evento::find(session('evento_id'));

        if (!$evento || !$evento->fecha || !$evento->hora_fin) {
            return $next($request);
        }

        $fin = Carbon::parse($evento->fecha)
            ->setTimeFromTimeString($evento->hora_fin);

        if (now()->greaterThanOrEqualTo($fin)) {

            Auth::logout();

            $request->session()->forget('evento_id');
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect('/login')
                ->with('error', 'El evento ha finalizado.');
        }

        return $next($request);
    }
}