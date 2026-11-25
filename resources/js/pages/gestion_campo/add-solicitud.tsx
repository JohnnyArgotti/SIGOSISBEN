import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import type { BreadcrumbItem } from '@/types'
import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Eye, MapPin, Minus, Plus, Search, X } from 'lucide-react'
import Pagination from '@/components/Pagination'

const getCsrfToken = (): string => {
    const match = document.cookie.split('; ').find((r) => r.startsWith('XSRF-TOKEN='))
    return match ? decodeURIComponent(match.split('=')[1]) : ''
}

const apiFetch = (url: string, method = 'POST'): Promise<Response> =>
    fetch(url, {
        method,
        headers: {
            'X-XSRF-TOKEN': getCsrfToken(),
            Accept: 'application/json',
        },
    })

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

export default function AddSolicitud() {
    const {
        paquete,
        solicitudes = { data: [], total: 0, current_page: 1, last_page: 1 },
        selectedComuna = null,
        reservadasPropias = [],
        reservadasPorOtros = [],
    } = usePage().props as any

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Gestión de Campo', href: '/gestion_campo' },
        { title: 'Lista de Paquetes', href: '/gestion_campo/package' },
        { title: `Detalle de Paquete #${paquete?.id}`, href: `/gestion_campo/package/${paquete?.id}` },
        { title: 'Agregar Solicitudes', href: '#' },
    ]

    const [search, setSearch] = useState('')
    const [comunaSeleccionada, setComunaSeleccionada] = useState(selectedComuna || '')
    const [seleccionadas, setSeleccionadas] = useState<any[]>(reservadasPropias)
    const [modalAbierto, setModalAbierto] = useState(false)
    const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    // Ver create.tsx: el listado trae también las reservadas por otros, para poder
    // volver a mostrarlas al liberarse. Se siembra con lo que reporta el servidor.
    const [reservadasIds, setReservadasIds] = useState<Set<number>>(new Set(reservadasPorOtros))
    const [conflicto, setConflicto] = useState<string | null>(null)

    const solicitudesDataRef = useRef<any[]>(solicitudes.data)
    useEffect(() => {
        solicitudesDataRef.current = solicitudes.data
    }, [solicitudes.data])

    // Polling cada 2 s. Se detiene mientras la pestaña está oculta y se
    // sincroniza de inmediato al volver a ella.
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
                .catch(() => {})
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

    // Limpieza al salir
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
            apiFetch('/gestion_campo/solicitudes/liberar-todas').catch(() => {})
        }
    }, [])

    // Heartbeat cada 90 s
    useEffect(() => {
        if (seleccionadas.length === 0) return
        const id = setInterval(() => {
            apiFetch('/gestion_campo/solicitudes/heartbeat').catch(() => {})
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

    const comunasDisponibles = Array.from(
        new Map(
            solicitudesDisponibles
                .filter((item: any) => item.comuna)
                .map((item: any) => [item.comuna.id, item.comuna])
        ).values()
    ).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

    const agregarSolicitud = async (solicitud: any) => {
        setSeleccionadas((prev) => [...prev, solicitud])
        try {
            const res = await apiFetch(`/gestion_campo/solicitudes/${solicitud.id}/reservar`)
            if (res.status === 409) {
                setSeleccionadas((prev) => prev.filter((s) => s.id !== solicitud.id))
                mostrarConflicto('Esta solicitud fue tomada por otro usuario en este momento.')
                setReservadasIds((prev) => new Set([...prev, solicitud.id]))
            }
        } catch {}
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
        setSeleccionadas((prev) => prev.filter((item) => item.id !== id))
        apiFetch(`/gestion_campo/solicitudes/${id}/liberar`).catch(() => {})
    }

    const handleAgregar = () => {
        if (seleccionadas.length === 0) {
            mostrarConflicto('Debes seleccionar al menos una solicitud.')
            return
        }
        setIsSubmitting(true)
        router.post(
            `/gestion_campo/package/${paquete.id}/agregar`,
            { solicitudes: seleccionadas.map((item) => item.id) },
            {
                onError: (errors) => {
                    if (errors.solicitudes) mostrarConflicto(errors.solicitudes)
                    if (errors.error) mostrarConflicto(errors.error)
                },
                onFinish: () => setIsSubmitting(false),
            },
        )
    }

    const irAPagina = (pagina: number) => {
        router.get(`/gestion_campo/package/${paquete.id}/agregar`, {
            page: pagina,
            comuna_id: comunaSeleccionada || undefined,
        }, { preserveState: true, replace: true })
    }

    const aplicarFiltroComuna = (comuna: string) => {
        setComunaSeleccionada(comuna)
        router.get(`/gestion_campo/package/${paquete.id}/agregar`, {
            page: 1,
            comuna_id: comuna || undefined,
        }, { preserveState: true, replace: true })
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Agregar solicitudes — Paquete #${paquete?.id}`} />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Agregar solicitudes al paquete</h1>

            <div className="flex flex-col gap-4 p-2 sm:p-4 bg-[#F3F4F6] dark:bg-gray-950 text-gray-900 dark:text-gray-200">

                {/* HEADER */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <MapPin className="text-yellow-500 w-5 h-5" />
                        <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                            Agregar solicitudes al paquete #{paquete?.id}
                        </h2>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Encuestador asignado: <strong>{paquete?.asignado_a}</strong>
                    </p>
                </div>

                {/* BANNER CONFLICTO */}
                {conflicto && (
                    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{conflicto}</span>
                    </div>
                )}

                {/* TABLA DISPONIBLES */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 flex flex-col flex-1">
                    <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Solicitudes disponibles ({solicitudesDisponibles.length})
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                <input
                                    type="text"
                                    placeholder="Buscar por radicado, documento o nombre..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Filtrar por comuna
                            </label>
                            <select
                                value={comunaSeleccionada}
                                onChange={(e) => aplicarFiltroComuna(e.target.value)}
                                className="w-full px-3 py-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Todas las comunas</option>
                                {comunasDisponibles.map((comuna: any) => (
                                    <option key={comuna.id} value={comuna.id}>{comuna.nombre}</option>
                                ))}
                            </select>
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
                                        <td colSpan={12} className="p-4 text-center text-gray-500 dark:text-gray-400">
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
                                            <td className="p-2 whitespace-nowrap">{solicitud.id_SisbenApp || '-'}</td>
                                            <td className="p-2 whitespace-nowrap font-medium">{solicitud.num_radicado || '-'}</td>
                                            <td className="p-2 max-w-[120px] truncate">{solicitud.usuario?.nombre_completo || '-'}</td>
                                            <td className="p-2 max-w-[100px] truncate">{solicitud.tipo_tramite?.nombre || '-'}</td>
                                            <td className="p-2 max-w-[100px] truncate">{solicitud.punto_atencion?.nombre || solicitud.evento?.nombre || '-'}</td>
                                            <td className="p-2 max-w-[80px] truncate">{solicitud.canal?.nombre || '-'}</td>
                                            <td className="p-2 max-w-[100px] truncate">{solicitud.ciudadano?.nombre_completo || '-'}</td>
                                            <td className="p-2 whitespace-nowrap">{solicitud.ciudadano?.num_documento || '-'}</td>
                                            <td className="p-2 max-w-[100px] truncate">{solicitud.comuna?.nombre || '-'}</td>
                                            <td className="p-2 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">{solicitud.creado_el || '-'}</td>
                                            <td className="p-2 whitespace-nowrap">{estadoGestionBadge(solicitud.estado_gestion)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

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

                {/* TABLA SELECCIONADAS */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 flex flex-col min-h-0">
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
                                        <td colSpan={12} className="p-4 text-center text-gray-500 dark:text-gray-400">
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
                                            <td className="p-2 whitespace-nowrap">{solicitud.id_SisbenApp || '-'}</td>
                                            <td className="p-2 whitespace-nowrap font-medium">{solicitud.num_radicado || '-'}</td>
                                            <td className="p-2 max-w-[120px] truncate">{solicitud.usuario?.nombre_completo || '-'}</td>
                                            <td className="p-2 max-w-[100px] truncate">{solicitud.tipo_tramite?.nombre || '-'}</td>
                                            <td className="p-2 max-w-[100px] truncate">{solicitud.punto_atencion?.nombre || solicitud.evento?.nombre || '-'}</td>
                                            <td className="p-2 max-w-[80px] truncate">{solicitud.canal?.nombre || '-'}</td>
                                            <td className="p-2 max-w-[100px] truncate">{solicitud.ciudadano?.nombre_completo || '-'}</td>
                                            <td className="p-2 whitespace-nowrap">{solicitud.ciudadano?.num_documento || '-'}</td>
                                            <td className="p-2 max-w-[100px] truncate">{solicitud.comuna?.nombre || '-'}</td>
                                            <td className="p-2 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">{solicitud.creado_el || '-'}</td>
                                            <td className="p-2 whitespace-nowrap">{estadoGestionBadge(solicitud.estado_gestion)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* BOTONES */}
                <div className="flex justify-end gap-3">
                    <Link
                        href={`/gestion_campo/package/${paquete?.id}`}
                        onClick={() => apiFetch('/gestion_campo/solicitudes/liberar-todas').catch(() => {})}
                        className="px-4 py-2 bg-red-500 hover:bg-red-400 text-gray-900 rounded-lg font-medium transition-colors text-sm"
                    >
                        Cancelar
                    </Link>
                    <button
                        onClick={handleAgregar}
                        disabled={seleccionadas.length === 0 || isSubmitting}
                        className="px-4 py-2 bg-black hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                    >
                        {isSubmitting
                            ? 'Guardando...'
                            : `Agregar al paquete (${seleccionadas.length})`}
                    </button>
                </div>

            </div>

            {/* MODAL DETALLES */}
            {modalAbierto && solicitudSeleccionada && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60">
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 flex items-center justify-between bg-gradient-to-r from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-700 p-6 border-b dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Detalles de la Solicitud
                            </h3>
                            <button onClick={cerrarModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Estado</label>
                                    <p className="mt-1">{estadoGestionBadge(solicitudSeleccionada.estado_gestion)}</p>
                                </div>
                                {solicitudSeleccionada.fecha_visita1 && (
                                    <div>
                                        <label className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">1ª Visita registrada</label>
                                        <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{solicitudSeleccionada.fecha_visita1}</p>
                                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">Esta solicitud requiere una segunda visita</p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Tipo de Trámite</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{solicitudSeleccionada.tipo_tramite?.nombre || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Canal</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{solicitudSeleccionada.canal?.nombre || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Punto / Evento</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                                        {solicitudSeleccionada.punto_atencion?.nombre || solicitudSeleccionada.evento?.nombre || '-'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Dirección</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{solicitudSeleccionada.direccion || '-'}</p>
                                </div>
                            </div>
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
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Fecha de creación</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{solicitudSeleccionada.creado_el || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    )
}
