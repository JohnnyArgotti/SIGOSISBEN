import { Head, router, usePage } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import type { BreadcrumbItem } from '@/types'
import { useEffect, useRef, useState } from 'react'
import { AlertCircle, MapPin, Plus, Minus, Users, Search, Eye, X } from 'lucide-react'
import Pagination from '@/components/Pagination'

// Lee el CSRF token de la cookie que Laravel setea automáticamente
const getCsrfToken = (): string => {
    const match = document.cookie.split('; ').find((r) => r.startsWith('XSRF-TOKEN='))
    return match ? decodeURIComponent(match.split('=')[1]) : ''
}

// Fetch helper con CSRF para llamadas AJAX internas
const apiFetch = (url: string, method = 'POST'): Promise<Response> =>
    fetch(url, {
        method,
        headers: {
            'X-XSRF-TOKEN': getCsrfToken(),
            Accept: 'application/json',
        },
    })

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Campo',
        href: '/gestion_campo',
    },
    {
        title: 'Crear Paquete',
        href: '/gestion_campo/create',
    },
]

const estadoGestionBadge = (estado: string) => {
    const map: Record<string, { label: string; className: string }> = {
        registrada:           { label: 'Registrada',           className: 'bg-white text-gray-800 border border-gray-300' },
        enviada_a_campo:      { label: 'Enviada a campo',      className: 'bg-amber-200 text-amber-900' },
        asignada:             { label: 'Asignada',             className: 'bg-blue-200 text-blue-800' },
        entregada:            { label: 'Entregada',            className: 'bg-blue-700 text-white' },
        ejecutada:            { label: 'Ejecutada',            className: 'bg-green-500 text-gray-900' },
        notificada:           { label: 'Notificada',           className: 'bg-purple-600 text-white' },
        aprobada:             { label: 'Aprobada',             className: 'bg-green-700 text-white' },
        cancelada:            { label: 'Cancelada',            className: 'bg-red-200 text-red-800' },
        rechazada:            { label: 'Rechazada',            className: 'bg-red-700 text-white' },
        pendiente:            { label: 'Pendiente',            className: 'bg-orange-400 text-gray-900' },
        // Desenlaces reportados por el DNP
        sincronizada:         { label: 'Sincronizada',         className: 'bg-blue-600 text-white' },
        realizada:            { label: 'Realizada',            className: 'bg-green-600 text-gray-900' },
        pendiente_dnp:        { label: 'Pendiente (DNP)',      className: 'bg-yellow-700 text-white' },
        cancelada_dnp:        { label: 'Cancelada (DNP)',      className: 'bg-red-900 text-white' },
    }
    const config = map[estado] ?? { label: estado, className: 'bg-gray-100 text-gray-600' }
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.className}`}>
            {config.label}
        </span>
    )
}

export default function Create() {

    const {
        solicitudes = {
            data: [],
            total: 0,
            current_page: 1,
            last_page: 1
        },
        encuestadores = [],
        comunas = [],
        selectedComuna = null,
        reservadasPropias = [],
        reservadasPorOtros = [],
        filters = {},
    } = usePage().props as any

    const [search, setSearch] = useState('')
    const [comunaSeleccionada, setComunaSeleccionada] = useState(selectedComuna || '')
    const [fechaInicio, setFechaInicio] = useState(filters.fecha_inicio || '')
    const [fechaFin, setFechaFin] = useState(filters.fecha_fin || '')
    const [seleccionadas, setSeleccionadas] = useState<any[]>(reservadasPropias)
    const [encuestadorSeleccionado, setEncuestadorSeleccionado] = useState<string>('')
    const [modalAbierto, setModalAbierto] = useState(false)
    const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    // IDs reservados por OTROS usuarios. El listado sí trae esas filas (para poder
    // volver a mostrarlas cuando se liberen), así que se siembra el set con lo que
    // reporta el servidor al renderizar y el polling lo mantiene al día.
    const [reservadasIds, setReservadasIds] = useState<Set<number>>(new Set(reservadasPorOtros))
    // Notificación inline para conflictos de reserva
    const [conflicto, setConflicto] = useState<string | null>(null)

    // Ref para siempre acceder a los IDs actuales de la página sin reiniciar el intervalo
    const solicitudesDataRef = useRef<any[]>(solicitudes.data)
    useEffect(() => {
        solicitudesDataRef.current = solicitudes.data
    }, [solicitudes.data])

    // --- Polling: actualiza la lista de IDs no disponibles cada 2 s ---
    // Incluye: reservadas por otros + las del snapshot actual que ya cambiaron de estado.
    // Se detiene mientras la pestaña está oculta y se sincroniza de inmediato al volver:
    // una pestaña olvidada en segundo plano no necesita refrescar nada.
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null

        const fetchReservadas = () => {
            const pageIds = solicitudesDataRef.current.map((s: any) => s.id)
            const qs = pageIds.length
                ? '?' + pageIds.map((id: number) => `ids[]=${id}`).join('&')
                : ''
            fetch(`/gestion_campo/solicitudes/reservadas${qs}`, {
                headers: { Accept: 'application/json' },
            })
                .then((r) => r.json())
                // Si la sesión expiró el endpoint responde {message}, no un arreglo
                .then((ids: number[]) => {
                    if (Array.isArray(ids)) setReservadasIds(new Set(ids))
                })
                .catch(() => { })
        }

        const iniciar = () => {
            if (interval) return
            fetchReservadas()
            interval = setInterval(fetchReservadas, 2000)
        }

        const detener = () => {
            if (interval) {
                clearInterval(interval)
                interval = null
            }
        }

        const alCambiarVisibilidad = () => (document.hidden ? detener() : iniciar())

        if (!document.hidden) iniciar()
        document.addEventListener('visibilitychange', alCambiarVisibilidad)

        return () => {
            detener()
            document.removeEventListener('visibilitychange', alCambiarVisibilidad)
        }
    }, [])

    // --- Limpieza al abandonar la página (SPA nav + cierre de pestaña) ---
    useEffect(() => {
        const handleUnload = () => {
            const token =
                document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
            const data = new FormData()
            data.append('_token', token)
            navigator.sendBeacon('/gestion_campo/solicitudes/liberar-todas', data)
        }
        window.addEventListener('beforeunload', handleUnload)
        return () => {
            window.removeEventListener('beforeunload', handleUnload)
            // Cleanup al desmontar el componente (navegación SPA)
            apiFetch('/gestion_campo/solicitudes/liberar-todas').catch(() => { })
        }
    }, [])

    // --- Heartbeat: renueva las reservas activas cada 90 s para evitar expiración ---
    // Si el navegador se cierra abruptamente los heartbeats se detienen y en ≤5 min
    // las solicitudes quedan disponibles para otros usuarios.
    // A diferencia del polling, este NO se pausa con la pestaña oculta: las reservas
    // del usuario deben seguir vivas aunque esté trabajando en otra pestaña.
    useEffect(() => {
        if (seleccionadas.length === 0) return
        const id = setInterval(() => {
            apiFetch('/gestion_campo/solicitudes/heartbeat').catch(() => { })
        }, 90_000)
        return () => clearInterval(id)
    }, [seleccionadas.length])

    const mostrarConflicto = (msg: string) => {
        setConflicto(msg)
        setTimeout(() => setConflicto(null), 5000)
    }

    const solicitudesDisponibles = solicitudes.data.filter(
        (item: any) =>
            item.estado_gestion === 'enviada_a_campo' &&
            !seleccionadas.find((s) => s.id === item.id) &&
            !reservadasIds.has(item.id) &&
            (item.num_radicado?.toString().toLowerCase().includes(search.toLowerCase()) ||
                item.id_SisbenApp?.toString().toLowerCase().includes(search.toLowerCase()) ||
                item.ciudadano?.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
                item.ciudadano?.num_documento?.toString().includes(search.toLowerCase()))
    )

    // Obtener comunas únicas de las solicitudes disponibles (después de filtros)
    const comunasDisponibles = Array.from(
        new Map(
            solicitudesDisponibles
                .filter((item: any) => item.comuna)
                .map((item: any) => [item.comuna.id, item.comuna])
        ).values()
    ).sort((a: any, b: any) => a.id - b.id)

    const agregarSolicitud = async (solicitud: any) => {
        // 1. Actualizar UI inmediatamente (optimista)
        setSeleccionadas((prev) => [...prev, solicitud])

        // 2. Reservar en el servidor en segundo plano
        try {
            const res = await apiFetch(`/gestion_campo/solicitudes/${solicitud.id}/reservar`)
            if (res.status === 409) {
                // Revertir: otro usuario llegó primero
                setSeleccionadas((prev) => prev.filter((s) => s.id !== solicitud.id))
                mostrarConflicto('Esta solicitud fue tomada por otro usuario en este momento.')
                setReservadasIds((prev) => new Set([...prev, solicitud.id]))
            }
            // Otros errores (red, CSRF caducado, etc.): dejamos el ítem
            // en seleccionadas y el polling corregirá el estado en ~5 s
        } catch {
            // Error de red: ítem queda seleccionado, se sincroniza con el siguiente poll
        }
    }

    const verDetalles = (solicitud: any) => {
        setSolicitudSeleccionada(solicitud)
        setModalAbierto(true)
    }

    const cerrarModal = () => {
        setModalAbierto(false)
        setSolicitudSeleccionada(null)
    }

    const quitarSolicitud = (id: number) => {
        // 1. Quitar de la UI de inmediato, sin esperar al servidor
        setSeleccionadas((prev) => prev.filter((item) => item.id !== id))
        // 2. Liberar en servidor en segundo plano (fire-and-forget)
        apiFetch(`/gestion_campo/solicitudes/${id}/liberar`).catch(() => { })
    }

    const guardarPaquete = () => {
        if (!encuestadorSeleccionado) {
            mostrarConflicto('Debes seleccionar un encuestador antes de registrar el paquete.')
            return
        }

        setIsSubmitting(true)
        router.post(
            '/gestion_campo',
            {
                encuestador_id: parseInt(encuestadorSeleccionado),
                solicitudes: seleccionadas.map((item) => item.id),
            },
            {
                onError: (errors) => {
                    if (errors.solicitudes) {
                        mostrarConflicto(errors.solicitudes)
                    }
                },
                onFinish: () => setIsSubmitting(false),
            },
        )
    }

    const irAPagina = (pagina: number) => {
        aplicarFiltros({
            comuna: comunaSeleccionada,
            inicio: fechaInicio,
            fin: fechaFin,
            page: pagina,
        })
    }

    const aplicarFiltroComuna = (comuna: string) => {
        setComunaSeleccionada(comuna)

        aplicarFiltros({
            comuna,
            inicio: fechaInicio,
            fin: fechaFin,
            page: 1,
        })
    }

    const aplicarFiltros = ({
        comuna = comunaSeleccionada,
        inicio = fechaInicio,
        fin = fechaFin,
        page = 1,
    }: {
        comuna?: string
        inicio?: string
        fin?: string
        page?: number
    } = {}) => {
        router.get(
            '/gestion_campo/create',
            {
                page,
                comuna_id: comuna || undefined,
                fecha_inicio: inicio || undefined,
                fecha_fin: fin || undefined,
            },
            {
                preserveState: true,
                replace: true,
            }
        )
    }

    const limpiarFiltros = () => {
        setSearch('');
        setFechaInicio('');
        setFechaFin('');
        setComunaSeleccionada('');

        router.get(
            '/gestion_campo/create',
            {
                page: 1,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Campo - Crear Paquete" />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Crear paquete de solicitudes</h1>

            <div className="flex flex-col gap-4 p-2 sm:p-4 bg-[#F3F4F6] dark:bg-gray-950 text-gray-900 dark:text-gray-200">

                {/* HEADER */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <MapPin className="text-yellow-500 w-5 h-5" />
                        <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                            Crear paquete de solicitudes
                        </h2>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Selecciona las solicitudes disponibles y asigna encuestadores
                    </p>
                </div>

                {/* BANNER DE CONFLICTO */}
                {conflicto && (
                    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{conflicto}</span>
                    </div>
                )}

                {/* TABLA SUPERIOR - Solicitudes disponibles */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 flex flex-col flex-1">
                    <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Solicitudes disponibles ({solicitudesDisponibles.length})
                            </label>

                        </div>
                    </div>
                    <div className="flex flex-col gap-3 mb-4">

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                                type="text"
                                placeholder="Buscar por radicado, documento o nombre..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"

                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <select
                                value={comunaSeleccionada}
                                onChange={(e) => aplicarFiltroComuna(e.target.value)}
                                className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                            >
                                <option value="">Todas las comunas</option>
                                {comunasDisponibles.map((comuna: any) => (
                                    <option key={comuna.id} value={comuna.id}>
                                        {comuna.nombre}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => {
                                    const value = e.target.value
                                    setFechaInicio(value)

                                    aplicarFiltros({
                                        comuna: comunaSeleccionada,
                                        inicio: value,
                                        fin: fechaFin,
                                        page: 1,
                                    })
                                }}
                                className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                                title="Fecha inicio"
                                aria-label="Fecha inicio del filtro del paquete" />
                            <input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFechaFin(value);
                                    aplicarFiltros({
                                        comuna: comunaSeleccionada,
                                        inicio: fechaInicio,
                                        fin: value,
                                        page: 1,
                                    })
                                }}
                                className="border dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm flex-1"
                                title="Fecha fin"
                                aria-label="Fecha fin del filtro del paquete"
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
                        <table className="w-full text-xs text-left table-auto">
                            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 border-b dark:border-gray-700">
                                <tr>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Acción</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">ID SisbenApp</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Radicado</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Asistencial</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Tipo de trámite</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Punto/Evento</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Canal</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Solicitante</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Documento</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Comuna</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Fecha</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {solicitudesDisponibles.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="p-4 text-center text-gray-500 dark:text-gray-400">
                                            No hay solicitudes disponibles
                                        </td>
                                    </tr>
                                ) : (
                                    solicitudesDisponibles.map((solicitud: any) => (
                                        <tr key={solicitud.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="p-2 flex gap-2">
                                                <button
                                                    onClick={() => verDetalles(solicitud)}
                                                    className="bg-gray-500 hover:bg-gray-600 text-white p-1.5 rounded-md transition-colors"
                                                    title="Ver detalles"
                                                    aria-label={`Ver detalles de la solicitud ${solicitud.num_radicado || solicitud.id_SisbenApp || solicitud.id}`}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => agregarSolicitud(solicitud)}
                                                    className="bg-blue-500 hover:bg-blue-600 text-gray-900 p-1.5 rounded-md transition-colors"
                                                    title="Agregar a paquete"
                                                    aria-label={`Agregar al paquete la solicitud ${solicitud.num_radicado || solicitud.id_SisbenApp || solicitud.id}`}
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </td>
                                            <td className="p-2 whitespace-nowrap text-gray-900 dark:text-gray-200">
                                                {solicitud.id_SisbenApp || '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap text-gray-900 dark:text-gray-200 font-medium">
                                                {solicitud.num_radicado || '-'}
                                            </td>
                                            <td className="p-2 max-w-[120px] truncate text-gray-900 dark:text-gray-200">
                                                {solicitud.usuario?.nombre_completo || '-'}
                                            </td>
                                            <td className="p-2 max-w-[100px] truncate text-gray-900 dark:text-gray-200">
                                                {solicitud.tipo_tramite?.nombre || '-'}
                                            </td>
                                            <td className="p-2 max-w-[100px] truncate text-gray-900 dark:text-gray-200">
                                                {solicitud.punto_atencion?.nombre || solicitud.evento?.nombre || '-'}
                                            </td>
                                            <td className="p-2 max-w-[80px] truncate text-gray-900 dark:text-gray-200">
                                                {solicitud.canal?.nombre || '-'}
                                            </td>
                                            <td className="p-2 max-w-[100px] truncate text-gray-900 dark:text-gray-200">
                                                {solicitud.ciudadano?.nombre_completo || '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap text-gray-900 dark:text-gray-200">
                                                {solicitud.ciudadano?.num_documento || '-'}
                                            </td>
                                            <td className="p-2 max-w-[100px] truncate text-gray-900 dark:text-gray-200">
                                                {solicitud.comuna?.nombre || '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                                                {solicitud.creado_el || '-'}
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                {estadoGestionBadge(solicitud.estado_gestion)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION */}
                    {solicitudes.last_page > 1 && (
                        <div className="mt-4 pt-4 border-t dark:border-gray-700">
                            <Pagination
                                currentPage={solicitudes.current_page}
                                lastPage={solicitudes.last_page}
                                total={solicitudes.total}
                                perPage={20}
                                onPageChange={irAPagina}
                            />
                        </div>
                    )}
                </div>

                {/* TABLA INFERIOR - Grid 2 columnas */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">

                    {/* TABLA SELECCIONADAS - 2 columnas */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 flex flex-col min-h-0">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Solicitudes seleccionadas ({seleccionadas.length})
                            </label>
                        </div>

                        <div className="overflow-x-auto -mx-4">
                            <table className="w-full text-xs text-left table-auto">
                                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 border-b dark:border-gray-700">
                                    <tr>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Acción</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">ID SisbenApp</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Radicado</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Asistencial</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Tipo de trámite</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Punto/Evento</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Canal</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Solicitante</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Documento</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Comuna</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Fecha</th>
                                        <th scope="col" className="p-2 font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-700">
                                    {seleccionadas.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="p-4 text-center text-gray-500 dark:text-gray-400">
                                                No hay solicitudes seleccionadas
                                            </td>
                                        </tr>
                                    ) : (
                                        seleccionadas.map((solicitud: any) => (
                                            <tr key={solicitud.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="p-2 flex gap-2">
                                                    <button
                                                        onClick={() => verDetalles(solicitud)}
                                                        className="bg-gray-500 hover:bg-gray-600 text-white p-1.5 rounded-md transition-colors"
                                                        title="Ver detalles"
                                                        aria-label={`Ver detalles de la solicitud ${solicitud.num_radicado || solicitud.id_SisbenApp || solicitud.id}`}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => quitarSolicitud(solicitud.id)}
                                                        className="bg-red-500 hover:bg-red-600 text-gray-900 p-1.5 rounded-md transition-colors"
                                                        title="Remover del paquete"
                                                        aria-label={`Remover del paquete la solicitud ${solicitud.num_radicado || solicitud.id_SisbenApp || solicitud.id}`}
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                </td>
                                                <td className="p-2 whitespace-nowrap text-gray-900 dark:text-gray-200">
                                                    {solicitud.id_SisbenApp || '-'}
                                                </td>
                                                <td className="p-2 whitespace-nowrap text-gray-900 dark:text-gray-200 font-medium">
                                                    {solicitud.num_radicado || '-'}
                                                </td>
                                                <td className="p-2 max-w-[120px] truncate text-gray-900 dark:text-gray-200">
                                                    {solicitud.usuario?.nombre_completo || '-'}
                                                </td>
                                                <td className="p-2 max-w-[100px] truncate text-gray-900 dark:text-gray-200">
                                                    {solicitud.tipo_tramite?.nombre || '-'}
                                                </td>
                                                <td className="p-2 max-w-[100px] truncate text-gray-900 dark:text-gray-200">
                                                    {solicitud.punto_atencion?.nombre || solicitud.evento?.nombre || '-'}
                                                </td>
                                                <td className="p-2 max-w-[80px] truncate text-gray-900 dark:text-gray-200">
                                                    {solicitud.canal?.nombre || '-'}
                                                </td>
                                                <td className="p-2 max-w-[100px] truncate text-gray-900 dark:text-gray-200">
                                                    {solicitud.ciudadano?.nombre_completo || '-'}
                                                </td>
                                                <td className="p-2 whitespace-nowrap text-gray-900 dark:text-gray-200">
                                                    {solicitud.ciudadano?.num_documento || '-'}
                                                </td>
                                                <td className="p-2 max-w-[100px] truncate text-gray-900 dark:text-gray-200">
                                                    {solicitud.comuna?.nombre || '-'}
                                                </td>
                                                <td className="p-2 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                                                    {solicitud.creado_el || '-'}
                                                </td>
                                                <td className="p-2 whitespace-nowrap">
                                                    {estadoGestionBadge(solicitud.estado_gestion)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* PANEL ENCUESTADORES - 1 columna - Siempre visible */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 flex flex-col min-h-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            Asignar encuestador
                        </h3>

                        <select
                            value={encuestadorSeleccionado}
                            onChange={(e) => setEncuestadorSeleccionado(e.target.value)}
                            className="w-full px-3 py-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        >
                            <option value="">Seleccionar encuestador</option>

                            {encuestadores.map((encuestador: any) => (
                                <option key={encuestador.id} value={encuestador.id}>
                                    {encuestador.nombre_completo}
                                </option>
                            ))}
                        </select>
                    </div>

                </div>

                {/* BOTONES ACCION */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => {
                            // Liberar todas las reservas en servidor (fire-and-forget)
                            apiFetch('/gestion_campo/solicitudes/liberar-todas').catch(() => { })
                            // Navegar de inmediato sin esperar respuesta
                            router.visit('/gestion_campo')
                        }}
                        className="px-4 py-2 bg-red-500 hover:bg-red-400 text-gray-900 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={guardarPaquete}
                        disabled={seleccionadas.length === 0 || isSubmitting}
                        className="px-4 py-2 bg-black hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                        {isSubmitting
                            ? 'Registrando...'
                            : `Registrar paquete (${seleccionadas.length})`}
                    </button>
                </div>

            </div>

            {/* MODAL DETALLES */}
            {modalAbierto && solicitudSeleccionada && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60">
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        {/* Header Modal */}
                        <div className="sticky top-0 flex items-center justify-between bg-gradient-to-r from-red-50 to-red-100 dark:from-gray-800 dark:to-gray-700 p-6 border-b dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Detalles de la Solicitud
                            </h3>
                            <button
                                onClick={cerrarModal}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Body Modal */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Información Solicitud */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">ID SisbenApp</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{solicitudSeleccionada.id_SisbenApp || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Radicado</label>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{solicitudSeleccionada.num_radicado || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Tipo de Trámite</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{solicitudSeleccionada.tipo_tramite?.nombre || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Canal</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{solicitudSeleccionada.canal?.nombre || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Punto de Atención / Evento</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                                        {solicitudSeleccionada.punto_atencion?.nombre || solicitudSeleccionada.evento?.nombre || '-'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Dirección</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{solicitudSeleccionada.direccion || '-'}</p>
                                </div>
                            </div>

                            {/* Información Ciudadano */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Solicitante</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{solicitudSeleccionada.ciudadano?.nombre_completo || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Documento</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{solicitudSeleccionada.ciudadano?.num_documento || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Comuna</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{solicitudSeleccionada.comuna?.nombre || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Barrio</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{solicitudSeleccionada.barrio?.nombre || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Asistencial</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{solicitudSeleccionada.usuario?.nombre_completo || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Estado de Gestión</label>
                                    <div className="mt-1">
                                        {estadoGestionBadge(solicitudSeleccionada.estado_gestion)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Modal */}
                        <div className="flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50 p-6 border-t dark:border-gray-700">
                            <button
                                onClick={cerrarModal}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    )
}