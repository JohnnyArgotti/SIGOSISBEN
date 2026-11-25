import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Usuarios',
        href: '/gestion_usuarios',
    },
    {
        title: 'Detalle Usuario',
        href: '#',
    },
];

type Usuario = {
    id: number;
    nombres: string;
    apellidos: string;
    nombre_usuario: string;
    tipo_documento: string | null;
    num_documento: string | null;
    telefono: string | null;
    correo: string;
    estado: boolean;
    autenticacion_ad: boolean;
    tipo_autenticacion: string;
    ad_guid: string | null;
    creado_el?: string;
    actualizado_el?: string;
    roles: string[];
    permisos: string[];
    es_admin: boolean;
};

export default function Show() {

    const { usuario } = usePage().props as unknown as {
        usuario: Usuario;
    };

    const fmt = (date?: string) =>
        date
            ? new Date(date).toLocaleDateString('es-CO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            })
            : '-';

    const { auth } = usePage().props as any;

    const can = (permission: string) => {
        return auth.user.permissions?.includes(permission);
    };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Detalle Usuario" />

            <div className="flex flex-col gap-6 p-4 bg-gray-100">
                <div className="bg-white rounded-lg shadow p-2 flex justify-between items-center">
                    <h1 className="text-lg font-semibold">
                        Información del Usuario
                    </h1>
                </div>

                <div className="bg-white rounded-lg shadow p-6">


                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">

                        <div className="mb-4">
                            <strong>Tipo Documento</strong>
                            <p>{usuario.tipo_documento}</p>
                        </div>

                        <div className="mb-4">
                            <strong>Número de Documento</strong>
                            <p>{usuario.num_documento ?? '-'}</p>
                        </div>

                        <div className="mb-4">
                            <strong>Nombres</strong>
                            <p>{usuario.nombres}</p>
                        </div>

                        <div className="mb-4">
                            <strong>Apellidos</strong>
                            <p>{usuario.apellidos}</p>
                        </div>

                        <div className="mb-4">
                            <strong>Correo</strong>
                            <p>{usuario.correo}</p>
                        </div>

                        <div className="mb-4">
                            <strong>Teléfono</strong>
                            <p>{usuario.telefono ?? '-'}</p>
                        </div>

                        <div className="mb-4">
                            <strong>Nombre de Usuario</strong>
                            <p>{usuario.nombre_usuario}</p>
                        </div>

                        <div className="mb-4">
                            <strong>Tipo de Autenticación</strong>
                            <p>{usuario.tipo_autenticacion}</p>
                        </div>

                        {usuario.autenticacion_ad && (
                            <div className="mb-4">
                                <strong>GUID Active Directory</strong>
                                <p className="break-all">{usuario.ad_guid ?? '-'}</p>
                            </div>
                        )}

                        <div className="mb-4">
                            <strong>Creado</strong>
                            <p>{fmt(usuario.creado_el)}</p>
                        </div>

                        <div className="mb-4">
                            <strong>Actualizado</strong>
                            <p>{fmt(usuario.actualizado_el)}</p>
                        </div>

                        <div className="mb-4">
                            <strong>Estado</strong>
                            <p className="mt-1">
                                <span
                                    className={`inline-block px-2 py-1 text-xs rounded ${usuario.estado
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                        }`}
                                >
                                    {usuario.estado ? 'Activo' : 'Inactivo'}
                                </span>
                            </p>
                        </div>

                        <div className="mb-4 col-span-2 md:col-span-3">
                            <strong>Roles</strong>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {usuario.roles?.length ? (
                                    usuario.roles.map((r) => (
                                        <span
                                            key={r}
                                            className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                        >
                                            {r}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-gray-600 text-xs">Sin roles asignados</span>
                                )}
                            </div>
                        </div>

                    </div>
                    {/* BOTONES */}
                    <div className="mt-8 flex gap-3">

                        <Link
                            href="/gestion_usuarios"
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                            Volver
                        </Link>

                        {/* Editar administrador exige los dos permisos, igual que el
                            servidor (la ruta pide 'Editar usuarios' y el controlador
                            añade 'Editar administradores' según el destino). */}
                        {can('Editar usuarios') && (!usuario.es_admin || can('Editar administradores')) && (
                            <Link
                                href={`/gestion_usuarios/${usuario.id}/edit`}
                                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-md text-sm"
                            >
                                Editar
                            </Link>
                        )}

                    </div>

                </div>

            </div>
        </AppLayout>
    );
}

