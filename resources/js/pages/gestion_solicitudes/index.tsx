import { Tab, Transition } from '@headlessui/react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import type { BreadcrumbItem } from '@/types'
import { useEffect, useRef, useState } from 'react'
import { CircleCheckBig, CircleX, FilePlus, SendToBack, X, Download, Search } from 'lucide-react'
import Pagination from '@/components/Pagination'

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Solicitudes',
        href: '/gestion_solicitudes',
    },
]

/**
 * Texto que identifica una solicitud dentro del nombre accesible de su casilla.
 *
 * Sin esto un lector de pantalla anuncia todas las filas igual ("Seleccionar
 * esta solicitud"), y quien no ve la tabla no puede saber cuál está marcando.
 * Se prefiere el radicado; si falta, el ID SisbenApp, y como último recurso el
 * identificador interno. El nombre del ciudadano se añade para distinguir
 * filas parecidas.
 */
function descripcionSolicitud(solicitud: any): string {
    const referencia = solicitud.num_radicado
        ? `radicado ${solicitud.num_radicado}`
        : solicitud.id_SisbenApp
            ? `ID SisbenApp ${solicitud.id_SisbenApp}`
            : `registro ${solicitud.id}`;

    const ciudadano = solicitud.ciudadano?.nombre_completo;

    return ciudadano ? `${referencia}, de ${ciudadano}` : referencia;
}

