import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ShieldCheck } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Gestión de Usuarios', href: '/gestion_usuarios' },
    { title: 'Asignar Roles', href: '#' },
];

type Rol = { id: number; name: string };

type Usuario = {
    id: number;
    nombres: string | null;
    apellidos: string | null;
    nombre_usuario: string;
    correo: string | null;
    estado: boolean;
    autenticacion_ad: boolean;
    roles: string[];
};

type Props = {
    usuario: Usuario;
    roles: Rol[];
};

export default function AsignarRoles({ usuario, roles }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        roles: usuario.roles as string[],
    });

    const toggleRol = (name: string) => {
        setData(
            'roles',
            data.roles.includes(name)
                ? data.roles.filter((r) => r !== name)
                : [...data.roles, name],
        );
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/gestion_usuarios/${usuario.id}/roles`);
    };

    const Campo = ({ label, value }: { label: string; value: string | null }) => (
        <div className="space-y-1">
            <Label>{label}</Label>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {value || '-'}
            </div>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Asignar Roles" />

            <div className="flex flex-col gap-6 p-4 bg-gray-100">
                <div className="bg-white rounded-lg shadow p-3 flex items-center gap-2">
                    <ShieldCheck className="text-indigo-600" size={20} />
                    <h1 className="text-lg font-semibold">Asignación de Roles — Usuario Active Directory</h1>
                </div>

                <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
                    La información personal e institucional de este usuario proviene exclusivamente de Active Directory
                    y no puede editarse desde el SIGO. Únicamente es posible administrar sus roles.
                </div>

                <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 space-y-5">
                    {/* Información institucional (solo lectura) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Campo label="Nombres" value={usuario.nombres} />
                        <Campo label="Apellidos" value={usuario.apellidos} />
                        <Campo label="Usuario institucional" value={usuario.nombre_usuario} />
                        <Campo label="Correo institucional" value={usuario.correo} />
                    </div>

                    {/* Roles */}
                    <div className="space-y-2">
                        <Label id="roles-label">Roles del Usuario</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="group" aria-labelledby="roles-label" aria-describedby={errors.roles ? 'roles-error' : undefined}>
                            {roles.map((rol) => (
                                <label
                                    key={rol.id}
                                    className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors ${
                                        data.roles.includes(rol.name)
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={data.roles.includes(rol.name)}
                                        onChange={() => toggleRol(rol.name)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                    />
                                    {rol.name}
                                </label>
                            ))}
                        </div>
                        <InputError id="roles-error" message={errors.roles} />
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-3 pt-2">
                        <a
                            href="/gestion_usuarios"
                            className="bg-[#E85068] hover:brightness-110 text-gray-900 px-4 py-2 rounded-md text-sm transition duration-200"
                        >
                            Cancelar
                        </a>
                        <Button type="submit" disabled={processing} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {processing ? 'Guardando...' : 'Guardar Roles'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
