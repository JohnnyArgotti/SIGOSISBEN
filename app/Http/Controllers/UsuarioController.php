<?php

namespace App\Http\Controllers;

use App\Concerns\PasswordValidationRules;
use App\Exports\UsuariosExport;
use App\Models\TipoDocumento;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;
use Spatie\Permission\Models\Role;

class UsuarioController extends Controller
{
    use PasswordValidationRules;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->get('search');

        $query = User::query()
            ->leftJoin('tipo_documento as td', 'usuario.tipo_documento_id', '=', 'td.id')
            ->with('roles:id,name')
            ->select(
                'usuario.id',
                'usuario.nombres',
                'usuario.apellidos',
                'usuario.nombre_usuario',
                'usuario.num_documento',
                'usuario.telefono',
                'usuario.correo',
                'usuario.estado',
                'usuario.autenticacion_ad',
                'usuario.creado_el',
                'usuario.actualizado_el',
                'td.nombre as tipo_documento',
            )
            ->when(! auth()->user()->can('Ver administradores'), function ($q) {
                $q->whereDoesntHave('roles', function ($r) {
                    $r->where('name', 'Administrador');
                });
            })
            ->orderByDesc('usuario.creado_el')
            ->orderByDesc('usuario.id');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('usuario.num_documento', 'like', "%{$search}%")
                    ->orWhere('usuario.nombre_usuario', 'like', "%{$search}%");
            });
        }

        $usuarios = $query->paginate(10)->through(function ($u) {
            $nombresRoles = $u->roles->pluck('name');
            $u->unsetRelation('roles');
            $u->roles = $nombresRoles;
            $u->autenticacion_ad = (bool) $u->autenticacion_ad;
            $u->tipo_autenticacion = $u->autenticacion_ad ? 'Directorio Activo' : 'Local';
            $u->es_admin = $u->roles->contains('Administrador');
            $u->configuracion = $this->calcularConfiguracion((bool) $u->estado, $u->roles->count() > 0);

            return $u;
        });

        return Inertia::render('gestion_usuarios/index', [
            'usuarios' => $usuarios,
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $rolesQuery = Role::select('id', 'name')->orderBy('id');

        if (! auth()->user()->can('Crear administradores')) {
            $rolesQuery->where('name', '!=', 'Administrador');
        }

        return Inertia::render('gestion_usuarios/create', [
            'tiposDocumento' => TipoDocumento::where('estado', true)
                ->select('id', 'nombre', 'codigo')
                ->get(),
            'roles' => $rolesQuery->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'tipo_documento_id' => 'required|exists:tipo_documento,id',
            'num_documento' => 'required|string|unique:usuario,num_documento',
            'nombres' => 'required|string|max:100',
            'apellidos' => 'required|string|max:100',
            'nombre_usuario' => 'required|string|max:60|unique:usuario,nombre_usuario',
            'correo' => 'required|email|unique:usuario,correo',
            'contrasena' => $this->passwordRules(),
            'telefono' => 'nullable|string|max:20',
            'estado' => 'boolean',
            'roles' => 'array',
            'roles.*' => 'exists:roles,name',
        ], $this->passwordMessages('contrasena'));

        // Protección server-side: solo quien tiene 'Crear administradores'
        // puede asignar el rol Administrador, aunque el payload sea manipulado.
        if (in_array('Administrador', $validated['roles'] ?? []) && ! auth()->user()->can('Crear administradores')) {
            abort(403, 'No tienes permiso para asignar el rol Administrador.');
        }

        $usuario = User::create([
            'tipo_documento_id' => $validated['tipo_documento_id'],
            'num_documento' => $validated['num_documento'],
            'nombres' => $validated['nombres'],
            'apellidos' => $validated['apellidos'],
            'nombre_usuario' => $validated['nombre_usuario'],
            'correo' => $validated['correo'],
            'contrasena' => Hash::make($validated['contrasena']),
            'telefono' => $validated['telefono'] ?? null,
            'estado' => $validated['estado'] ?? true,
        ]);

        if (! empty($validated['roles'])) {
            $usuario->syncRoles($validated['roles']);
        }

        return redirect()->route('gestion_usuarios.index')
            ->with('success', 'Usuario creado exitosamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $usuario = User::query()
            ->leftJoin('tipo_documento as td', 'usuario.tipo_documento_id', '=', 'td.id')
            ->select(
                'usuario.id',
                'usuario.nombres',
                'usuario.apellidos',
                'usuario.nombre_usuario',
                'usuario.num_documento',
                'usuario.telefono',
                'usuario.correo',
                'usuario.estado',
                'usuario.autenticacion_ad',
                'usuario.ad_guid',
                'usuario.creado_el',
                'usuario.actualizado_el',
                'td.nombre as tipo_documento'
            )
            ->where('usuario.id', $id)
            ->firstOrFail();

        $userModel = User::findOrFail($id);

        $usuario->roles = $userModel->getRoleNames();
        $usuario->permisos = $userModel->getPermissionNames();
        $usuario->autenticacion_ad = (bool) $usuario->autenticacion_ad;
        $usuario->tipo_autenticacion = $usuario->autenticacion_ad ? 'Directorio Activo' : 'Local';
        $usuario->es_admin = $usuario->roles->contains('Administrador');
        $usuario->configuracion = $this->calcularConfiguracion((bool) $usuario->estado, $usuario->roles->count() > 0);

        return Inertia::render('gestion_usuarios/show', [
            'usuario' => $usuario,
        ]);
    }

    /**
     * Estado de configuración calculado dinámicamente (no se persiste).
     * Solo dos valores: 'completa' (activo con roles) o 'incompleta' (cualquier otro caso).
     */
    private function calcularConfiguracion(bool $estado, bool $tieneRoles): string
    {
        return ($estado && $tieneRoles) ? 'completa' : 'incompleta';
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(User $gestion_usuario)
    {
        // Protección server-side: editar un administrador requiere el permiso
        // específico, independientemente de la UI. Se suma al 'Editar usuarios'
        // que ya exige la ruta, igual que en toggle() con 'Inactivar administradores'.
        if ($gestion_usuario->hasRole('Administrador') && ! auth()->user()->can('Editar administradores')) {
            abort(403, 'No tienes permiso para editar un administrador.');
        }

        return Inertia::render('gestion_usuarios/edit', [
            'usuario' => [
                'id' => $gestion_usuario->id,
                'autenticacion_ad' => (bool) $gestion_usuario->autenticacion_ad,
                'tipo_documento_id' => $gestion_usuario->tipo_documento_id,
                'num_documento' => $gestion_usuario->num_documento,
                'nombres' => $gestion_usuario->nombres,
                'apellidos' => $gestion_usuario->apellidos,
                'nombre_usuario' => $gestion_usuario->nombre_usuario,
                'correo' => $gestion_usuario->correo,
                'telefono' => $gestion_usuario->telefono,
                'estado' => $gestion_usuario->estado,
                'roles' => $gestion_usuario->getRoleNames(),
            ],
            'tiposDocumento' => TipoDocumento::where('estado', true)
                ->select('id', 'nombre', 'codigo')
                ->get(),
            'roles' => Role::select('id', 'name')->where('name', '!=', 'Administrador')->orderBy('id')->get(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $gestion_usuario)
    {
        // Protección server-side: editar un administrador requiere el permiso
        // específico, independientemente de la UI. Se suma al 'Editar usuarios'
        // que ya exige la ruta, igual que en toggle() con 'Inactivar administradores'.
        // Aplica tanto a administradores locales como de Directorio Activo.
        if ($gestion_usuario->hasRole('Administrador') && ! auth()->user()->can('Editar administradores')) {
            abort(403, 'No tienes permiso para editar un administrador.');
        }

        // Usuarios de Active Directory: solo se permite actualizar los roles.
        // Su información personal es administrada exclusivamente por AD.
        if ($gestion_usuario->autenticacion_ad) {
            $rolAdmin = (string) config('sigo.active_directory.admin_role', 'Administrador');

            $validated = $request->validate([
                'roles' => 'array',
                'roles.*' => 'exists:roles,name',
            ]);

            $rolesSolicitados = array_values(array_filter(
                $validated['roles'] ?? [],
                fn ($r) => $r !== $rolAdmin,
            ));

            if ($gestion_usuario->hasRole($rolAdmin)) {
                $rolesSolicitados[] = $rolAdmin;
            }

            $gestion_usuario->syncRoles($rolesSolicitados);

            return redirect()->route('gestion_usuarios.index')
                ->with('success', 'Roles actualizados correctamente.');
        }

        $validated = $request->validate([
            'tipo_documento_id' => 'required|exists:tipo_documento,id',
            'num_documento' => 'required|string|unique:usuario,num_documento,'.$gestion_usuario->id,
            'nombres' => 'required|string|max:100',
            'apellidos' => 'required|string|max:100',
            'nombre_usuario' => 'required|string|max:60|unique:usuario,nombre_usuario,'.$gestion_usuario->id,
            'correo' => 'required|email|unique:usuario,correo,'.$gestion_usuario->id,
            'telefono' => 'nullable|string|max:20',
            'estado' => 'boolean',
            'roles' => 'array',
            'roles.*' => 'exists:roles,name',
        ]);

        $gestion_usuario->update([
            'tipo_documento_id' => $validated['tipo_documento_id'],
            'num_documento' => $validated['num_documento'],
            'nombres' => $validated['nombres'],
            'apellidos' => $validated['apellidos'],
            'nombre_usuario' => $validated['nombre_usuario'],
            'correo' => $validated['correo'],
            'telefono' => $validated['telefono'] ?? null,
            'estado' => $validated['estado'] ?? $gestion_usuario->estado,
        ]);

        if (isset($validated['roles'])) {
            $gestion_usuario->syncRoles($validated['roles']);
        }

        return redirect()->route('gestion_usuarios.index')
            ->with('success', 'Usuario actualizado correctamente.');
    }

    /**
     * Formulario de asignación de roles (usado por usuarios de Active Directory).
     * La información personal no es editable; solo se gestionan los roles.
     */
    public function editRoles(User $gestion_usuario)
    {
        $rolAdmin = (string) config('sigo.active_directory.admin_role', 'Administrador');

        return Inertia::render('gestion_usuarios/asignar-roles', [
            'usuario' => [
                'id' => $gestion_usuario->id,
                'nombres' => $gestion_usuario->nombres,
                'apellidos' => $gestion_usuario->apellidos,
                'nombre_usuario' => $gestion_usuario->nombre_usuario,
                'correo' => $gestion_usuario->correo,
                'estado' => (bool) $gestion_usuario->estado,
                'autenticacion_ad' => (bool) $gestion_usuario->autenticacion_ad,
                'roles' => $gestion_usuario->getRoleNames(),
            ],
            // El rol de administrador lo gobierna AD: no se ofrece para asignación manual.
            'roles' => Role::select('id', 'name')
                ->whereNotIn('name', [$rolAdmin])
                ->orderBy('name')
                ->get(),
        ]);
    }

    /**
     * Actualiza únicamente los roles del usuario, reutilizando el flujo
     * existente de Spatie Permission (syncRoles). No se crea lógica paralela.
     */
    public function updateRoles(Request $request, User $gestion_usuario)
    {
        $rolAdmin = (string) config('sigo.active_directory.admin_role', 'Administrador');

        $validated = $request->validate([
            'roles' => 'array',
            'roles.*' => 'exists:roles,name',
        ]);

        $rolesSolicitados = $validated['roles'] ?? [];

        // El rol de administrador es administrado exclusivamente por Active
        // Directory; se preserva su estado actual y no se permite asignarlo
        // ni removerlo manualmente.
        $teniaRolAdmin = $gestion_usuario->hasRole($rolAdmin);
        $rolesSolicitados = array_values(array_filter(
            $rolesSolicitados,
            fn ($r) => $r !== $rolAdmin,
        ));

        if ($teniaRolAdmin) {
            $rolesSolicitados[] = $rolAdmin;
        }

        $gestion_usuario->syncRoles($rolesSolicitados);

        return redirect()->route('gestion_usuarios.index')
            ->with('success', 'Roles actualizados correctamente.');
    }

    /**
     * Formulario para restablecer la contraseña de un usuario local.
     */
    public function showResetPassword(User $gestion_usuario)
    {
        abort_if($gestion_usuario->autenticacion_ad, 403, 'No es posible restablecer la contraseña de un usuario de Active Directory.');

        return Inertia::render('gestion_usuarios/reset-password', [
            'usuario' => [
                'id'             => $gestion_usuario->id,
                'nombres'        => $gestion_usuario->nombres,
                'apellidos'      => $gestion_usuario->apellidos,
                'nombre_usuario' => $gestion_usuario->nombre_usuario,
            ],
        ]);
    }

    /**
     * Aplica la nueva contraseña para un usuario local.
     */
    public function resetPassword(Request $request, User $gestion_usuario)
    {
        abort_if($gestion_usuario->autenticacion_ad, 403, 'No es posible restablecer la contraseña de un usuario de Active Directory.');

        $validated = $request->validate([
            'contrasena'              => $this->passwordRules(),
            'contrasena_confirmation' => 'required|string',
        ], $this->passwordMessages('contrasena'));

        $gestion_usuario->update([
            'contrasena' => Hash::make($validated['contrasena']),
        ]);

        return redirect()->route('gestion_usuarios.index')
            ->with('success', "Contraseña de {$gestion_usuario->nombres} restablecida correctamente.");
    }

    public function exportar(Request $request)
    {
        $tipo = $request->get('tipo', 'xlsx');
        $search = $request->get('search', '');

        $export = new UsuariosExport($search);

        if ($tipo === 'csv') {
            return Excel::download($export, 'usuarios.csv', \Maatwebsite\Excel\Excel::CSV);
        }

        return Excel::download($export, 'usuarios.xlsx');
    }

    public function toggle(User $gestion_usuario)
    {
        // Protección server-side: cambiar el estado de un administrador
        // requiere el permiso específico, independientemente de la UI.
        // Se suma al 'Inactivar usuarios' que ya exige la ruta.
        if ($gestion_usuario->hasRole('Administrador') && ! auth()->user()->can('Inactivar administradores')) {
            abort(403, 'No tienes permiso para cambiar el estado de un administrador.');
        }

        $nuevoEstado = ! $gestion_usuario->estado;

        $cambios = ['estado' => $nuevoEstado];

        // Reactivar es la vía de desbloqueo de una cuenta que se desactivó
        // sola por intentos fallidos, así que el contador debe quedar en cero.
        // Si se arrastrara, un único fallo posterior dentro de la ventana de
        // reintentos volvería a desactivarla de inmediato y el desbloqueo no
        // le habría servido de nada al usuario.
        if ($nuevoEstado) {
            $cambios['intentos_fallidos'] = 0;
            $cambios['ultimo_intento_fallido'] = null;
        }

        $gestion_usuario->update($cambios);

        $mensaje = $nuevoEstado ? 'activado' : 'desactivado';

        return redirect()
            ->route('gestion_usuarios.index')
            ->with('success', "Usuario {$mensaje} correctamente.");
    }

}