export default function Index() {
    const { auth, solicitudes = { data: [], current_page: 1, last_page: 1 }, totalRegistradas = 0, atenciones = { data: [], current_page: 1, last_page: 1 }, flash, asistencialesSolicitudes = [], asistencialesAtenciones = [], filters = {} } = usePage().props as any;

    const [showFlash, setShowFlash] = useState(!!flash?.success);

    const [searchSolicitudes, setSearchSolicitudes] = useState(filters.searchSolicitudes || '');
    const [searchAtenciones, setSearchAtenciones] = useState(filters.searchAtenciones || '');
    const [filtroAsistencial, setFiltroAsistencial] = useState(filters.filtroAsistencial || '');
    const [filtroAsistencialAtencion, setFiltroAsistencialAtencion] = useState(filters.filtroAsistencialAtencion || '');
    const [fechaInicio, setFechaInicio] = useState(filters.fechaInicio || '');
    const [fechaFin, setFechaFin] = useState(filters.fechaFin || '');
    const [fechaInicioAtencion, setFechaInicioAtencion] = useState(filters.fechaInicioAtencion || '');
    const [fechaFinAtencion, setFechaFinAtencion] = useState(filters.fechaFinAtencion || '');
    const [selectedSolicitudes, setSelectedSolicitudes] = useState<number[]>([]);
    const [cargandoSeleccionTotal, setCargandoSeleccionTotal] = useState(false);
    const [confirmCancelar, setConfirmCancelar] = useState<number | null>(null);
    const [motivoCancelar, setMotivoCancelar] = useState('');
    const [confirmEnviarCampo, setConfirmEnviarCampo] = useState(false);

    // Casilla "seleccionar todas": cuántas hay marcadas y si la selección es parcial
    const todasSeleccionadas = totalRegistradas > 0 && selectedSolicitudes.length === totalRegistradas;
    const seleccionParcial = selectedSolicitudes.length > 0 && !todasSeleccionadas;
    const checkboxTodasRef = useRef<HTMLInputElement>(null);

    // `indeterminate` solo existe como propiedad del DOM, no como atributo HTML.
    // Sin esto la casilla se anuncia como "sin marcar" aunque haya filas marcadas.
    useEffect(() => {
        if (checkboxTodasRef.current) {
            checkboxTodasRef.current.indeterminate = seleccionParcial;
        }
    }, [seleccionParcial]);

    useEffect(() => {
        if (flash?.success) {
            setShowFlash(true)
            const timer = setTimeout(() => setShowFlash(false), 10_000)
            return () => clearTimeout(timer)
        }
    }, [flash?.success]);

    const can = (permission: string) => {
        return auth.user.permissions?.includes(permission);
    };

    const aplicarFiltros = (override: Partial<{
        searchSolicitudes: string;
        searchAtenciones: string;
        filtroAsistencial: string;
        filtroAsistencialAtencion: string;
        fechaInicio: string;
        fechaFin: string;
        fechaInicioAtencion: string;
        fechaFinAtencion: string;
        paginaSolicitudes: number;
        paginaAtenciones: number;
    }> = {}) => {
        router.get('/gestion_solicitudes', {
            searchSolicitudes,
            searchAtenciones,
            filtroAsistencial,
            filtroAsistencialAtencion,
            fechaInicio,
            fechaFin,
            fechaInicioAtencion,
            fechaFinAtencion,
            paginaSolicitudes: solicitudes.current_page,
            paginaAtenciones: atenciones.current_page,
            ...override,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const irAPaginaSolicitudes = (pagina: number) => {
        aplicarFiltros({ paginaSolicitudes: pagina });
    };

    const irAPaginaAtenciones = (pagina: number) => {
        aplicarFiltros({ paginaAtenciones: pagina });
    };

    const descargar = (tipo: string) => {
        const params = new URLSearchParams({
            searchSolicitudes: searchSolicitudes || '',
            filtroAsistencial: filtroAsistencial || '',
            fechaInicio: fechaInicio || '',
            fechaFin: fechaFin || '',
            tipo,
        });

        window.open(`/gestion_solicitudes/exportar/efectivas?${params.toString()}`, '_blank');
    };

    const descargarnoefectiva = (tipo: string) => {
        const params = new URLSearchParams({
            searchAtenciones: searchAtenciones || '',
            filtroAsistencialAtencion: filtroAsistencialAtencion || '',
            fechaInicioAtencion: fechaInicioAtencion || '',
            fechaFinAtencion: fechaFinAtencion || '',
            tipo,
        });

        window.open(`/gestion_solicitudes/exportar/no-efectivas?${params.toString()}`, '_blank');
    };

    const cancelarSolicitud = (id: number) => {
        setMotivoCancelar('');
        setConfirmCancelar(id);
    };

    const handleConfirmarCancelar = () => {
        if (confirmCancelar === null) return;
        router.patch(`/gestion_solicitudes/${confirmCancelar}/cancelar`, { motivo_cancelacion: motivoCancelar || undefined }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => { setConfirmCancelar(null); setMotivoCancelar(''); },
        });
    };

    const toggleSeleccionarTodas = async (marcar: boolean) => {
        if (!marcar) {
            setSelectedSolicitudes([]);
            return;
        }

        setCargandoSeleccionTotal(true);
        try {
            const params = new URLSearchParams({
                searchSolicitudes: searchSolicitudes || '',
                filtroAsistencial: filtroAsistencial || '',
                fechaInicio: fechaInicio || '',
                fechaFin: fechaFin || '',
            });
            const res = await fetch(`/gestion_solicitudes/ids-registradas?${params.toString()}`, {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedSolicitudes(data.ids ?? []);
            }
        } finally {
            setCargandoSeleccionTotal(false);
        }
    };

    const enviarACampoMasivo = () => {
        setConfirmEnviarCampo(false);
        router.post('/gestion_solicitudes/enviar-campo-masivo', { ids: selectedSolicitudes }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => setSelectedSolicitudes([]),
        });
    };

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

    useEffect(() => {
            const interval = setInterval(() => {
                router.reload({
                    only: ['solicitudes','atenciones'],
                });
            }, 5000);
    
            return () => clearInterval(interval);
        }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Solicitudes" />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Gestión de solicitudes</h1>

            <div className="flex flex-col gap-4 sm:gap-6 p-2 sm:p-4 bg-[#F3F4F6] dark:bg-gray-950 text-gray-900 dark:text-gray-200">

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
                    <div className="rounded-md border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-4">
                        <div className="flex items-center gap-3">
                            <svg className="h-5 w-5 text-green-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm font-medium text-green-800 dark:text-green-300">{flash?.success}</p>
                        </div>
                    </div>
                </Transition>

                {/* BOTON SUPERIOR */}
                <div>
                    {(can('Crear solicitudes') || can('Crear atenciones')) && (
                        <Link
                            href="/gestion_solicitudes/create"
                            className="bg-[#4171B1] hover:bg-[#365f96] text-white px-4 py-2 rounded-md shadow"
                        >
                            <FilePlus className="text-white w-5 h-5 inline mr-2" />
                            Registrar Solicitud
                        </Link>
                    )}
                </div>

                {/* TABLA EFECTIVOS */}
                {can('Ver solicitudes') && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-2 sm:p-4">

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 pb-4 border-b dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <CircleCheckBig className="text-[#4171B1] w-5 h-5" />
                                <h2 className="font-semibold text-gray-700 dark:text-gray-200">
                                    Lista de solicitudes ({solicitudes?.total || 0})
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

                        <div className="flex flex-col gap-3 mb-4">

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                <input
                                    type="text"
                                    placeholder="Buscar por ID, radicado o documento..."
                                    value={searchSolicitudes}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSearchSolicitudes(value);
                                        aplicarFiltros({
                                            searchSolicitudes: value,
                                            paginaSolicitudes: 1,
                                        });
                                    }}
                                    className="w-full pl-10 pr-3 py-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">

                                <select
                                    value={filtroAsistencial}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFiltroAsistencial(value);
                                        aplicarFiltros({
                                            filtroAsistencial: value,
                                            paginaSolicitudes: 1,
                                        });
                                    }}
                                    className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                                >
                                    <option value="">Todos los asistenciales</option>

                                    {asistencialesSolicitudes.map(
                                        (nombre: string, index: number) => (
                                            <option key={index} value={nombre}>
                                                {nombre}
                                            </option>
                                        )
                                    )}
                                </select>

                                <input
                                    type="date"
                                    value={fechaInicio}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFechaInicio(value);
                                        aplicarFiltros({
                                            fechaInicio: value,
                                            paginaSolicitudes: 1,
                                        });
                                    }}
                                    className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                                    title="Fecha inicio"
                                    aria-label="Fecha inicio del filtro del listado"
                                />

                                <input
                                    type="date"
                                    value={fechaFin}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFechaFin(value);
                                        aplicarFiltros({
                                            fechaFin: value,
                                            paginaSolicitudes: 1,
                                        });
                                    }}
                                    className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                                    title="Fecha fin"
                                    aria-label="Fecha fin del filtro del listado"
                                />

                                <button
                                    onClick={() => {
                                        setSearchSolicitudes('');
                                        setFiltroAsistencial('');
                                        setFechaInicio('');
                                        setFechaFin('');

                                        router.get(
                                            '/gestion_solicitudes',
                                            {},
                                            {
                                                preserveState: true,
                                                preserveScroll: true,
                                                replace: true,
                                            }
                                        );
                                    }}
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
                                        {can('Enviar solicitudes a campo') && (
                                            <th scope="col" className="p-2 font-semibold whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <input
                                                        ref={checkboxTodasRef}
                                                        type="checkbox"
                                                        className="rounded disabled:opacity-50"
                                                        disabled={cargandoSeleccionTotal || totalRegistradas === 0}
                                                        title={
                                                            todasSeleccionadas
                                                                ? 'Deseleccionar todas las solicitudes'
                                                                : 'Seleccionar todas las solicitudes registradas (todas las páginas) para enviar a campo'
                                                        }
                                                        /* El <th scope="col"> solo dice "Enviar a campo", que nombra la columna y no la
                                                           acción de esta casilla. El aria-label la describe por completo e
                                                           incluye cuántas filas abarca, porque son todas las páginas. */
                                                        aria-label={
                                                            todasSeleccionadas
                                                                ? `Deseleccionar las ${totalRegistradas} solicitudes registradas`
                                                                : `Seleccionar las ${totalRegistradas} solicitudes registradas de todas las páginas para enviar a campo`
                                                        }
                                                        checked={todasSeleccionadas}
                                                        onChange={(e) => toggleSeleccionarTodas(e.target.checked)}
                                                    />
                                                    <span>Enviar a campo</span>
                                                </div>
                                            </th>
                                        )}
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">Asistencial</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">ID SisbenApp</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">Nro Radicado</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">Tipo de trámite</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">Fecha de registro</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">Punto de atención / Evento</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">Canal</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">Tipo de documento</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">Nro Documento</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">Solicitante</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">Teléfono</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">Dirección</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">Comuna</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">Barrio</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">Observación</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap">Estado</th>
                                        <th scope="col" className="p-2 font-semibold text-center whitespace-nowrap">Acciones</th>
                                    </tr>
                                </thead>

                                <tbody className="dark:text-gray-300">
                                    {!solicitudes?.data || solicitudes.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={18} className="p-4 text-center text-gray-600 dark:text-gray-500">
                                                No hay solicitudes efectivas registradas.
                                            </td>
                                        </tr>
                                    ) : (
                                        solicitudes.data.map((solicitud: any) => (
                                            <tr
                                                key={solicitud.id}
                                                className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 align-top"
                                            >
                                                {can('Enviar solicitudes a campo') && (
                                                    <td className="p-2">
                                                        {solicitud.estado_gestion === 'registrada' && (
                                                            <div className="flex justify-center">
                                                                <input
                                                                    type="checkbox"
                                                                    className="rounded"
                                                                    title={
                                                                        selectedSolicitudes.includes(solicitud.id)
                                                                            ? 'Quitar esta solicitud del envío a campo'
                                                                            : 'Seleccionar esta solicitud para enviar a campo'
                                                                    }
                                                                    /* El title es la pista para el mouse; el aria-label nombra
                                                                       la fila concreta para quien usa lector de pantalla. */
                                                                    aria-label={
                                                                        selectedSolicitudes.includes(solicitud.id)
                                                                            ? `Quitar del envío a campo la solicitud con ${descripcionSolicitud(solicitud)}`
                                                                            : `Seleccionar para enviar a campo la solicitud con ${descripcionSolicitud(solicitud)}`
                                                                    }
                                                                    checked={selectedSolicitudes.includes(solicitud.id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedSolicitudes(prev => [...prev, solicitud.id]);
                                                                        } else {
                                                                            setSelectedSolicitudes(prev => prev.filter(id => id !== solicitud.id));
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="p-2 min-w-[130px]">
                                                    {solicitud.usuario?.nombre_completo ?? '-'}
                                                </td>
                                                <td className="p-2 whitespace-nowrap">
                                                    {solicitud.id_SisbenApp ?? '-'}
                                                </td>
                                                <td className="p-2 whitespace-nowrap">
                                                    {solicitud.num_radicado ?? '-'}
                                                </td>
                                                <td className="p-2 min-w-[140px]">
                                                    {solicitud.tipo_tramite?.nombre ?? '-'}
                                                </td>
                                                <td className="p-2 whitespace-nowrap">
                                                    {solicitud.creado_el
                                                        ? new Date(solicitud.creado_el).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                                        : '-'}
                                                </td>
                                                <td className="p-2 min-w-[140px]">
                                                    {solicitud.punto_atencion?.nombre ?? solicitud.evento?.nombre ?? '-'}
                                                </td>
                                                <td className="p-2 whitespace-nowrap">
                                                    {solicitud.canal?.nombre ?? '-'}
                                                </td>
                                                <td className="p-2 whitespace-nowrap">
                                                    {solicitud.ciudadano?.tipo_documento ?? '-'}
                                                </td>
                                                <td className="p-2 whitespace-nowrap">
                                                    {solicitud.ciudadano?.num_documento ?? '-'}
                                                </td>
                                                <td className="p-2 min-w-[130px]">
                                                    {solicitud.ciudadano?.nombre_completo ?? '-'}
                                                </td>
                                                <td className="p-2 whitespace-nowrap">
                                                    {solicitud.ciudadano?.telefono ?? '-'}
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
                                                <td className="p-2 min-w-[150px]">
                                                    {solicitud.observacion ?? '-'}
                                                </td>
                                                <td className="p-2 whitespace-nowrap">
                                                    {estadoGestionBadge(solicitud.estado_gestion ?? 'registrada')}
                                                </td>
                                                <td className="p-2 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Link
                                                            href={`/gestion_solicitudes/${solicitud.id}`}
                                                            className="px-2 py-1 rounded-md bg-[#4171B1] hover:bg-[#365f96] text-white text-xs"
                                                        >
                                                            Detalle
                                                        </Link>

                                                        {can('Cancelar solicitudes') && (
                                                            <button
                                                                onClick={() => solicitud.estado_gestion === 'registrada' ? cancelarSolicitud(solicitud.id) : undefined}
                                                                disabled={solicitud.estado_gestion !== 'registrada'}
                                                                className={`text-gray-900 p-1.5 rounded-md transition-colors ${solicitud.estado_gestion === 'registrada' ? 'bg-red-500 hover:bg-red-600 cursor-pointer' : 'bg-red-300 dark:bg-red-900/50 cursor-not-allowed'}`}
                                                                title={solicitud.estado_gestion === 'registrada' ? 'Cancelar solicitud' : 'Solo se pueden cancelar solicitudes en estado "Registrada"'}
                                                                aria-label={solicitud.estado_gestion === 'registrada' ? `Cancelar la solicitud con ${descripcionSolicitud(solicitud)}` : `No se puede cancelar la solicitud con ${descripcionSolicitud(solicitud)}: solo se cancelan las registradas`}
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

                        {can('Enviar solicitudes a campo') && selectedSolicitudes.length > 0 && (
                            <div className="mt-3 flex items-center gap-3">
                                <button
                                    onClick={() => setConfirmEnviarCampo(true)}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded-md shadow text-sm inline-flex items-center gap-2"
                                >
                                    <SendToBack className="w-4 h-4" />
                                    Enviar a campo ({selectedSolicitudes.length})
                                </button>
                            </div>
                        )}

                        {solicitudes.last_page > 1 && (
                            <Pagination
                                currentPage={solicitudes.current_page}
                                lastPage={solicitudes.last_page}
                                total={solicitudes.total || 0}
                                perPage={20}
                                onPageChange={irAPaginaSolicitudes}
                            />
                        )}

                    </div>
                )}

                {/* TABLA NO EFECTIVOS */}
                {can('Ver atenciones') && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-2 sm:p-4">

                        
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 pb-4 border-b dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <CircleCheckBig className="text-[#4171B1] w-5 h-5" />
                                <h2 className="font-semibold text-gray-700 dark:text-gray-200">
                                    Lista de atenciones ({atenciones?.total || 0})
                                </h2>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => descargarnoefectiva('xlsx')}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium text-gray-900 transition-colors"
                                >
                                    <Download size={16} />
                                    Excel
                                </button>

                                <button
                                    onClick={() => descargarnoefectiva('csv')}
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
                                    placeholder="Buscar por documento..."
                                    value={searchAtenciones}
                                    onChange={(e) => {
                                                const value = e.target.value;
                                                setSearchAtenciones(value);
                                                aplicarFiltros({ searchAtenciones: value, paginaAtenciones: 1 });
                                            }}
                                    className="w-full pl-10 pr-3 py-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">

                                <select
                                    value={filtroAsistencialAtencion}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setFiltroAsistencialAtencion(value);
                                                aplicarFiltros({ filtroAsistencialAtencion: value, paginaAtenciones: 1 });
                                            }}
                                    className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                                >
                                    <option value="">Todos los asistenciales</option>

                                    {asistencialesAtenciones.map((nombre: any, index: number) => (
                                                <option key={index} value={nombre}>
                                                    {nombre}
                                                </option>
                                            ))}
                                </select>

                                <input
                                    type="date"
                                    value={fechaInicioAtencion}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setFechaInicioAtencion(value);
                                                aplicarFiltros({ fechaInicioAtencion: value, paginaAtenciones: 1 });
                                            }}
                                    className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                                    title="Fecha inicio"
                                    aria-label="Fecha inicio del filtro del listado"
                                />

                                <input
                                    type="date"
                                    value={fechaFinAtencion}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setFechaFinAtencion(value);
                                                aplicarFiltros({ fechaFinAtencion: value, paginaAtenciones: 1 });
                                            }}
                                    className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                                    title="Fecha fin"
                                    aria-label="Fecha fin del filtro del listado"
                                />

                                <button
                                    onClick={() => {
                                        setSearchAtenciones('');
                                        setFiltroAsistencialAtencion('');
                                        setFechaInicioAtencion('');
                                        setFechaFinAtencion('');

                                        router.get(
                                            '/gestion_solicitudes',
                                            {},
                                            {
                                                preserveState: true,
                                                preserveScroll: true,
                                                replace: true,
                                            }
                                        );
                                    }}
                                    className="px-4 py-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 rounded-md text-sm font-medium text-gray-800 dark:text-gray-200 transition-colors whitespace-nowrap"
                                >
                                    Limpiar
                                </button>

                            </div>
                        </div>

                        <div className="overflow-x-auto -mx-4">
                            <div className="min-w-full inline-block align-middle">
                                <table className="w-full text-sm text-left">

                                    <thead className="border-b bg-gray-50 dark:bg-gray-800 dark:text-gray-200 sticky top-0 z-10">

                                        <tr>
                                            <th scope="col" className="p-2 font-semibold whitespace-nowrap min-w-[120px]">Asistencial</th>
                                            <th scope="col" className="p-2 font-semibold whitespace-nowrap min-w-[100px]">Fecha de registro</th>
                                            <th scope="col" className="p-2 font-semibold whitespace-nowrap min-w-[120px]">Tipo de consulta</th>
                                            <th scope="col" className="p-2 font-semibold whitespace-nowrap min-w-[140px]">Punto de atención / Evento</th>
                                            <th scope="col" className="p-2 font-semibold whitespace-nowrap min-w-[120px]">Canal</th>
                                            <th scope="col" className="p-2 font-semibold whitespace-nowrap min-w-[120px]">Tipo de documento</th>
                                            <th scope="col" className="p-2 font-semibold whitespace-nowrap min-w-[120px]">Nro Documento</th>
                                            <th scope="col" className="p-2 font-semibold whitespace-nowrap min-w-[150px]">Solicitante</th>
                                            <th scope="col" className="p-2 font-semibold whitespace-nowrap min-w-[120px]">Comuna</th>
                                            <th scope="col" className="p-2 font-semibold whitespace-nowrap min-w-[120px]">Barrio</th>
                                            <th scope="col" className="p-2 font-semibold text-center whitespace-nowrap min-w-[80px]">Acciones</th>
                                        </tr>

                                    </thead>

                                    <tbody>

                                        {!atenciones?.data || atenciones.data.length === 0 ? (

                                            <tr>
                                                <td colSpan={11} className="p-4 text-center text-gray-600">
                                                    No hay solicitudes no efectivas registradas.
                                                </td>
                                            </tr>

                                        ) : (

                                            atenciones.data.map((atencion: any) => (

                                                <tr
                                                    key={atencion.id}
                                                    className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 align-top"
                                                >

                                                    <td className="p-2 min-w-[130px]">
                                                        {atencion.usuario?.nombre_completo}
                                                    </td>

                                                    <td className="p-2 whitespace-nowrap text-xs sm:text-sm">{atencion.creado_el}</td>

                                                    <td className="p-2 min-w-[120px] text-xs sm:text-sm">
                                                        {atencion.tipo_consulta?.nombre}
                                                    </td>

                                                    <td className="p-2 min-w-[140px] text-xs sm:text-sm">
                                                        {atencion.punto_atencion?.nombre ?? atencion.evento?.nombre ?? '-'}
                                                    </td>

                                                    <td className="p-2 whitespace-nowrap text-xs sm:text-sm">
                                                        {atencion.canal?.nombre ?? '-'}
                                                    </td>

                                                    <td className="p-2 whitespace-nowrap text-xs sm:text-sm">
                                                        {atencion.ciudadano?.tipo_documento ?? '-'}
                                                    </td>

                                                    <td className="p-2 whitespace-nowrap text-xs sm:text-sm">{atencion.ciudadano?.num_documento}</td>

                                                    <td className="p-2 min-w-[150px] text-xs sm:text-sm">
                                                        {atencion.ciudadano?.nombre_completo}
                                                    </td>

                                                    <td className="p-2 whitespace-nowrap text-xs sm:text-sm">
                                                        {atencion.comuna?.nombre ?? '-'}
                                                    </td>

                                                    <td className="p-2 min-w-[120px] text-xs sm:text-sm">
                                                        {atencion.barrio?.nombre ?? '-'}
                                                    </td>

                                                    <td className="p-2 text-center whitespace-nowrap">
                                                        <Link
                                                            href={`/gestion_atenciones/${atencion.id}`}
                                                            className="px-2 py-1 rounded-md bg-[#4171B1] hover:bg-[#365f96] text-white text-xs inline-block"
                                                        >
                                                            Detalle
                                                        </Link>
                                                    </td>

                                                </tr>

                                            ))

                                        )}

                                    </tbody>

                                </table>
                            </div>
                        </div>

                        {atenciones.last_page > 1 && (
                            <Pagination
                                currentPage={atenciones.current_page}
                                lastPage={atenciones.last_page}
                                total={atenciones.total || 0}
                                perPage={20}
                                onPageChange={irAPaginaAtenciones}
                            />
                        )}

                    </div>
                )}

            </div>

            {/* Modal de confirmación enviar a campo */}
            {confirmEnviarCampo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                            ¿Enviar solicitudes a campo?
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Se enviarán {selectedSolicitudes.length} solicitud{selectedSolicitudes.length !== 1 ? 'es' : ''} a campo. Esta acción cambiará su estado.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmEnviarCampo(false)}
                                className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={enviarACampoMasivo}
                                className="px-4 py-2 text-sm rounded-md text-gray-900 bg-yellow-500 hover:bg-yellow-600"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación cancelar solicitud */}
            {confirmCancelar !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                            ¿Cancelar solicitud?
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            La solicitud quedará marcada como cancelada.
                        </p>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Motivo de cancelación
                            </label>
                            <textarea
                                value={motivoCancelar}
                                onChange={(e) => setMotivoCancelar(e.target.value)}
                                rows={3}
                                placeholder="Ingrese el motivo de cancelación..."
                                className="w-full border dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 resize-none"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setConfirmCancelar(null); setMotivoCancelar(''); }}
                                className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={handleConfirmarCancelar}
                                className="px-4 py-2 text-sm rounded-md text-gray-900 bg-red-500 hover:bg-red-400"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    )
}
