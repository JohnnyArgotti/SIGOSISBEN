<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Models\PuntoAtencion;
use App\Models\Evento;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        // Cargar relaciones si el usuario existe
        if ($user) {
            $user->load(['roles']);
        }

        return [
            ...parent::share($request),

            'name' => config('app.name'),

            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'nombres' => $user->nombres,
                    'apellidos' => $user->apellidos,
                    'nombre_usuario' => $user->nombre_usuario,
                    'correo' => $user->correo,
                    'telefono' => $user->telefono,
                    'estado' => $user->estado,

                    // Permite a la interfaz presentar en solo lectura los datos
                    // cuya fuente de verdad es el Directorio Activo.
                    'autenticacion_ad' => (bool) $user->autenticacion_ad,

                    'roles' => $user->roles ? $user->roles->where('estado', true)->values()->map(function ($role) {
                        return [
                            'id' => $role->id,
                            'name' => $role->name,
                        ];
                    }) : [],
                    'permissions' => $user->getAllPermissions() ? $user->getAllPermissions()->pluck('name') : [],
                ] : null,
            ],

            'sidebarOpen' =>
                ! $request->hasCookie('sidebar_state') ||
                $request->cookie('sidebar_state') === 'true',

            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],

            'puntoAtencion' => function () use ($request) {
                $puntoId = $request->session()->get('punto_atencion_id');
                if (!$puntoId) {
                    return null;
                }

                $punto = PuntoAtencion::find($puntoId);

                return $punto ? [
                    'id' => $punto->id,
                    'nombre' => $punto->nombre,
                ] : null;
            },

            'eventoActivo' => function () use ($request) {
                $eventoId = $request->session()->get('evento_id');
                if (!$eventoId) {
                    return null;
                }

                $evento = Evento::find($eventoId);

                return $evento ? [
                    'id'       => $evento->id,
                    'nombre'   => $evento->nombre,
                    'fecha'    => $evento->fecha?->format('Y-m-d'),
                    'hora_fin' => $evento->hora_fin,
                ] : null;
            },
        ];
    }
}