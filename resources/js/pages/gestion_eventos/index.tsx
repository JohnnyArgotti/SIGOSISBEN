import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useEffect, useState } from 'react';
import { CalendarDays, PlusCircle, Pencil, PowerOff, Power, FileDown, ClipboardList, Download } from 'lucide-react';
import { FlashMessage } from '@/components/flash-message';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de eventos',
        href: '/gestion_eventos',
    },
];

type Responsable = {
    id: number;
    nombres: string;
    apellidos: string;
};

type Evento = {
    id: number;
    nombre: string;
    responsable: Responsable | null;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    entidad_organizadora: string;
    direccion: string;
    comuna: { id: number; nombre: string } | null;
    barrio: { id: number; nombre: string } | null;
    estado: boolean;
    estado_evento: string;
};

const estadoEventoBadge: Record<string, { label: string; className: string }> = {
    programado: { label: 'Programado', className: 'bg-blue-100 text-blue-800' },
    en_curso: { label: 'En curso', className: 'bg-yellow-100 text-yellow-800' },
    realizado: { label: 'Realizado', className: 'bg-green-100 text-green-800' },
    cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
};

export default function Index() {
    const { auth } = usePage().props as any;

    const can = (permission: string) => {
        return auth.user.permissions?.includes(permission);
    };

    const { eventos, flash } = usePage().props as unknown as {
        eventos: Evento[];
        flash?: { success?: string; error?: string };
    };

    const [search, setSearch] = useState('');
    const [confirmEvento, setConfirmEvento] = useState<{ id: number; estado: boolean } | null>(null);

    const descargar = (tipo: string) => {
        const params = new URLSearchParams({ search, tipo });
        window.open(`/gestion_eventos/exportar?${params.toString()}`, '_blank');
    };

    const filtered = eventos.filter((e) =>
        e.nombre.toLowerCase().includes(search.toLowerCase())
    );

    const fmt = (date: string) =>
        date
            ? new Date(date + 'T00:00:00').toLocaleDateString('es-CO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            })
            : '-';

    const fmtHora = (hora: string) => hora?.slice(0, 5) ?? '-';

    const handleToggle = (id: number) => {
        router.patch(`/gestion_eventos/${id}/toggle`, {}, {
            onSuccess: () => setConfirmEvento(null),
        });
    };

    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['eventos'],
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Eventos" />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Gestión de eventos</h1>

            <div className="flex flex-col gap-4 sm:gap-6 p-2 sm:p-4 bg-[#F3F4F6] dark:bg-gray-950 text-gray-900 dark:text-gray-200">

                {/* Flash */}
                <FlashMessage success={flash?.success} error={flash?.error} />

                {/* Botón registrar */}
                <div>
                    {can('Crear eventos') && (
                        <Link
                            href="/gestion_eventos/create"
                            className="bg-[#4171B1] hover:bg-[#365f96] text-white px-4 py-2 rounded-md shadow"
                        >
                            <PlusCircle className="text-white w-5 h-5 inline mr-2" />
                            Registrar Evento
                        </Link>
                    )}
                </div>

                {/* Tabla */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">

                    <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="text-[#4171B1] w-5 h-5" />
                            <h2 className="font-bold text-gray-700 dark:text-gray-200">
                                Lista de Eventos({eventos.length})
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
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Nombre</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Responsable</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Entidad</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Fecha</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Horario</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Ubicación</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Estado</th>
                                    <th scope="col" className="p-2 font-semibold text-center whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="dark:text-gray-300">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-4 text-center text-gray-600 dark:text-gray-500">
                                            No se encontraron eventos.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((e) => {
                                        const badge = estadoEventoBadge[e.estado_evento] ?? { label: e.estado_evento, className: 'bg-gray-100 text-gray-700' };
                                        return (
                                            <tr key={e.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="p-2 whitespace-nowrap font-medium">
                                                    {e.nombre}
                                                </td>
                                                <td className="p-2 whitespace-nowrap">
                                                    {e.responsable
                                                        ? `${e.responsable.nombres} ${e.responsable.apellidos}`
                                                        : '-'}
                                                </td>
                                                <td className="p-2 whitespace-nowrap">
                                                    {e.entidad_organizadora ?? '-'}
                                                </td>
                                                <td className="p-2 whitespace-nowrap">
                                                    {fmt(e.fecha)}
                                                </td>
                                                <td className="p-2 whitespace-nowrap">
                                                    {fmtHora(e.hora_inicio)} – {fmtHora(e.hora_fin)}
                                                </td>
                                                <td className="p-2 whitespace-nowrap">
                                                    <div>{e.comuna?.nombre ?? '-'} / {e.barrio?.nombre ?? '-'}</div>
                                                    <div className="text-xs text-gray-600">{e.direccion}</div>
                                                </td>
                                                <td className="p-2 whitespace-nowrap">
                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="p-2 text-center whitespace-nowrap">
                                                    <div className="flex justify-center gap-2">
                                                        {can('Editar eventos') && (
                                                            e.estado_evento === 'realizado' ? (
                                                                <span
                                                                    className="bg-gray-300 dark:bg-gray-600 text-white p-2 rounded-md cursor-not-allowed opacity-50"
                                                                    title="El evento ya fue realizado y no puede ser modificado"
                                                                >
                                                                    <Pencil size={16} />
                                                                </span>
                                                            ) : (
                                                                <Link
                                                                    href={`/gestion_eventos/${e.id}/edit`}
                                                                    className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 p-2 rounded-md"
                                                                    title="Editar"
                                                                    aria-label={`Editar el evento ${e.nombre}`}
                                                                >
                                                                    <Pencil size={16} />
                                                                </Link>
                                                            )
                                                        )}

                                                        {can('Inactivar eventos') && (
                                                            <button
                                                                onClick={() => setConfirmEvento({ id: e.id, estado: e.estado })}
                                                                disabled={e.estado_evento === 'realizado'}
                                                                className={`text-white p-2 rounded-md ${e.estado_evento === 'realizado'
                                                                        ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-50'
                                                                        : e.estado
                                                                            ? 'bg-red-500 hover:bg-red-600'
                                                                            : 'bg-green-500 hover:bg-green-600'
                                                                    }`}
                                                                title={
                                                                    e.estado_evento === 'realizado'
                                                                        ? 'El evento ya fue realizado y no puede ser reactivado'
                                                                        : e.estado ? 'Cancelar evento' : 'Reactivar evento'
                                                                }
                                                                aria-label={
                                                                    e.estado_evento === 'realizado'
                                                                        ? `El evento ${e.nombre} ya fue realizado y no puede ser reactivado`
                                                                        : `${e.estado ? 'Cancelar' : 'Reactivar'} el evento ${e.nombre}`
                                                                }
                                                            >
                                                                {e.estado ? <PowerOff size={16} /> : <Power size={16} />}
                                                            </button>
                                                        )}

                                                        <a
                                                            href={`/gestion_eventos/${e.id}/exportar/solicitudes`}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-gray-900 p-2 rounded-md"
                                                            title="Descargar solicitudes del evento"
                                                            aria-label={`Descargar las solicitudes del evento ${e.nombre}`}
                                                        >
                                                            <FileDown size={16} />
                                                        </a>

                                                        <a
                                                            href={`/gestion_eventos/${e.id}/exportar/atenciones`}
                                                            className="bg-violet-600 hover:bg-violet-700 text-white p-2 rounded-md"
                                                            title="Descargar atenciones del evento"
                                                            aria-label={`Descargar las atenciones del evento ${e.nombre}`}
                                                        >
                                                            <ClipboardList size={16} />
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal de confirmación */}
            {confirmEvento !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                            {confirmEvento.estado ? '¿Cancelar evento?' : '¿Reactivar evento?'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            {confirmEvento.estado
                                ? 'El evento quedará marcado como cancelado.'
                                : 'El evento volverá al estado programado.'}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmEvento(null)}
                                className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleToggle(confirmEvento.id)}
                                className={`px-4 py-2 text-sm rounded-md text-white ${confirmEvento.estado
                                        ? 'bg-red-500 hover:bg-red-600'
                                        : 'bg-green-500 hover:bg-green-600'
                                    }`}
                            >
                                {confirmEvento.estado ? 'Cancelar evento' : 'Reactivar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
