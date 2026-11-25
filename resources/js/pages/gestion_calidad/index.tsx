import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useEffect, useState } from 'react';
import { ClipboardCheck, House, Lock, Pencil, Search, Download } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { FlashMessage } from '@/components/flash-message';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de calidad',
        href: '/gestion_calidad',
    },
];

const estadoGestionBadge = (estado: string | null) => {
    if (!estado) {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                Sin registro
            </span>
        );
    }
    const map: Record<string, { label: string; className: string }> = {
        ejecutada:  { label: 'Ejecutada',  className: 'bg-green-500 text-gray-900 dark:bg-green-600' },
        notificada: { label: 'Notificada', className: 'bg-purple-600 text-white dark:bg-purple-700 dark:text-purple-100' },
        aprobada:   { label: 'Aprobada',   className: 'bg-green-700 text-white dark:bg-green-800' },
        cancelada:  { label: 'Cancelada',  className: 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
        // Desenlaces reportados por el DNP
        sincronizada:  { label: 'Sincronizada',    className: 'bg-blue-600 text-white dark:bg-blue-700' },
        realizada:     { label: 'Realizada',       className: 'bg-green-600 text-gray-900 dark:bg-green-700' },
        pendiente_dnp: { label: 'Pendiente (DNP)', className: 'bg-yellow-700 text-white dark:bg-yellow-800' },
        cancelada_dnp: { label: 'Cancelada (DNP)', className: 'bg-red-900 text-white dark:bg-red-950' },
        rechazada:     { label: 'Rechazada',       className: 'bg-red-700 text-white dark:bg-red-800 dark:text-red-100' },
    };
    const config = map[estado] ?? { label: estado, className: 'bg-gray-100 text-gray-600' };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.className}`}>
            {config.label}
        </span>
    );
};

export default function GestionCalidadIndex() {
    const {
        solicitudes = { data: [], current_page: 1, last_page: 1, total: 0 },
        estados = {},
        paquetes = [],
        filters = {},
        flash,
        auth,
    } = usePage().props as any;

    const [search, setSearch]            = useState((filters as any).search        || '');
    const [estado, setEstado]            = useState((filters as any).estado         || '');
    const [paquete_id, setPaqueteId]     = useState((filters as any).paquete_id     || '');
    const [fecha_inicio, setFechaInicio] = useState((filters as any).fecha_inicio  || '');
    const [fecha_fin, setFechaFin]       = useState((filters as any).fecha_fin     || '');

    const can = (permission: string) => auth?.user?.permissions?.includes(permission);

    const aplicarFiltros = (
        override: Partial<{
            search: string;
            estado: string;
            paquete_id: string;
            fecha_inicio: string;
            fecha_fin: string;
            pagina: number;
        }> = {},
    ) => {
        router.get(
            '/gestion_calidad',
            {
                search,
                estado,
                paquete_id,
                fecha_inicio,
                fecha_fin,
                pagina: solicitudes.current_page,
                ...override,
            },
            { preserveState: true, replace: true },
        );
    };

    const irAPagina = (pagina: number) => aplicarFiltros({ pagina });

    const descargar = (tipo: string) => {
        const params = new URLSearchParams({
            search: search || '',
            estado: estado || '',
            paquete_id: paquete_id || '',
            fecha_inicio: fecha_inicio || '',
            fecha_fin: fecha_fin || '',
            tipo,
        });
        window.open(`/gestion_calidad/exportar?${params.toString()}`, '_blank');
    };

    const limpiarFiltros = () => {
        setSearch('');
        setEstado('');
        setPaqueteId('');
        setFechaInicio('');
        setFechaFin('');
        router.get('/gestion_calidad', {}, { preserveState: true, replace: true });
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
            <Head title="Gestión de calidad" />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Gestión de calidad</h1>

            <div className="flex flex-col gap-4 p-2 sm:p-4 bg-[#F3F4F6] dark:bg-gray-950 text-gray-900 dark:text-gray-200">

                <FlashMessage success={flash?.success} error={flash?.error} />

                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-2 sm:p-4 flex flex-col flex-1 min-h-0">

                    {/* Encabezado */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 pb-4 border-b dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <ClipboardCheck className="text-blue-500 w-5 h-5" />
                            <h2 className="font-semibold text-gray-700 dark:text-gray-200">
                                Lista de solicitudes en calidad ({solicitudes?.total ?? 0})
                            </h2>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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

                    {/* Filtros */}
                    <div className="flex flex-col gap-3 mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                                type="text"
                                placeholder="Buscar por radicado, documento o nombre del solicitante"
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

                            <select
                                value={paquete_id}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setPaqueteId(value);
                                    aplicarFiltros({ paquete_id: value, pagina: 1 });
                                }}
                                className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                            >
                                <option value="">Todos los paquetes</option>
                                {paquetes.map((id: any) => (
                                    <option key={id} value={id}>
                                        {id}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={fecha_inicio}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFechaInicio(value);
                                    aplicarFiltros({ fecha_inicio: value, pagina: 1 });
                                }}
                                className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                                title="Fecha inicio"
                                aria-label="Fecha inicio del filtro de las solicitudes en calidad"
                            />

                            <input
                                type="date"
                                value={fecha_fin}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFechaFin(value);
                                    aplicarFiltros({ fecha_fin: value, pagina: 1 });
                                }}
                                className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                                title="Fecha fin"
                                aria-label="Fecha fin del filtro de las solicitudes en calidad"
                            />

                            <button
                                onClick={limpiarFiltros}
                                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 rounded-md text-sm font-medium text-gray-800 dark:text-gray-200 transition-colors whitespace-nowrap"
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="overflow-x-auto -mx-4">
                        <table className="w-full text-sm text-left table-auto">

                            <thead className="border-b bg-gray-50 dark:bg-gray-800 dark:text-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">ID SisbenApp</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">N° Radicado</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Paquete</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Tipo Documento</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">N° Documento</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Nombre del Solicitante</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Comuna</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Barrio</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Estado</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Cant. Hogares</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Categoría SISBÉN</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Registrado por</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Fecha Resolución</th>
                                    <th scope="col" className="p-2 font-semibold text-center whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="dark:text-gray-300">
                                {!solicitudes?.data || solicitudes.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={13} className="p-4 text-center text-gray-600 dark:text-gray-500">
                                            No hay solicitudes disponibles para Gestión de calidad.
                                        </td>
                                    </tr>
                                ) : (
                                    solicitudes.data.map((s: any) => (
                                        <tr
                                            key={s.id}
                                            className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 align-top"
                                        >
                                            <td className="p-2 whitespace-nowrap font-medium">{s.id_SisbenApp ?? '-'}</td>
                                            <td className="p-2 whitespace-nowrap">{s.num_radicado ?? '-'}</td>
                                            <td className="p-2 whitespace-nowrap">{s.paquete ?? '-'}</td>
                                            <td className="p-2 whitespace-nowrap">{s.ciudadano?.tipo_documento ?? '-'}</td>
                                            <td className="p-2 whitespace-nowrap">{s.ciudadano?.num_documento ?? '-'}</td>
                                            <td className="p-2 min-w-[160px]">{s.ciudadano?.nombre_completo ?? '-'}</td>
                                            <td className="p-2 whitespace-nowrap">{s.comuna?.nombre ?? '-'}</td>
                                            <td className="p-2 min-w-[120px]">{s.barrio?.nombre ?? '-'}</td>
                                            <td className="p-2 whitespace-nowrap">
                                                {estadoGestionBadge(s.estado_gestion ?? null)}
                                            </td>
                                            <td className="p-2 whitespace-nowrap text-center">
                                                {s.cantidad_hogares ?? '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap text-center">
                                                {s.categoria_sisben ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                                        {s.categoria_sisben}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="p-2 min-w-[130px]">{s.usuario_calidad ?? '-'}</td>
                                            <td className="p-2 whitespace-nowrap text-xs">{s.fecha_resolucion ?? '-'}</td>
                                            <td className="p-2 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* Detalle */}
                                                    {can('Ver solicitudes en calidad') && (
                                                        <Link
                                                            href={`/gestion_calidad/${s.id}`}
                                                            title="Ver detalle"
                                                            aria-label={`Ver detalle de la solicitud ${s.num_radicado ?? s.id_SisbenApp ?? s.id}`}
                                                            className="inline-flex items-center px-2 py-1 rounded-md bg-[#4171B1] hover:bg-[#365f96] text-white text-xs font-medium transition-colors"
                                                        >
                                                            Detalle
                                                        </Link>
                                                    )}
                                                    {/* Registrar Hogar: solo cuando ejecutada y sin registro */}
                                                    {can('Crear hogares') && s.estado_gestion === 'ejecutada' && !s.tiene_registro && (
                                                        s.bloqueado_por ? (
                                                            <span
                                                                title={`${s.bloqueado_por} está registrando el hogar de esta solicitud`}
                                                                className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                                                            >
                                                                <Lock className="w-3.5 h-3.5" />
                                                            </span>
                                                        ) : (
                                                            <Link
                                                                href={`/gestion_calidad/${s.id}/registrar-hogar`}
                                                                title="Registrar hogar"
                                                                aria-label={`Registrar el hogar de la solicitud ${s.num_radicado ?? s.id_SisbenApp ?? s.id}`}
                                                                className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-green-600 hover:bg-green-700 text-gray-900 transition-colors"
                                                            >
                                                                <House className="w-3.5 h-3.5" />
                                                            </Link>
                                                        )
                                                    )}
                                                    {/* Editar Hogar: solo quien lo registró y dentro de las 24 horas */}
                                                    {can('Editar hogares') && s.puede_editar_hogar && (
                                                        <Link
                                                            href={`/gestion_calidad/${s.id}/editar-hogar`}
                                                            title="Editar hogar"
                                                            aria-label={`Editar el hogar de la solicitud ${s.num_radicado ?? s.id_SisbenApp ?? s.id}`}
                                                            className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-amber-500 hover:bg-amber-600 text-gray-900 transition-colors"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
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
