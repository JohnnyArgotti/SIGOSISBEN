import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useEffect, useState } from 'react';
import { Package, FilePlus, Download, FileSpreadsheet, FileText, X } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { FlashMessage } from '@/components/flash-message';

const estadoPaqueteBadge = (estado: string) => {
    const map: Record<string, { label: string; className: string }> = {
        sin_entregar:  { label: 'Sin entregar',  className: 'bg-orange-100 text-orange-700' },
        sin_completar: { label: 'Sin completar', className: 'bg-amber-100 text-amber-800' },
        completado:    { label: 'Completado',    className: 'bg-green-100 text-green-700' },
        cancelado:     { label: 'Cancelado',     className: 'bg-red-100 text-red-700' },
    };
    const config = map[estado] ?? { label: estado, className: 'bg-gray-100 text-gray-600' };
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
            {config.label}
        </span>
    );
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Campo',
        href: '/gestion_campo',
    },
    {
        title: 'Lista de Paquetes',
        href: '/gestion_campo/package',
    },
];

export default function PaqueteIndex() {
    const { auth, paquetes = { data: [], current_page: 1, last_page: 1, total: 0 }, encuestadores = [], filters = {}, flash } = usePage().props as any;

    const can = (permission: string) => {
        return auth.user.permissions?.includes(permission);
    };

    const [search, setSearch] = useState((filters as any).search || '');
    const [encuestador_id, setEncuestador_id] = useState((filters as any).encuestador_id || '');
    const [fecha_inicio, setFecha_inicio] = useState((filters as any).fecha_inicio || '');
    const [fecha_fin, setFecha_fin] = useState((filters as any).fecha_fin || '');
    const [confirmCancelar, setConfirmCancelar] = useState<number | null>(null);

    const aplicarFiltros = (
        override: Partial<{
            search: string;
            encuestador_id: string;
            fecha_inicio: string;
            fecha_fin: string;
            pagina: number;
        }> = {}
    ) => {
        router.get('/gestion_campo/package', {
            search,
            encuestador_id,
            fecha_inicio,
            fecha_fin,
            pagina: paquetes.current_page,
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
            encuestador_id,
            fecha_inicio,
            fecha_fin,
        }).toString();
        window.location.href = `/gestion_campo/package/exportar/excel?${params}`;
    };

    const descargarCsv = () => {
        const params = new URLSearchParams({
            search,
            encuestador_id,
            fecha_inicio,
            fecha_fin,
        }).toString();
        window.location.href = `/gestion_campo/package/exportar/csv?${params}`;
    };

    const handleCancelar = (id: number) => {
        router.patch(`/gestion_campo/package/${id}/cancelar`, {}, {
            preserveScroll: true,
            onSuccess: () => setConfirmCancelar(null),
        });
    };

    const limpiarFiltros = () => {
        setSearch('');
        setEncuestador_id('');
        setFecha_inicio('');
        setFecha_fin('');

        router.get('/gestion_campo/package', {
            pagina: 1,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['paquetes'],
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Campo - Lista de Paquetes" />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Lista de paquetes</h1>

            <div className="flex flex-col gap-4 p-2 sm:p-4 bg-[#F3F4F6] dark:bg-gray-950 text-gray-900 dark:text-gray-200">

                <FlashMessage success={flash?.success} error={flash?.error} />

                {/* BOTÓN SUPERIOR */}
                {can('Crear paquetes') && (
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/gestion_campo/create"
                            className="bg-[#4171B1] hover:bg-[#365f96] text-white px-4 py-2 rounded-md shadow inline-flex items-center justify-center gap-2"
                        >
                            <FilePlus className="w-5 h-5" />
                            <span className="text-sm sm:text-base">Registrar paquete</span>
                        </Link>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-2 sm:p-4 flex flex-col flex-1 min-h-0">

                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-3">

                        <div className="flex items-center gap-2">
                            <Package className="text-blue-500 w-5 h-5" />
                            <h2 className="font-semibold text-gray-700 dark:text-gray-200">
                                Lista de paquetes ({paquetes?.total ?? 0})
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
                    <div className="flex flex-col gap-3 mb-4 w-full">

                        {/* Buscador */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar por código de paquete"
                                value={search}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSearch(value);
                                    aplicarFiltros({ search: value, pagina: 1 });
                                }}
                                className="w-full px-3 py-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            />
                        </div>

                        {/* Filtros */}
                        <div className="flex flex-col sm:flex-row gap-2">

                            <select
                                value={encuestador_id}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setEncuestador_id(value);
                                    aplicarFiltros({ encuestador_id: value, pagina: 1 });
                                }}
                                className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                            >
                                <option value="">Todos los encuestadores</option>
                                {encuestadores.map((enc: any) => (
                                    <option key={enc.id} value={enc.id}>
                                        {enc.label}
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
                                aria-label="Fecha inicio del filtro de los paquetes"
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
                                aria-label="Fecha fin del filtro de los paquetes"
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
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Código</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Creado por</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Asignado a</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Fecha de creación</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Estado</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Acción</th>
                                </tr>
                            </thead>

                            <tbody className="dark:text-gray-300">
                                {!paquetes?.data || paquetes.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-4 text-center text-gray-600 dark:text-gray-500">
                                            No hay paquetes registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    paquetes.data.map((paquete: any) => (
                                        <tr
                                            key={paquete.id}
                                            className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 align-top"
                                        >
                                            <td className="p-2 whitespace-nowrap font-medium">
                                                {paquete.id}
                                            </td>
                                            <td className="p-2 min-w-[140px]">
                                                {paquete.creado_por}
                                            </td>
                                            <td className="p-2 min-w-[140px]">
                                                {paquete.asignado_a}
                                            </td>
                                            <td className="p-2 whitespace-nowrap text-xs">
                                                {paquete.creado_el ?? '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                {estadoPaqueteBadge(paquete.estado ?? '')}
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Link
                                                        href={`/gestion_campo/package/${paquete.id}`}
                                                        className="inline-flex items-center px-3 py-1 text-xs rounded-md bg-[#3F73B3] hover:bg-[#365f96] text-white transition-colors"
                                                    >
                                                        Detalle
                                                    </Link>
                                                    <a
                                                        href={`/gestion_campo/package/${paquete.id}/exportar/excel`}
                                                        className="p-1.5 rounded-md bg-green-600 hover:bg-green-700 text-gray-900 transition-colors"
                                                        title="Descargar solicitudes del paquete en Excel"
                                                        aria-label={`Descargar en Excel las solicitudes del paquete ${paquete.id}`}
                                                    >
                                                        <FileSpreadsheet size={14} />
                                                    </a>
                                                    <a
                                                        href={`/gestion_campo/package/${paquete.id}/exportar/csv`}
                                                        className="p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                                        title="Descargar solicitudes del paquete en CSV"
                                                        aria-label={`Descargar en CSV las solicitudes del paquete ${paquete.id}`}
                                                    >
                                                        <FileText size={14} />
                                                    </a>
                                                    {paquete.cancelar_bloqueado_por_entrega && (
                                                        <button
                                                            disabled
                                                            title="Bloqueado: el paquete ya fue entregado"
                                                        aria-label={`No se puede cancelar el paquete ${paquete.id}: ya fue entregado`}
                                                            className="p-1.5 rounded-md bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}

                                                    {paquete.puede_cancelar && (
                                                        <button
                                                            onClick={() => setConfirmCancelar(paquete.id)}
                                                            title="Cancelar paquete"
                                                        aria-label={`Cancelar el paquete ${paquete.id}`}
                                                            className="p-1.5 rounded-md bg-red-500 hover:bg-red-600 text-gray-900 transition-colors cursor-pointer"
                                                        >
                                                            <X size={14} />
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

                    {paquetes.last_page > 1 && (
                        <Pagination
                            currentPage={paquetes.current_page}
                            lastPage={paquetes.last_page}
                            total={paquetes.total ?? 0}
                            perPage={20}
                            onPageChange={irAPagina}
                        />
                    )}

                </div>

            </div>

            {/* CONFIRMACIÓN CANCELAR PAQUETE */}
            {confirmCancelar !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                            ¿Cancelar paquete {confirmCancelar}?
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Si cancelas este paquete, <strong>todas las solicitudes asociadas quedarán liberadas</strong> (volverán a estado "Enviada a campo") y podrán asignarse a otro paquete. <strong>El paquete no se puede reactivar.</strong>
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmCancelar(null)}
                                className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Volver
                            </button>
                            <button
                                onClick={() => handleCancelar(confirmCancelar)}
                                className="px-4 py-2 text-sm rounded-md text-gray-900 bg-red-500 hover:bg-red-400"
                            >
                                Cancelar paquete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}