import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useEffect, useState } from 'react';
import { ShieldCheck, Search, X, Download } from 'lucide-react';
import Pagination from '@/components/Pagination';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Auditoría',
        href: '/gestion_auditoria',
    },
];

type Registro = {
    id: number;
    evento: string;
    evento_label: string;
    entidad: string | null;
    entidad_id: number | null;
    entidad_label: string | null;
    descripcion: string | null;
    usuario: string;
    ip: string | null;
    creado_el: string | null;
    tiene_cambios: boolean;
};

type RegistroDetalle = Registro & {
    valores_anteriores: Record<string, unknown> | null;
    valores_nuevos: Record<string, unknown> | null;
    metodo_http: string | null;
};

const eventoBadge = (evento: string, label: string) => {
    const map: Record<string, string> = {
        creado: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        actualizado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        eliminado: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        login_exitoso: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        login_fallido: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
        cuenta_bloqueada: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        envio_a_campo_masivo: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        exporto: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    };
    const className = map[evento] ?? 'bg-gray-100 text-gray-600';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${className}`}>
            {label}
        </span>
    );
};

export default function GestionAuditoriaIndex() {
    const {
        registros = { data: [], current_page: 1, last_page: 1, total: 0 },
        eventos = {},
        usuarios = [],
        filters = {},
    } = usePage().props as any;

    const [search, setSearch] = useState((filters as any).search || '');
    const [evento, setEvento] = useState((filters as any).evento || '');
    const [usuarioId, setUsuarioId] = useState((filters as any).usuario_id || '');
    const [fechaInicio, setFechaInicio] = useState((filters as any).fecha_inicio || '');
    const [fechaFin, setFechaFin] = useState((filters as any).fecha_fin || '');

    const [detalle, setDetalle] = useState<RegistroDetalle | null>(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    const aplicarFiltros = (
        override: Partial<{
            search: string;
            evento: string;
            usuario_id: string;
            fecha_inicio: string;
            fecha_fin: string;
            pagina: number;
        }> = {},
    ) => {
        router.get(
            '/gestion_auditoria',
            {
                search,
                evento,
                usuario_id: usuarioId,
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                pagina: registros.current_page,
                ...override,
            },
            { preserveState: true, replace: true },
        );
    };

    const irAPagina = (pagina: number) => aplicarFiltros({ pagina });

    const limpiarFiltros = () => {
        setSearch('');
        setEvento('');
        setUsuarioId('');
        setFechaInicio('');
        setFechaFin('');
        router.get('/gestion_auditoria', {}, { preserveState: true, replace: true });
    };

    const verDetalle = async (id: number) => {
        setCargandoDetalle(true);
        setDetalle(null);
        try {
            const res = await fetch(`/gestion_auditoria/${id}`, {
                headers: { Accept: 'application/json' },
            });
            const data = await res.json();
            setDetalle(data);
        } finally {
            setCargandoDetalle(false);
        }
    };

    const exportar = (tipo: 'xlsx' | 'csv') => {
        const params = new URLSearchParams({
            search: search || '',
            evento: evento || '',
            usuario_id: usuarioId || '',
            fecha_inicio: fechaInicio || '',
            fecha_fin: fechaFin || '',
            tipo,
        });
        window.open(`/gestion_auditoria/exportar?${params.toString()}`, '_blank');
    };

    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['registros'],
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Auditoría" />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Auditoría</h1>

            <div className="flex flex-col gap-4 p-2 sm:p-4 bg-[#F3F4F6] dark:bg-gray-950 text-gray-900 dark:text-gray-200">

                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-2 sm:p-4 flex flex-col flex-1 min-h-0">

                    {/* Encabezado */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 pb-4 border-b dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="text-[#4171B1] w-5 h-5" />
                            <h2 className="font-semibold text-gray-700 dark:text-gray-200">
                                Registro de auditoría ({registros?.total ?? 0})
                            </h2>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => exportar('xlsx')}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium text-gray-900 transition-colors"
                            >
                                <Download size={16} />
                                Excel
                            </button>
                            <button
                                onClick={() => exportar('csv')}
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
                                placeholder="Buscar por descripción, entidad o IP"
                                value={search}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSearch(value);
                                    aplicarFiltros({ search: value, pagina: 1 });
                                }}
                                className="w-full pl-10 pr-3 py-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                            <select
                                value={evento}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setEvento(value);
                                    aplicarFiltros({ evento: value, pagina: 1 });
                                }}
                                className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1 min-w-[160px]"
                            >
                                <option value="">Todos los eventos</option>
                                {Object.entries(eventos).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label as string}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={usuarioId}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setUsuarioId(value);
                                    aplicarFiltros({ usuario_id: value, pagina: 1 });
                                }}
                                className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1 min-w-[160px]"
                            >
                                <option value="">Todos los usuarios</option>
                                {usuarios.map((u: { id: number; nombre: string }) => (
                                    <option key={u.id} value={u.id}>
                                        {u.nombre}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFechaInicio(value);
                                    aplicarFiltros({ fecha_inicio: value, pagina: 1 });
                                }}
                                className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1 min-w-[140px]"
                                title="Fecha inicio"
                                aria-label="Fecha inicio del filtro de los registros de auditoría"
                            />

                            <input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFechaFin(value);
                                    aplicarFiltros({ fecha_fin: value, pagina: 1 });
                                }}
                                className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1 min-w-[140px]"
                                title="Fecha fin"
                                aria-label="Fecha fin del filtro de los registros de auditoría"
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
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Fecha y hora</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Usuario</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Evento</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Entidad</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Descripción</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">IP</th>
                                    <th scope="col" className="p-2 font-semibold text-center whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="dark:text-gray-300">
                                {!registros?.data || registros.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-4 text-center text-gray-600 dark:text-gray-500">
                                            No se encontraron registros de auditoría.
                                        </td>
                                    </tr>
                                ) : (
                                    registros.data.map((r: Registro) => (
                                        <tr
                                            key={r.id}
                                            className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 align-top"
                                        >
                                            <td className="p-2 whitespace-nowrap text-xs">{r.creado_el ?? '-'}</td>
                                            <td className="p-2 min-w-[140px]">{r.usuario}</td>
                                            <td className="p-2 whitespace-nowrap">{eventoBadge(r.evento, r.evento_label)}</td>
                                            <td className="p-2 whitespace-nowrap">
                                                {r.entidad ? (
                                                    <span>
                                                        {r.entidad}
                                                        {r.entidad_label && (
                                                            <span className="ml-1 text-gray-500 dark:text-gray-400">
                                                                — {r.entidad_label}
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="p-2 min-w-[220px] max-w-[360px]">{r.descripcion ?? '-'}</td>
                                            <td className="p-2 whitespace-nowrap text-xs">{r.ip ?? '-'}</td>
                                            <td className="p-2 text-center whitespace-nowrap">
                                                <button
                                                    onClick={() => verDetalle(r.id)}
                                                    className="inline-flex items-center px-2 py-1 rounded-md bg-[#4171B1] hover:bg-[#365f96] text-white text-xs font-medium transition-colors"
                                                >
                                                    Detalle
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {registros.last_page > 1 && (
                        <Pagination
                            currentPage={registros.current_page}
                            lastPage={registros.last_page}
                            total={registros.total ?? 0}
                            perPage={20}
                            onPageChange={irAPagina}
                        />
                    )}

                </div>
            </div>

            {/* Modal de detalle */}
            {(detalle || cargandoDetalle) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                Detalle del registro
                            </h3>
                            <button
                                onClick={() => setDetalle(null)}
                                className="text-gray-600 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4">
                            {cargandoDetalle ? (
                                <p className="text-center text-gray-600 py-8">Cargando...</p>
                            ) : detalle ? (
                                <div className="flex flex-col gap-4 text-sm">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Campo label="Evento" valor={detalle.evento_label} />
                                        <Campo label="Usuario" valor={detalle.usuario} />
                                        <Campo label="Fecha y hora" valor={detalle.creado_el ?? '-'} />
                                        <Campo
                                            label="Entidad"
                                            valor={detalle.entidad
                                                ? `${detalle.entidad}${detalle.entidad_label ? ` — ${detalle.entidad_label}` : ''}`
                                                : '-'}
                                        />
                                        <Campo label="IP" valor={detalle.ip ?? '-'} />
                                        <Campo label="Método HTTP" valor={detalle.metodo_http ?? '-'} />
                                    </div>

                                    <Campo label="Descripción" valor={detalle.descripcion ?? '-'} />

                                    {detalle.tiene_cambios && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                            <div>
                                                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Antes</p>
                                                <pre className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-xs overflow-x-auto text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                                    {detalle.valores_anteriores
                                                        ? JSON.stringify(detalle.valores_anteriores, null, 2)
                                                        : '—'}
                                                </pre>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Después</p>
                                                <pre className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 text-xs overflow-x-auto text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                                    {detalle.valores_nuevos
                                                        ? JSON.stringify(detalle.valores_nuevos, null, 2)
                                                        : '—'}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

function Campo({ label, valor }: { label: string; valor: string }) {
    return (
        <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-gray-800 dark:text-gray-200 break-words">{valor}</p>
        </div>
    );
}
