<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'Crear administradores',
            'Ver administradores',
            'Editar administradores',
            'Inactivar administradores',
            'Crear usuarios',
            'Ver usuarios',
            'Editar usuarios',
            'Inactivar usuarios',
            'Crear solicitudes',
            'Ver solicitudes',
            'Editar solicitudes',
            'Editar solicitudes fuera de plazo',
            'Editar solicitudes de otros usuarios',
            'Cancelar solicitudes',
            'Enviar solicitudes a campo',
            'Crear atenciones',
            'Ver atenciones',
            'Editar atenciones',
            'Editar atenciones fuera de plazo',
            'Editar atenciones de otros usuarios',
            'Crear eventos',
            'Ver eventos',
            'Editar eventos',
            'Inactivar eventos',
            'Crear paquetes',
            'Ver paquetes',
            'Editar paquetes',
            'Cancelar paquetes',
            'Ver solicitudes en campo',
            'Crear encuestadores',
            'Ver encuestadores',
            'Editar encuestadores',
            'Inactivar encuestadores',
            'Crear hogares',
            'Editar hogares',
            'Editar hogares fuera de plazo',
            'Editar hogares de otros usuarios',
            'Ver solicitudes en calidad',
            'Ver reportes',
            'Ver auditoría',
            'Crear roles',
            'Ver roles',
            'Editar roles',
            'Inactivar roles',
            'Crear puntos de atención',
            'Ver puntos de atención',
            'Editar puntos de atención',
            'Inactivar puntos de atención',
            'Crear documentos públicos',
            'Ver documentos públicos',
            'Editar documentos públicos',
            'Inactivar documentos públicos',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $roles = [
            'Administrador',
            'Supervisor de punto',
            'Técnico de calidad de punto',
            'Asistente de punto',
            'Auxiliar de eventos',
            'Supervisor de campo',
            'Técnico de ruta',
            'Técnico de calidad de sistemas',
            'Asistencial calidad',
            'Técnico estadístico',
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role]);
        }

        $adminRole = Role::where('name', 'Administrador')->first();
        $adminRole->syncPermissions(Permission::all());

        $supervisorPunto = Role::where('name', 'Supervisor de punto')->first();
        $supervisorPunto->syncPermissions([
            'Crear solicitudes',
            'Ver solicitudes',
            'Editar solicitudes',
            'Editar solicitudes fuera de plazo',
            'Editar solicitudes de otros usuarios',
            'Cancelar solicitudes',
            'Enviar solicitudes a campo',
            'Crear atenciones',
            'Ver atenciones',
            'Editar atenciones',
            'Editar atenciones fuera de plazo',
            'Editar atenciones de otros usuarios',
        ]);

        $tecnicoCalidadPunto = Role::where('name', 'Técnico de calidad de punto')->first();
        $tecnicoCalidadPunto->syncPermissions([
            'Crear solicitudes',
            'Ver solicitudes',
            'Editar solicitudes',
            'Cancelar solicitudes',
            'Enviar solicitudes a campo',
            'Crear atenciones',
            'Ver atenciones',
            'Editar atenciones',
        ]);

        $asistentePunto = Role::where('name', 'Asistente de punto')->first();
        $asistentePunto->syncPermissions([
            'Crear solicitudes',
            'Ver solicitudes',
            'Editar solicitudes',
            'Crear atenciones',
            'Ver atenciones',
            'Editar atenciones',
        ]);

        $auxiliarEventos = Role::where('name', 'Auxiliar de eventos')->first();
        $auxiliarEventos->syncPermissions([
            'Crear eventos',
            'Ver eventos',
            'Editar eventos',
            'Inactivar eventos',
        ]);

        $supervisorCampo = Role::where('name', 'Supervisor de campo')->first();
        $supervisorCampo->syncPermissions([
            'Crear paquetes',
            'Ver paquetes',
            'Editar paquetes',
            'Cancelar paquetes',
            'Ver solicitudes en campo',
            'Crear encuestadores',
            'Ver encuestadores',
            'Editar encuestadores',
            'Inactivar encuestadores',
        ]);

        $tecnicoRuta = Role::where('name', 'Técnico de ruta')->first();
        $tecnicoRuta->syncPermissions([
            'Crear paquetes',
            'Ver paquetes',
            'Editar paquetes',
            'Cancelar paquetes',
            'Ver solicitudes en campo',
        ]);

        $tecnicoCalidadSistemas = Role::where('name', 'Técnico de calidad de sistemas')->first();
        $tecnicoCalidadSistemas->syncPermissions([
            'Crear hogares',
            'Editar hogares',
            'Editar hogares fuera de plazo',
            'Editar hogares de otros usuarios',
            'Ver solicitudes en calidad',
        ]);

        $asistencialCalidad = Role::where('name', 'Asistencial calidad')->first();
        $asistencialCalidad->syncPermissions([
            'Crear hogares',
            'Editar hogares',
            'Ver solicitudes en calidad',
        ]);

        $tecnicoEstadistico = Role::where('name', 'Técnico estadístico')->first();
        $tecnicoEstadistico->syncPermissions([
            'Ver reportes',
        ]);
    }
}
