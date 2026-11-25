import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useEffect, useState } from 'react';
import { MapPin, PlusCircle, Pencil, PowerOff, Power, Download } from 'lucide-react';
import { FlashMessage } from '@/components/flash-message';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Puntos',
        href: '/gestion_puntos',
    },
];

type PuntoAtencion = {
    id: number;
    nombre: string;
    estado: boolean;
    creado_el: string;
    actualizado_el: string;
};

export default function Index() {
    const { puntos, flash } = usePage().props as unknown as {
        puntos: PuntoAtencion[];
        flash?: { success?: string; error?: string };
    };

    const { auth } = usePage().props as any;

    const can = (permission: string) => {
        return auth.user.permissions?.includes(permission);
    };

    const [search, setSearch] = useState('');
    const [confirmPunto, setConfirmPunto] = useState<{ id: number; estado: boolean } | null>(null);

    const descargar = (tipo: string) => {
        window.open(`/gestion_puntos/exportar?tipo=${tipo}`, '_blank');
    };

    const filtered = puntos.filter((p) =>
        p.nombre.toLowerCase().includes(search.toLowerCase())
    );

    const fmt = (date: string) =>
        date
            ? new Date(date).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
              })
            : '-';

    const handleToggle = (id: number) => {
        router.patch(`/gestion_puntos/${id}/toggle`, {}, {
            onSuccess: () => setConfirmPunto(null),
        });
    };

    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['puntos'],
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Puntos" />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Gestión de puntos de atención</h1>

            <div className="flex flex-col gap-6 p-4 bg-[#F3F4F6]">

                {/* Flash */}
                <FlashMessage success={flash?.success} error={flash?.error} />

                {/* Botón registrar */}
                {can('Crear puntos de atención') && (
                    <div>
                        <Link
                            href="/gestion_puntos/create"
                            className="bg-[#4171B1] hover:bg-[#365f96] text-white px-4 py-2 rounded-md shadow"
                        >
                            <PlusCircle className="text-white w-5 h-5 inline mr-2" />
                            Registrar Punto de Atención
                        </Link>
                    </div>
                )}

                {/* Tabla */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">

                    {/* Cabecera */}
                    <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <MapPin className="text-[#4171B1] w-5 h-5" />
                            <h2 className="font-bold text-gray-700 dark:text-gray-200">
                                Lista de Puntos de Atención
                            </h2>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
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
                            <input
                                type="text"
                                placeholder="Buscar por nombre..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4171B1] dark:bg-gray-800 dark:text-white w-64"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto -mx-4">

                        <table className="w-full text-sm text-left table-auto">

                            <thead className="border-b bg-gray-50 dark:bg-gray-800 dark:text-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">ID</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Nombre</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Estado</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Creado</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Actualizado</th>
                                    <th scope="col" className="p-2 font-semibold text-center whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="dark:text-gray-300">

                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-4 text-center text-gray-600">
                                            No se encontraron puntos.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((p) => (
                                        <tr key={p.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">

                                            <td className="p-2 whitespace-nowrap">
                                                {p.id}
                                            </td>

                                            <td className="p-2 whitespace-nowrap">
                                                {p.nombre}
                                            </td>

                                            <td className="p-2 whitespace-nowrap">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        p.estado
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}
                                                >
                                                    {p.estado ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>

                                            <td className="p-2 whitespace-nowrap">
                                                {fmt(p.creado_el)}
                                            </td>

                                            <td className="p-2 whitespace-nowrap">
                                                {fmt(p.actualizado_el)}
                                            </td>

                                            {/* ACCIONES */}
                                            <td className="p-2 text-center whitespace-nowrap">
                                                <div className="flex justify-center gap-2">

                                                    {can('Editar puntos de atención') && (
                                                        <Link
                                                            href={`/gestion_puntos/${p.id}/edit`}
                                                            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 p-2 rounded-md"
                                                            title="Editar"
                                                            aria-label={`Editar el punto de atención ${p.nombre}`}
                                                        >
                                                            <Pencil size={16} />
                                                        </Link>
                                                    )}

                                                    {can('Inactivar puntos de atención') && (
                                                        <button
                                                            onClick={() => setConfirmPunto({ id: p.id, estado: p.estado })}
                                                            className={`${p.estado ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-gray-900 p-2 rounded-md`}
                                                            title={p.estado ? 'Inactivar' : 'Activar'}
                                                            aria-label={`${p.estado ? 'Inactivar' : 'Activar'} el punto de atención ${p.nombre}`}
                                                        >
                                                            {p.estado ? <PowerOff size={16} /> : <Power size={16} />}
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
            {confirmPunto !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                            {confirmPunto.estado ? '¿Inactivar punto?' : '¿Activar punto?'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            {confirmPunto.estado
                                ? 'El punto quedará marcado como inactivo.'
                                : 'El punto quedará marcado como activo.'}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmPunto(null)}
                                className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleToggle(confirmPunto.id)}
                                className={`px-4 py-2 text-sm rounded-md text-white ${
                                    confirmPunto.estado
                                        ? 'bg-red-500 hover:bg-red-600'
                                        : 'bg-green-500 hover:bg-green-600'
                                }`}
                            >
                                {confirmPunto.estado ? 'Inactivar' : 'Activar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
