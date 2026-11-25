<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Evento;
use App\Models\PuntoAtencion;
use App\Services\Auth\LoginService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AuthController extends Controller
{
    private function getPuntosYEventos(): array
    {
        return [
            'puntos' => PuntoAtencion::where('estado', true)
                ->select('id', 'nombre')
                ->orderBy('id')
                ->get(),

            // Solo los eventos que se están ejecutando ahora mismo: uno
            // programado para más adelante no se puede seleccionar todavía.
            'eventos' => Evento::enCurso()
                ->select('id', 'nombre')
                ->orderBy('id')
                ->get(),
        ];
    }

    public function showLogin()
    {
        if (Auth::check()) {
            // Si ya tiene punto o evento seleccionado, intentar ir al sistema
            if (session()->has('punto_atencion_id') || session()->has('evento_id')) {
                $route = $this->getHomeRoute(Auth::user());

                if ($route !== null) {
                    return redirect($route);
                }

                // Sin permisos válidos: limpiar ubicación
                session()->forget('punto_atencion_id');
                session()->forget('evento_id');

                // Si es porque no tiene ningún rol activo, mostrar la página
                // informativa en lugar del error genérico.
                if (! Auth::user()->tieneAlgunRolActivo()) {
                    return redirect('/settings/sin-acceso');
                }

                return Inertia::render('auth/login', [
                    ...$this->getPuntosYEventos(),
                    'showModal' => true,
                    'flash' => ['error' => 'Tu usuario no tiene permisos configurados. Contacta al administrador.'],
                ]);
            }

            // Si NO tiene ubicación mostrar modal
            return Inertia::render('auth/login', [
                ...$this->getPuntosYEventos(),
                'showModal' => true,
            ]);
        }

        return Inertia::render('auth/login', $this->getPuntosYEventos());
    }

    public function login(Request $request, LoginService $loginService)
    {
        $credentials = $request->validate([
            'nombre_usuario' => 'required|string',
            'password' => 'required|string',
        ]);

        // Toda la lógica de autenticación híbrida (Local + Active Directory),
        // el rate limit por IP + usuario, la provisión, la sincronización y la
        // administración del Super Administrador están encapsuladas en el
        // LoginService. El controlador permanece delgado y desacoplado del
        // proveedor de autenticación.
        $user = $loginService->authenticate(
            $credentials['nombre_usuario'],
            $credentials['password'],
            (string) $request->ip(),
        );

        Auth::login($user);
        $request->session()->regenerate();

        // Si el usuario no tiene ningún rol asignado, o los que tiene están
        // todos inactivos, lo redirigimos a una página informativa en lugar
        // de mostrarlo en el flujo normal.
        if (! $user->tieneAlgunRolActivo()) {
            return redirect('/settings/sin-acceso');
        }

        return Inertia::render('auth/login', [
            ...$this->getPuntosYEventos(),
            'showModal' => true,
        ]);
    }

    public function getHomeRoute($user): ?string
    {
        // Primero se intenta con el permiso de "Ver" de cada módulo (da acceso al
        // listado). Si el usuario no tiene "Ver" pero sí "Crear" de ese mismo
        // módulo, se le lleva directo al formulario de creación: de lo contrario
        // se quedaría sin ninguna ruta válida y el login le mostraría el error de
        // "no tiene permisos configurados" aunque sí tenga un permiso asignado.
        if ($user->can('Ver usuarios')) {
            return '/gestion_usuarios';
        }
        if ($user->can('Crear usuarios')) {
            return '/gestion_usuarios/create';
        }

        if ($user->can('Ver solicitudes') || $user->can('Ver atenciones')) {
            return '/gestion_solicitudes';
        }
        if ($user->can('Crear solicitudes') || $user->can('Crear atenciones')) {
            return '/gestion_solicitudes/create';
        }

        if ($user->can('Ver eventos')) {
            return '/gestion_eventos';
        }
        if ($user->can('Crear eventos')) {
            return '/gestion_eventos/create';
        }

        if ($user->can('Ver solicitudes en campo')) {
            return '/gestion_campo';
        }
        if ($user->can('Ver paquetes')) {
            return '/gestion_campo/package';
        }
        if ($user->can('Crear paquetes')) {
            return '/gestion_campo/create';
        }

        if ($user->can('Ver encuestadores')) {
            return '/gestion_encuestadores';
        }
        if ($user->can('Crear encuestadores')) {
            return '/gestion_encuestadores/create';
        }

        if ($user->can('Ver solicitudes en calidad')) {
            return '/gestion_calidad';
        }

        if ($user->can('Ver reportes')) {
            return '/gestion_reportes';
        }

        if ($user->can('Ver auditoría')) {
            return '/gestion_auditoria';
        }

        if ($user->can('Ver roles')) {
            return '/gestion_roles';
        }
        if ($user->can('Crear roles')) {
            return '/gestion_roles/create';
        }

        if ($user->can('Ver puntos de atención')) {
            return '/gestion_puntos';
        }
        if ($user->can('Crear puntos de atención')) {
            return '/gestion_puntos/create';
        }

        if ($user->can('Ver documentos públicos')) {
            return '/gestion_documentos_publicos';
        }
        if ($user->can('Crear documentos públicos')) {
            return '/gestion_documentos_publicos/create';
        }

        return null;
    }

    public function logout(Request $request)
    {
        // Liberar solicitudes reservadas ANTES de destruir la sesión,
        // ya que después auth()->id() devuelve null.
        if ($userId = auth()->id()) {
            DB::table('solicitud')
                ->where('reservada_por', $userId)
                ->update(['reservada_por' => null, 'reservada_en' => null]);
        }

        Auth::logout();

        $request->session()->forget('punto_atencion_id');
        $request->session()->forget('evento_id');

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
