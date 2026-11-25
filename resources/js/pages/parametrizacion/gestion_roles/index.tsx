import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useEffect, useState } from 'react';
import { UserPlus, Users, Pencil, Download, PowerOff, Power } from 'lucide-react';
import { FlashMessage } from '@/components/flash-message';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Roles',
        href: '/gestion_roles',
    },
];

type Permission = {
    id: number;
    name: string;
};

type Role = {
    id: number;
    name: string;
    description?: string;
    estado: boolean;
    permissions: Permission[];
    created_at: string;
    updated_at: string;
};

export default function Index() {

    const { roles, flash } = usePage().props as unknown as {
        roles: Role[];
        flash?: { success?: string };
    };

    const { auth } = usePage().props as any;

    const can = (permission: string) => {
        return auth.user.permissions?.includes(permission);
    };

    const [search, setSearch] = useState('');
    const [confirmRole, setConfirmRole] = useState<{ id: number; estado: boolean } | null>(null);

    const descargar = (tipo: string) => {
        window.open(`/gestion_roles/exportar?tipo=${tipo}`, '_blank');
    };

    const handleToggle = (id: number) => {
        router.patch(`/gestion_roles/${id}/toggle`, {}, {
            onSuccess: () => setConfirmRole(null),
        });
    };

    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['roles'],
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const filtered = roles.filter((r) => {
        const q = search.toLowerCase();

        return (
            r.name.toLowerCase().includes(q) ||
            (r.description ?? '').toLowerCase().includes(q)
        );
    });

    const fmt = (date: string) =>
        date
            ? new Date(date).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
              })
            : '-';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Roles" />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Gestión de roles</h1>

            <div className="flex flex-col gap-6 p-4 bg-[#F3F4F6]">

                {/* Flash */}
                <FlashMessage success={flash?.success} />

                {/* Botón registrar */}
                {can('Crear roles') && (
                    <div>
                        <Link
                            href="/gestion_roles/create"
                            className="bg-[#4171B1] hover:bg-[#365f96] text-white px-4 py-2 rounded-md shadow"
                        >
                            <UserPlus className="text-white w-5 h-5 inline mr-2" />
                            Registrar Rol
                        </Link>
                    </div>
                )}

                {/* Tabla */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">

                    {/* Cabecera */}
                    <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Users className="text-[#4171B1] w-5 h-5" />
                            <h2 className="font-bold text-gray-700 dark:text-gray-200">
                                Lista de Roles
                            </h2>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={() => descargar('xlsx')}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium text-gray-900 transition-colors"
                            >
                                <Download size={16} />
                                Excel
                            </button>
                            <button
                                onClick={() => descargar('csv')}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium text-white transition-colors"
                            >
                                <Download size={16} />
                                CSV
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto -mx-4">

                        <table className="w-full text-sm text-left table-auto">

                            <thead className="border-b bg-gray-50 dark:bg-gray-800 dark:text-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">ID</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Nombre</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Permisos</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Estado</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Creado</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Actualizado</th>
                                    <th scope="col" className="p-2 font-semibold text-center whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="dark:text-gray-300">

                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-4 text-center text-gray-600">
                                            No se encontraron roles.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((r) => (
                                        <tr key={r.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">

                                            <td className="p-2 whitespace-nowrap">
                                                {r.id}
                                            </td>

                                            <td className="p-2 whitespace-nowrap">
                                                {r.name}
                                            </td>

                                            {/* PERMISOS */}
                                            <td className="p-2 text-sm">
                                                <div className="flex flex-wrap gap-1">

                                                    {r.permissions?.length > 0 ? (
                                                        r.permissions.map((p) => (
                                                            <span
                                                                key={p.id}
                                                                className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded"
                                                            >
                                                                {p.name}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-600 text-xs">
                                                            Sin permisos
                                                        </span>
                                                    )}

                                                </div>
                                            </td>

                                            <td className="p-2 whitespace-nowrap">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        r.estado
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}
                                                >
                                                    {r.estado ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>

                                            <td className="p-2 whitespace-nowrap">
                                                {fmt(r.created_at)}
                                            </td>

                                            <td className="p-2 whitespace-nowrap">
                                                {fmt(r.updated_at)}
                                            </td>

                                            {/* ACCIONES */}
                                            <td className="p-2 text-center whitespace-nowrap">
                                                <div className="flex justify-center gap-2">

                                                    {can('Editar roles') && (
                                                        <Link
                                                            href={`/gestion_roles/${r.id}/edit`}
                                                            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 p-2 rounded-md"
                                                            title="Editar"
                                                            aria-label={`Editar el rol ${r.name}`}
                                                        >
                                                            <Pencil size={16} />
                                                        </Link>
                                                    )}

                                                    {can('Inactivar roles') && (
                                                        <button
                                                            onClick={() => setConfirmRole({ id: r.id, estado: r.estado })}
                                                            className={`${r.estado ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-gray-900 p-2 rounded-md`}
                                                            title={r.estado ? 'Inactivar' : 'Activar'}
                                                            aria-label={`${r.estado ? 'Inactivar' : 'Activar'} el rol ${r.name}`}
                                                        >
                                                            {r.estado ? <PowerOff size={16} /> : <Power size={16} />}
                                                        </button>
                                                    )}

                                                </div>
                                            </td>

                                        </tr>
                                    ))
                                )}

                            </tbody>

                        </table>

                    </div>
                </div>
            </div>

            {/* Modal de confirmación */}
            {confirmRole !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                            {confirmRole.estado ? '¿Inactivar rol?' : '¿Activar rol?'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            {confirmRole.estado
                                ? 'El rol quedará marcado como inactivo.'
                                : 'El rol quedará marcado como activo.'}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmRole(null)}
                                className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleToggle(confirmRole.id)}
                                className={`px-4 py-2 text-sm rounded-md text-white ${
                                    confirmRole.estado
                                        ? 'bg-red-500 hover:bg-red-600'
                                        : 'bg-green-500 hover:bg-green-600'
                                }`}
                            >
                                {confirmRole.estado ? 'Inactivar' : 'Activar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}