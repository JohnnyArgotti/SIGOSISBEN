<?php

namespace App\Http\Controllers;

use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Exports\RolesExport;
use Maatwebsite\Excel\Facades\Excel;

class RoleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Inertia::render('parametrizacion/gestion_roles/index', [
            'roles' => Role::with("permissions")
                ->where('name', '!=', 'Administrador')
                ->orderBy('id', 'asc')
                ->get()
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {

        return Inertia::render('parametrizacion/gestion_roles/create', [
            'permissions' => Permission::all()
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, AuditoriaService $auditoria)
    {
        $request->validate([
            'name' => 'required|unique:roles,name',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role = Role::create([
            'name' => $request->name,
        ]);

        $role->syncPermissions($request->permissions ?? []);

        $auditoria->registrar(
            evento: 'creado',
            entidad: 'Rol',
            entidadId: $role->id,
            descripcion: "Creó Rol #{$role->id} — {$role->name}",
            nuevos: ['name' => $role->name, 'permisos' => $request->permissions ?? []],
        );

        return redirect()
            ->route('gestion_roles.index')
            ->with('success', 'Rol creado exitosamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Role $gestion_rol)
    {
        return Inertia::render('parametrizacion/gestion_roles/edit', [
            "role" => $gestion_rol->load('permissions'),
            "permissions" => Permission::all()
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id, AuditoriaService $auditoria)
    {
        $role = Role::findOrFail($id);

        $request->validate([
            'name' => 'required|unique:roles,name,' . $role->id,
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $nombreAnterior = $role->name;
        $role->update(['name' => $request->name]);
        $role->syncPermissions($request->permissions ?? []);

        $auditoria->registrar(
            evento: 'actualizado',
            entidad: 'Rol',
            entidadId: $role->id,
            descripcion: "Actualizó Rol #{$role->id} — {$role->name}",
            anteriores: ['name' => $nombreAnterior],
            nuevos: ['name' => $role->name, 'permisos' => $request->permissions ?? []],
        );

        return redirect()
            ->route('gestion_roles.index')
            ->with('success', 'Rol actualizado correctamente.');
    }

    public function toggle(string $id, AuditoriaService $auditoria)
    {
        $role = Role::findOrFail($id);
        $nuevoEstado = !$role->estado;
        $role->update(['estado' => $nuevoEstado]);

        $mensaje = $nuevoEstado ? 'activado' : 'desactivado';

        $auditoria->registrar(
            evento: 'actualizado',
            entidad: 'Rol',
            entidadId: $role->id,
            descripcion: "Rol #{$role->id} — {$role->name} {$mensaje}",
            anteriores: ['estado' => !$nuevoEstado],
            nuevos: ['estado' => $nuevoEstado],
        );

        return redirect()
            ->route('gestion_roles.index')
            ->with('success', "Rol {$mensaje} correctamente.");
    }

    public function exportar(Request $request)
    {
        $tipo = $request->get('tipo', 'xlsx');

        if ($tipo === 'csv') {
            return Excel::download(
                new RolesExport(),
                'roles_' . now()->format('YmdHis') . '.csv',
                \Maatwebsite\Excel\Excel::CSV
            );
        }

        return Excel::download(
            new RolesExport(),
            'roles_' . now()->format('YmdHis') . '.xlsx'
        );
    }
}
