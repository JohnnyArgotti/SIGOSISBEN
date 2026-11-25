import { Transition } from '@headlessui/react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useEffect, useRef, useState } from 'react';
import { UserPlus, Users, Power, PowerOff, Eye, Pencil, KeyRound, Download, Info } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Usuarios',
        href: '/gestion_usuarios',
    },
];

/**
 * Texto que identifica a un usuario dentro del nombre accesible de los botones
 * de su fila.
 *
 * Los botones de acción son solo icono y se apoyaban únicamente en `title`, así
 * que un lector de pantalla anunciaba "Editar" en las veinte filas por igual.
 * El `title` se conserva como pista para el mouse; el `aria-label` es el que
 * dice sobre qué usuario actúa cada botón.
 */
function descripcionUsuario(u: { nombres?: string; apellidos?: string; num_documento?: string }): string {
    const nombre = [u.nombres, u.apellidos].filter(Boolean).join(' ').trim();
    return nombre || `documento ${u.num_documento ?? 'sin identificar'}`;
}

type Usuario = {
    id: number;
    nombres: string;
    apellidos: string;
    nombre_usuario: string;
    num_documento: string;
    tipo_documento: string;
    telefono: string | null;
    correo: string;
    estado: boolean;
    autenticacion_ad: boolean;
    tipo_autenticacion: string;
    creado_el: string;
    actualizado_el: string;
    roles: string[];
    es_admin: boolean;
};

