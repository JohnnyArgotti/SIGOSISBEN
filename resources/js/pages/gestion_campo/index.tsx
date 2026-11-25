import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useEffect, useState } from 'react';
import { MapPin, Download, Search, Package, FilePlus } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { FlashMessage } from '@/components/flash-message';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Campo',
        href: '/gestion_campo',
    },
];

const estadoGestionBadge = (estado: string) => {
    const map: Record<string, { label: string; className: string }> = {
        registrada: { label: 'Registrada', className: 'bg-white text-gray-800 border border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600' },
        enviada_a_campo: { label: 'Enviada a campo', className: 'bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300' },
        asignada: { label: 'Asignada', className: 'bg-blue-200 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
        entregada: { label: 'Entregada', className: 'bg-blue-700 text-white dark:bg-blue-800 dark:text-blue-100' },
        ejecutada: { label: 'Ejecutada', className: 'bg-green-500 text-gray-900 dark:bg-green-600 dark:text-green-50' },
        notificada: { label: 'Notificada', className: 'bg-purple-600 text-white dark:bg-purple-700 dark:text-purple-100' },
        aprobada: { label: 'Aprobada', className: 'bg-green-700 text-white dark:bg-green-800' },
        cancelada: { label: 'Cancelada', className: 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
        rechazada: { label: 'Rechazada', className: 'bg-red-700 text-white dark:bg-red-800 dark:text-red-100' },
        pendiente: { label: 'Pendiente', className: 'bg-orange-400 text-gray-900 dark:bg-orange-500 dark:text-white' },
        // Desenlaces reportados por el DNP
        sincronizada: { label: 'Sincronizada', className: 'bg-blue-600 text-white dark:bg-blue-700' },
        realizada: { label: 'Realizada', className: 'bg-green-600 text-gray-900 dark:bg-green-700' },
        pendiente_dnp: { label: 'Pendiente (DNP)', className: 'bg-yellow-700 text-white dark:bg-yellow-800' },
        cancelada_dnp: { label: 'Cancelada (DNP)', className: 'bg-red-900 text-white dark:bg-red-950' },
    };
    const config = map[estado] ?? { label: estado, className: 'bg-gray-100 text-gray-600' };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.className}`}>
            {config.label}
        </span>
    );
};

export default function GestionCampoIndex() {
    const { solicitudes = { data: [], current_page: 1, last_page: 1, total: 0 }, estados = {}, filters = {}, flash, auth } = usePage().props as any;

    const [search, setSearch] = useState((filters as any).search || '');
    const [estado, setEstado] = useState((filters as any).estado || '');
    const [fecha_inicio, setFecha_inicio] = useState((filters as any).fecha_inicio || '');
    const [fecha_fin, setFecha_fin] = useState((filters as any).fecha_fin || '');
    const can = (permission: string) => auth?.user?.permissions?.includes(permission);

    const aplicarFiltros = (override: Partial<{ search: string; estado: string; fecha_inicio: string; fecha_fin: string; pagina: number }> = {}) => {
        router.get('/gestion_campo', {
            search,
            estado,
            fecha_inicio,
            fecha_fin,
            pagina: solicitudes.current_page,
            ...override,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const irAPagina = (pagina: number) => {
        aplicarFiltros({ pagina });
    };

    const descargarExcel = () => {
        const params = new URLSearchParams({
            search,
            estado,
            fecha_inicio,
            fecha_fin,
        }).toString();
        window.location.href = `/gestion_campo/exportar/excel?${params}`;
    };

    const descargarCsv = () => {
        const params = new URLSearchParams({
            search,
            estado,
            fecha_inicio,
            fecha_fin,
        }).toString();
        window.location.href = `/gestion_campo/exportar/csv?${params}`;
    };

    const limpiarFiltros = () => {
        setSearch('');
        setEstado('');
        setFecha_inicio('');
        setFecha_fin('');
        router.get('/gestion_campo', {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['solicitudes'],
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Campo" />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Gestión de campo</h1>

            <div className="flex flex-col gap-4 p-2 sm:p-4 bg-[#F3F4F6] dark:bg-gray-950 text-gray-900 dark:text-gray-200">

                <FlashMessage success={flash?.success} error={flash?.error} />

                {/* BOTONES SUPERIORES */}
                <div className="flex flex-wrap gap-2">
                    {can('Ver paquetes') && (
                        <Link
                            href="/gestion_campo/package"
                            className="bg-[#4171B1] hover:bg-[#365f96] text-white px-4 py-2 rounded-md shadow inline-flex items-center justify-center gap-2"
                        >
                            <Package className="w-5 h-5" />
                            <span className="text-sm sm:text-base">Lista de paquetes</span>
                        </Link>
                    )}
                    {can('Crear paquetes') && (
                        <Link
                            href="/gestion_campo/create"
                            className="bg-[#4171B1] hover:bg-[#365f96] text-white px-4 py-2 rounded-md shadow inline-flex items-center justify-center gap-2"
                        >
                            <FilePlus className="w-5 h-5" />
                            <span className="text-sm sm:text-base">Registrar paquete</span>
                        </Link>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-2 sm:p-4 flex flex-col flex-1 min-h-0">

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 pb-4 border-b dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <MapPin className="text-yellow-500 w-5 h-5" />
                            <h2 className="font-semibold text-gray-700 dark:text-gray-200">
                                Lista de solicitudes en campo ({solicitudes?.total ?? 0})
                            </h2>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <button
                                onClick={descargarExcel}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium text-gray-900 transition-colors"
                            >
                                <Download size={16} />
                                Excel
                            </button>
                            <button
                                onClick={descargarCsv}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium text-white transition-colors"
                            >
                                <Download size={16} />
                                CSV
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                                type="text"
                                placeholder="Buscar por ID, radicado o documento..."
                                value={search}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSearch(value);
                                    aplicarFiltros({ search: value, pagina: 1 });
                                }}
                                className="w-full pl-10 pr-3 py-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                            <select
                                value={estado}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setEstado(value);
                                    aplicarFiltros({ estado: value, pagina: 1 });
                                }}
                                className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                            >
                                <option value="">Todos los estados</option>
                                {Object.entries(estados).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label as string}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={fecha_inicio}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFecha_inicio(value);
                                    aplicarFiltros({ fecha_inicio: value, pagina: 1 });
                                }}
                                className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                                title="Fecha inicio"
                                aria-label="Fecha inicio del filtro de las solicitudes en campo"
                            />

                            <input
                                type="date"
                                value={fecha_fin}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFecha_fin(value);
                                    aplicarFiltros({ fecha_fin: value, pagina: 1 });
                                }}
                                className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                                title="Fecha fin"
                                aria-label="Fecha fin del filtro de las solicitudes en campo"
                            />

                            <button
                                onClick={limpiarFiltros}
                                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 rounded-md text-sm font-medium text-gray-800 dark:text-gray-200 transition-colors whitespace-nowrap"
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto -mx-4">
                        <table className="w-full text-sm text-left table-auto">

                            <thead className="border-b bg-gray-50 dark:bg-gray-800 dark:text-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">ID SisbenApp</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Nro Radicado</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Tipo de trámite</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Fecha de registro</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Fecha de respuesta</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Nro Documento</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Solicitante</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Dirección</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Comuna</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Barrio</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Paquete</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Código encuestador</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Nombre encuestador</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Fecha de ejecución</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Fecha de notificación</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Fecha primera visita</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Motivo primera visita</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Fecha segunda visita</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Motivo segunda visita</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Observación</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Estado</th>
                                    <th scope="col" className="p-2 font-semibold text-center whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="dark:text-gray-300">
                                {!solicitudes?.data || solicitudes.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={22} className="p-4 text-center text-gray-600 dark:text-gray-500">
                                            No hay solicitudes enviadas a campo.
                                        </td>
                                    </tr>
                                ) : (
                                    solicitudes.data.map((solicitud: any) => (
                                        <tr
                                            key={solicitud.id}
                                            className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 align-top"
                                        >
                                            <td className="p-2 whitespace-nowrap">
                                                {solicitud.id_SisbenApp ?? '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                {solicitud.num_radicado ?? '-'}
                                            </td>
                                            <td className="p-2 min-w-[140px]">
                                                {solicitud.tipo_tramite?.nombre ?? '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap text-xs">
                                                {solicitud.creado_el ?? '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap text-xs">
                                                {solicitud.fecha_respuesta ?? '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                {solicitud.ciudadano?.num_documento ?? '-'}
                                            </td>
                                            <td className="p-2 min-w-[130px]">
                                                {solicitud.ciudadano?.nombre_completo ?? '-'}
                                            </td>
                                            <td className="p-2 min-w-[130px]">
                                                {solicitud.direccion ?? '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                {solicitud.comuna?.nombre ?? '-'}
                                            </td>
                                            <td className="p-2 min-w-[120px]">
                                                {solicitud.barrio?.nombre ?? '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                {solicitud.paquete ? `${solicitud.paquete.id}` : '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap text-xs">
                                                {solicitud.paquete?.encuestador?.codigo ?? '-'}
                                            </td>
                                            <td className="p-2 min-w-[130px]">
                                                {solicitud.paquete?.encuestador?.nombre_completo ?? '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap text-xs">
                                                {solicitud.fecha_ejecucion ?? '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap text-xs">
                                                {solicitud.fecha_notificacion ?? '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap text-xs">
                                                {solicitud.fecha_visita1 ?? '-'}
                                            </td>
                                            <td className="p-2 min-w-[150px]">
                                                {solicitud.motivo_visita1 ?? '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap text-xs">
                                                {solicitud.fecha_visita2 ?? '-'}
                                            </td>
                                            <td className="p-2 min-w-[150px]">
                                                {solicitud.motivo_visita2 ?? '-'}
                                            </td>
                                            <td className="p-2 min-w-[150px]">
                                                {solicitud.observacion ?? '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                {estadoGestionBadge(solicitud.estado_gestion ?? 'enviada_a_campo')}
                                            </td>
                                            <td className="p-2 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    {can('Ver solicitudes en campo') && (
                                                        <Link
                                                            href={`/gestion_campo/solicitudes/${solicitud.id}`}
                                                            className="px-2 py-1 rounded-md bg-[#4171B1] hover:bg-[#365f96] text-white text-xs"
                                                        >
                                                            Detalle
                                                        </Link>
                                                    )}

                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>

                        </table>
                    </div>

                    {solicitudes.last_page > 1 && (
                        <Pagination
                            currentPage={solicitudes.current_page}
                            lastPage={solicitudes.last_page}
                            total={solicitudes.total ?? 0}
                            perPage={20}
                            onPageChange={irAPagina}
                        />
                    )}

                </div>

            </div>
        </AppLayout>
    );
}





