import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FlashMessage } from '@/components/flash-message';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Roles',
        href: '/gestion_roles'
    },
    {
        title: 'Registrar Rol',
        href: '/gestion_roles/create'
    }
];

type Permission = { id: number; name: string };

type Props = {
    permissions: Permission[];
};

export default function Create({ permissions }: Props) {

    const { flash } = usePage().props as unknown as {
        flash?: { success?: string; error?: string };
    };

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        permissions: [] as number[],
    });

    const togglePermission = (permissionId: number) => {
        if (data.permissions.includes(permissionId)) {
            setData(
                'permissions',
                data.permissions.filter((p) => p !== permissionId)
            );
        } else {
            setData(
                'permissions',
                [...data.permissions, permissionId]
            );
        }
    };

    /* FILTROS DE PERMISOS */
    const crearPermissions = permissions.filter(p =>
        p.name.toLowerCase().startsWith('crear')
    );

    const verPermissions = permissions.filter(p =>
        p.name.toLowerCase().startsWith('ver')
    );

    const editarPermissions = permissions.filter(p =>
        p.name.toLowerCase().startsWith('editar')
    );

    const otroPermissions = permissions.filter(p =>
        p.name.toLowerCase() === 'enviar solicitudes a campo'
    );

    const eliminarPermissions = permissions.filter(p =>
        !p.name.toLowerCase().startsWith('ver') &&
        !p.name.toLowerCase().startsWith('crear') &&
        !p.name.toLowerCase().startsWith('editar') &&
        p.name.toLowerCase() !== 'enviar solicitudes a campo'
    );

    /* RELACIÓN "VER" <-> "CREAR"/"EDITAR" POR MÓDULO */
    // Extrae el nombre del módulo quitando el verbo inicial (ej: "Editar roles" -> "roles")
    const getModule = (name: string): string | null => {
        const lower = name.toLowerCase();
        if (lower.startsWith('ver ')) return lower.slice(4).trim();
        if (lower.startsWith('crear ')) return lower.slice(6).trim();
        if (lower.startsWith('editar ')) return lower.slice(7).trim();
        return null;
    };

    const verPermissionByModule = new Map<string, Permission>();
    verPermissions.forEach((p) => {
        const mod = getModule(p.name);
        if (mod) verPermissionByModule.set(mod, p);
    });

    // Módulos con "Editar"/"Crear" seleccionado cuyo "Ver" correspondiente no está seleccionado
    const modulosSinVerParaEditar = Array.from(new Set(
        editarPermissions
            .filter((p) => data.permissions.includes(p.id))
            .map((p) => getModule(p.name))
            .filter((mod): mod is string => {
                if (!mod) return false;
                const verPerm = verPermissionByModule.get(mod);
                return !!verPerm && !data.permissions.includes(verPerm.id);
            })
    ));

    const modulosSinVerParaCrear = Array.from(new Set(
        crearPermissions
            .filter((p) => data.permissions.includes(p.id))
            .map((p) => getModule(p.name))
            .filter((mod): mod is string => {
                if (!mod) return false;
                const verPerm = verPermissionByModule.get(mod);
                return !!verPerm && !data.permissions.includes(verPerm.id);
            })
    ));

    const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

    const bloqueadoPorEditar = modulosSinVerParaEditar.length > 0;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (bloqueadoPorEditar) return;
        post('/gestion_roles');
    };

    const renderPermissions = (perms: Permission[]) => (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">

            {perms.map((permission) => (

                <label
                    key={permission.id}
                    className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors ${data.permissions.includes(permission.id)
                            ? 'border-[#4171B1] bg-[#4171B1]/10 text-[#4171B1]'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                >

                    <input
                        type="checkbox"
                        checked={data.permissions.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#4171B1]"
                    />

                    {permission.name}

                </label>

            ))}

        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Registrar Rol" />

            <div className="flex flex-col gap-6 p-4 bg-gray-100">

                {/* ALERTA VISUAL */}
                <FlashMessage success={flash?.success} error={flash?.error} />

                <div className="bg-white rounded-lg shadow p-2 flex justify-between items-center">
                    <h1 className="text-lg font-semibold">
                        Registrar Nuevo Rol
                    </h1>
                </div>

                <form onSubmit={submit} className="bg-white rounded-lg shadow p-6">

                    {/* NOMBRE */}
                    <div className="mb-4">
                        <Label htmlFor="name">
                            Nombre
                        </Label>

                        <Input
                            aria-invalid={!!errors.name}
                            aria-describedby={errors.name ? 'name-error' : undefined}
                            id="name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1 block w-full"
                        />

                        <InputError id="name-error" message={errors.name} className="mt-2" />
                    </div>

                    {/* PERMISOS */}
                    <div className="space-y-2">

                        <Label id="permissions-label">Permisos</Label>

                        <div className="space-y-6" role="group" aria-labelledby="permissions-label" aria-describedby={errors.permissions ? 'permissions-error' : undefined}>
                            {/* Crear */}
                            <div>
                                <h3 className="font-semibold text-sm mb-2 text-gray-700">
                                    Crear
                                </h3>

                                {renderPermissions(crearPermissions)}
                            </div>

                            {/* Ver */}
                            <div>
                                <h3 className="font-semibold text-sm mb-2 text-gray-700">
                                    Ver
                                </h3>

                                {renderPermissions(verPermissions)}
                            </div>

                            {/* Editar */}
                            <div>
                                <h3 className="font-semibold text-sm mb-2 text-gray-700">
                                    Editar
                                </h3>

                                {renderPermissions(editarPermissions)}
                            </div>

                            {/* Eliminar */}
                            {eliminarPermissions.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-sm mb-2 text-gray-700">
                                        Eliminar
                                    </h3>

                                    {renderPermissions(eliminarPermissions)}
                                </div>
                            )}

                            {/* Otro */}
                            {otroPermissions.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-sm mb-2 text-gray-700">
                                        Otro
                                    </h3>

                                    {renderPermissions(otroPermissions)}
                                </div>
                            )}

                        </div>

                        <InputError id="permissions-error" message={errors.permissions} />

                    </div>

                    {/* AVISOS DE PERMISOS "VER" FALTANTES */}
                    {bloqueadoPorEditar && (
                        <div className="mt-4 rounded-md bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-800 dark:bg-red-900/20 dark:border-red-600 dark:text-red-300">
                            <strong>No puedes guardar:</strong> seleccionaste el permiso de "Editar" para{' '}
                            {modulosSinVerParaEditar.map(capitalizar).join(', ')}, pero falta el permiso de "Ver" de{' '}
                            {modulosSinVerParaEditar.length === 1 ? 'ese módulo' : 'esos módulos'}. Sin él, el usuario no
                            podrá elegir qué registro editar. Selecciona también "Ver" para continuar.
                        </div>
                    )}

                    {modulosSinVerParaCrear.length > 0 && (
                        <div className="mt-4 rounded-md bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-600 dark:text-amber-300">
                            <strong>Nota:</strong> seleccionaste el permiso de "Crear" para{' '}
                            {modulosSinVerParaCrear.map(capitalizar).join(', ')} sin el permiso de "Ver" de{' '}
                            {modulosSinVerParaCrear.length === 1 ? 'ese módulo' : 'esos módulos'}. Se recomienda asignar
                            también "Ver" para que el usuario pueda visualizar lo que crea.
                        </div>
                    )}

                    {/* BOTÓN */}
                    <div className="flex justify-end gap-3 pt-3">
                        <a
                            href="/gestion_roles"
                            className="bg-[#E85068] hover:brightness-110 text-gray-900 px-4 py-2 rounded-md text-sm transition duration-200"
                        >
                            Cancelar
                        </a>
                        <Button
                            type="submit"
                            disabled={processing || bloqueadoPorEditar}
                            className="bg-black hover:bg-gray-900 text-white"                        >
                            {processing ? 'Guardando...' : 'Guardar Rol'}
                        </Button>
                    </div>


                </form>

            </div>

        </AppLayout>
    );
}