export default function Index() {

    const { usuarios, flash, auth, filters = {} } = usePage().props as any;

    const usuariosData: Usuario[] = usuarios.data ?? [];

    const [search, setSearch] = useState((filters as any).search || '');
    const [showFlash, setShowFlash] = useState(!!flash?.success);
    const [confirmUsuario, setConfirmUsuario] = useState<{ id: number; estado: boolean } | null>(null);
    const [confirmResetPassword, setConfirmResetPassword] = useState<{ id: number; nombres: string; apellidos: string } | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const irAPagina = (page: number) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        router.get('/gestion_usuarios', { search, page }, { preserveState: true, replace: true });
    };

    useEffect(() => {
        if (flash?.success) {
            setShowFlash(true);
            const timer = setTimeout(() => setShowFlash(false), 10_000);
            return () => clearTimeout(timer);
        }
    }, [flash?.success]);

    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['usuarios'],
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const can = (permission: string) => {
        return auth.user.permissions?.includes(permission);
    };

    const handleToggle = (id: number) => {
        router.patch(`/gestion_usuarios/${id}/toggle`, {}, {
            onSuccess: () => setConfirmUsuario(null),
        });
    };

    const fmt = (date: string) =>
        date
            ? new Date(date).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
              })
            : '-';

    /* DESCARGAR EXCEL */
    const descargarExcel = () => {
        const params = new URLSearchParams({
            search: search || '',
            tipo: 'xlsx',
        });

        window.open(`/gestion_usuarios/exportar/usuarios?${params.toString()}`, '_blank');
    };

    /* DESCARGAR CSV */
    const descargarCSV = () => {
        const params = new URLSearchParams({
            search: search || '',
            tipo: 'csv',
        });

        window.open(`/gestion_usuarios/exportar/usuarios?${params.toString()}`, '_blank');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Usuarios" />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Gestión de usuarios</h1>

            <div className="flex flex-col gap-6 p-4 bg-[#F3F4F6]">

                {/* Flash */}
                <Transition
                    show={showFlash}
                    enter="transition ease-out duration-300"
                    enterFrom="opacity-0 -translate-y-2"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-300"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 -translate-y-2"
                >
                    <div className="rounded-md border border-green-200 bg-green-50 p-4">
                        <div className="flex items-center gap-3">
                            <svg className="h-5 w-5 text-green-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm font-medium text-green-800">{flash?.success}</p>
                        </div>
                    </div>
                </Transition>

                {/* Botón registrar */}
                <div>
                    {can('Crear usuarios') && (
                        <Link
                            href="/gestion_usuarios/create"
                            className="bg-[#4171B1] hover:bg-[#365f96] text-white px-4 py-2 rounded-md shadow"
                        >
                            <UserPlus className="text-white w-5 h-5 inline mr-2" />
                            Registrar Usuario
                        </Link>
                    )}
                </div>

                {/* TABLA */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-2 sm:p-4">

                    {/* CABECERA */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-3">

                        <div className="flex items-center gap-2">
                            <Users className="text-[#4171B1] w-5 h-5" />
                            <h2 className="font-semibold text-gray-700 dark:text-gray-200">
                                Lista de Usuarios ({usuarios.total ?? usuariosData.length})
                            </h2>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">

                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <button
                                    onClick={descargarExcel}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium text-gray-900 transition-colors"
                                >
                                    <Download size={16} />
                                    Excel
                                </button>
                                <button
                                    onClick={descargarCSV}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium text-white transition-colors"
                                >
                                    <Download size={16} />
                                    CSV
                                </button>
                            </div>

                            {/* BUSCADOR */}
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSearch(value);
                                        if (debounceRef.current) clearTimeout(debounceRef.current);
                                        debounceRef.current = setTimeout(() => {
                                            router.get('/gestion_usuarios', { search: value }, { preserveState: true, replace: true });
                                        }, 500);
                                    }}
                                    className="border dark:border-gray-700 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                                />
                                <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                        <TooltipTrigger type="button" className="text-gray-600 hover:text-gray-600 dark:hover:text-gray-300">
                                            <Info size={16} />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Buscar por documento o nombre de usuario</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>

                        </div>
                    </div>

                    {/* TABLA */}
                    <div className="overflow-x-auto -mx-4">

                        <table className="w-full text-sm text-left table-auto">

                            <thead className="border-b bg-gray-50 dark:bg-gray-800 dark:text-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Documento</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Nombres</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Apellidos</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Teléfono</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Usuario</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Tipo de autenticación</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Estado</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Roles</th>
                                    <th scope="col" className="p-2 font-semibold text-center whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="dark:text-gray-300">
                                    {usuariosData.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-4 text-center text-gray-600">
                                            No se encontraron usuarios.
                                        </td>
                                    </tr>
                                ) : (
                                    usuariosData.map((u: Usuario) => (
                                        <tr
                                            key={u.id}
                                            className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <td className="p-2 whitespace-nowrap">{u.num_documento}</td>
                                            <td className="p-2 whitespace-nowrap">{u.nombres}</td>
                                            <td className="p-2 whitespace-nowrap">{u.apellidos}</td>
                                            <td className="p-2 whitespace-nowrap">{u.telefono ?? '-'}</td>
                                            <td className="p-2 whitespace-nowrap">{u.nombre_usuario}</td>

                                            <td className="p-2 whitespace-nowrap text-sm">
                                                {u.tipo_autenticacion}
                                            </td>

                                            <td className="p-2 whitespace-nowrap">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        u.estado
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}
                                                >
                                                    {u.estado ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>

                                            <td className="p-2 text-sm">
                                                {u.roles && u.roles.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {u.roles.map((rol) => (
                                                            <span
                                                                key={rol}
                                                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                    rol === 'Administrador'
                                                                        ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                                                                        : 'bg-indigo-100 text-indigo-700'
                                                                }`}
                                                            >
                                                                {rol}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-600 italic text-xs">Sin roles asignados</span>
                                                )}
                                            </td>

                                            <td className="p-2 text-center whitespace-nowrap">
                                                <div className="flex justify-center gap-2">
                                                    <Link
                                                        href={`/gestion_usuarios/${u.id}`}
                                                        className="bg-[#4171B1] hover:bg-[#365f96] text-white p-2 rounded-md"
                                                        title="Ver detalle"
                                                        aria-label={`Ver detalle de ${descripcionUsuario(u)}`}
                                                    >
                                                        <Eye size={14} />
                                                    </Link>

                                                    {/* Botón editar: usuarios locales no administradores */}
                                                    {!u.es_admin && !u.autenticacion_ad && can('Editar usuarios') && (
                                                        <Link
                                                            href={`/gestion_usuarios/${u.id}/edit`}
                                                            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 p-2 rounded-md"
                                                            title="Editar"
                                                            aria-label={`Editar a ${descripcionUsuario(u)}`}
                                                        >
                                                            <Pencil size={14} />
                                                        </Link>
                                                    )}

                                                    {/* Botón editar para administradores: exige los dos permisos,
                                                        igual que el servidor (la ruta pide 'Editar usuarios' y el
                                                        controlador añade 'Editar administradores' según el destino). */}
                                                    {u.es_admin && !u.autenticacion_ad && can('Editar usuarios') && can('Editar administradores') && (
                                                        <Link
                                                            href={`/gestion_usuarios/${u.id}/edit`}
                                                            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 p-2 rounded-md"
                                                            title="Editar"
                                                            aria-label={`Editar al administrador ${descripcionUsuario(u)}`}
                                                        >
                                                            <Pencil size={14} />
                                                        </Link>
                                                    )}

                                                    {/* Botón asignar roles: solo para usuarios de Directorio Activo */}
                                                    {u.autenticacion_ad && can('Editar usuarios') && (
                                                        <Link
                                                            href={`/gestion_usuarios/${u.id}/roles`}
                                                            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 p-2 rounded-md"
                                                            title="Asignar roles"
                                                            aria-label={`Asignar roles a ${descripcionUsuario(u)}`}
                                                        >
                                                            <Pencil size={14} />
                                                        </Link>
                                                    )}

                                                    {/* Botón restablecer contraseña: solo usuarios locales */}
                                                    {!u.autenticacion_ad && can('Editar usuarios') && (
                                                        <button
                                                            onClick={() => setConfirmResetPassword({ id: u.id, nombres: u.nombres, apellidos: u.apellidos })}
                                                            className="bg-orange-500 hover:bg-orange-600 text-gray-900 p-1.5 rounded-md cursor-pointer"
                                                            title="Restablecer contraseña"
                                                            aria-label={`Restablecer la contraseña de ${descripcionUsuario(u)}`}
                                                        >
                                                            <KeyRound size={14} />
                                                        </button>
                                                    )}

                                                    {/* Botón toggle para usuarios NO administradores */}
                                                    {!u.es_admin && !u.autenticacion_ad && can('Inactivar usuarios') && (
                                                        <button
                                                            onClick={() => setConfirmUsuario({ id: u.id, estado: u.estado })}
                                                            className={`${u.estado ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-gray-900 p-1.5 rounded-md cursor-pointer`}
                                                            title={u.estado ? 'Inactivar' : 'Activar'}
                                                            aria-label={`${u.estado ? 'Inactivar' : 'Activar'} a ${descripcionUsuario(u)}`}
                                                        >
                                                            {u.estado ? <PowerOff size={14} /> : <Power size={14} />}
                                                        </button>
                                                    )}

                                                    {/* Botón toggle para administradores: exige los dos permisos,
                                                        igual que el servidor (la ruta pide 'Inactivar usuarios' y el
                                                        controlador añade 'Inactivar administradores' según el destino). */}
                                                    {u.es_admin && !u.autenticacion_ad && can('Inactivar usuarios') && can('Inactivar administradores') && (
                                                        <button
                                                            onClick={() => setConfirmUsuario({ id: u.id, estado: u.estado })}
                                                            className={`${u.estado ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-gray-900 p-1.5 rounded-md cursor-pointer`}
                                                            title={u.estado ? 'Inactivar administrador' : 'Activar administrador'}
                                                            aria-label={`${u.estado ? 'Inactivar' : 'Activar'} al administrador ${descripcionUsuario(u)}`}
                                                        >
                                                            {u.estado ? <PowerOff size={14} /> : <Power size={14} />}
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

                    <Pagination
                        currentPage={usuarios.current_page ?? 1}
                        lastPage={usuarios.last_page ?? 1}
                        total={usuarios.total ?? 0}
                        perPage={10}
                        onPageChange={irAPagina}
                    />

                </div>
            </div>

            {/* Modal de confirmación */}
            {confirmUsuario !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                            {confirmUsuario.estado ? '¿Estás seguro de inactivar este usuario?' : '¿Activar usuario?'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            {confirmUsuario.estado
                                ? 'Al inactivarlo, el usuario perderá acceso inmediato al sistema y no podrá iniciar sesión hasta que sea reactivado.'
                                : 'El usuario recuperará el acceso al sistema y podrá iniciar sesión nuevamente.'}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmUsuario(null)}
                                className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleToggle(confirmUsuario.id)}
                                className={`px-4 py-2 text-sm rounded-md text-white ${
                                    confirmUsuario.estado
                                        ? 'bg-red-500 hover:bg-red-600'
                                        : 'bg-green-500 hover:bg-green-600'
                                }`}
                            >
                                {confirmUsuario.estado ? 'Inactivar' : 'Activar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de confirmación — Restablecer contraseña */}
            {confirmResetPassword !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                            ¿Restablecer contraseña?
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            Estás a punto de restablecer la contraseña de:
                        </p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white mb-4">
                            {confirmResetPassword.nombres} {confirmResetPassword.apellidos}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Serás redirigido a un formulario donde podrás definir la nueva contraseña. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmResetPassword(null)}
                                className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Cancelar
                            </button>
                            <a
                                href={`/gestion_usuarios/${confirmResetPassword.id}/reset-password`}
                                className="px-4 py-2 text-sm rounded-md text-gray-900 bg-orange-500 hover:bg-orange-600"
                            >
                                Continuar
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}