import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { ArrowRightLeft, ChevronDown, ClipboardEdit, FolderMinus, PackageCheck, PlusCircle, Settings, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Campo',
        href: '/gestion_campo',
    },
    {
        title: 'Lista de Paquetes',
        href: '/gestion_campo/package',
    },
    {
        title: 'Detalle de Paquete',
        href: '#',
    },
];

/** Único motivo que habilita una segunda visita; el resto cierra la solicitud. */
const MOTIVO_AUSENTE = 'AUSENTE';

const MOTIVOS_VISITA = [
    'AUSENTE',
    'AUSENTE INDEFINIDO',
    'NO VIVE',
    'RECHAZA VISITA',
    'OTRO',
    'DIRECCIÓN ERRADA',
    'FALLECIDO',
    'FALTAN DOCUMENTOS',
];

const hoyISO = () => new Date().toISOString().split('T')[0];

const estadoGestionBadge = (estado: string) => {
    const map: Record<string, { label: string; className: string }> = {
        registrada:           { label: 'Registrada',           className: 'bg-white text-gray-800 border border-gray-300' },
        enviada_a_campo:      { label: 'Enviada a campo',      className: 'bg-amber-200 text-amber-900' },
        asignada:             { label: 'Asignada',             className: 'bg-blue-200 text-blue-800' },
        entregada:            { label: 'Entregada',            className: 'bg-blue-700 text-white' },
        ejecutada:  { label: 'Ejecutada',  className: 'bg-green-500 text-gray-900' },
        notificada: { label: 'Notificada', className: 'bg-purple-600 text-white' },
        aprobada:   { label: 'Aprobada',   className: 'bg-green-700 text-white' },
        cancelada:  { label: 'Cancelada',  className: 'bg-red-200 text-red-800' },
        rechazada:  { label: 'Rechazada',  className: 'bg-red-700 text-white' },
        pendiente:  { label: 'Pendiente',  className: 'bg-orange-400 text-gray-900' },
        // Desenlaces reportados por el DNP
        sincronizada:  { label: 'Sincronizada',    className: 'bg-blue-600 text-white' },
        realizada:     { label: 'Realizada',       className: 'bg-green-600 text-gray-900' },
        pendiente_dnp: { label: 'Pendiente (DNP)', className: 'bg-yellow-700 text-white' },
        cancelada_dnp: { label: 'Cancelada (DNP)', className: 'bg-red-900 text-white' },
    };
    const config = map[estado] ?? { label: estado, className: 'bg-gray-100 text-gray-600' };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.className}`}>
            {config.label}
        </span>
    );
};

export default function ShowPackage() {
    const { paquete, solicitudes, motivosLiberacion, auth } = usePage().props as any;

    const [confirmLiberar, setConfirmLiberar] = useState<number | null>(null);
    const [libMotivoId, setLibMotivoId] = useState<number | ''>('');
    const [libExplicacionId, setLibExplicacionId] = useState<number | ''>('');
    const [procesandoLiberar, setProcesandoLiberar] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [confirmEntregar, setConfirmEntregar] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Modal unificado de registro de respuesta
    const [modalRespuesta, setModalRespuesta] = useState<any | null>(null);
    const [procesandoRespuesta, setProcesandoRespuesta] = useState(false);

    // Primera visita
    const [v1Resultado, setV1Resultado] = useState<'exitosa' | 'fallida' | ''>('');
    const [v1Fecha, setV1Fecha] = useState('');
    const [v1Motivo, setV1Motivo] = useState('');
    const [v1Observacion, setV1Observacion] = useState('');

    // Segunda visita (solo se habilita cuando la primera fue AUSENTE)
    const [segundaAccion, setSegundaAccion] = useState<'registrar' | 'reasignar' | 'pendiente' | ''>('');
    const [v2Resultado, setV2Resultado] = useState<'exitosa' | 'fallida' | ''>('');
    const [v2Fecha, setV2Fecha] = useState('');
    const [v2Motivo, setV2Motivo] = useState('');
    const [v2Observacion, setV2Observacion] = useState('');

    // Reasignación a otro encuestador
    const [opcionesReasig, setOpcionesReasig] = useState<{ paquetes: any[]; encuestadores: any[] } | null>(null);
    const [cargandoOpciones, setCargandoOpciones] = useState(false);
    const [reasigTipo, setReasigTipo] = useState<'paquete_existente' | 'nuevo_paquete'>('paquete_existente');
    const [reasigPaqueteId, setReasigPaqueteId] = useState<number | ''>('');
    const [reasigEncuestadorId, setReasigEncuestadorId] = useState<number | ''>('');
    const [reasigMotivoId, setReasigMotivoId] = useState<number | ''>('');
    const [reasigExplicacionId, setReasigExplicacionId] = useState<number | ''>('');

    const can = (permission: string) => auth?.user?.permissions?.includes(permission);

    const todasAsignadas = solicitudes?.length > 0 && solicitudes.every((s: any) => s.estado_gestion === 'asignada' || s.estado_gestion === 'pendiente');
    const puedeAgregarSolicitudes = todasAsignadas;

    const resetFormularioRespuesta = () => {
        setV1Resultado('');
        setV1Fecha('');
        setV1Motivo('');
        setV1Observacion('');
        setSegundaAccion('');
        setV2Resultado('');
        setV2Fecha('');
        setV2Motivo('');
        setV2Observacion('');
        setOpcionesReasig(null);
        setReasigTipo('paquete_existente');
        setReasigPaqueteId('');
        setReasigEncuestadorId('');
        setReasigMotivoId('');
        setReasigExplicacionId('');
    };

    const abrirModalRespuesta = (sol: any) => {
        resetFormularioRespuesta();
        setModalRespuesta(sol);
    };

    const cerrarModalRespuesta = () => {
        setModalRespuesta(null);
        setProcesandoRespuesta(false);
        resetFormularioRespuesta();
    };

    // Visita 1 ya registrada (solicitudes que quedaron pendientes antes de este cambio)
    const visita1Previa = modalRespuesta?.visitas?.find((v: any) => v.numero_visita === 1) ?? null;
    const registraVisita1 = !visita1Previa;

    // La segunda visita solo se habilita si la primera resultó AUSENTE.
    // Si la primera ya venía registrada, el formulario arranca en ese tramo.
    const habilitaSegunda = registraVisita1
        ? v1Resultado === 'fallida' && v1Motivo === MOTIVO_AUSENTE
        : true;

    const fechaMinimaVisita2 = registraVisita1 ? v1Fecha : (visita1Previa?.fecha_iso ?? '');

    const primeraCompleta =
        !registraVisita1 ||
        (!!v1Resultado && !!v1Fecha && (v1Resultado === 'exitosa' || !!v1Motivo));

    // Explicaciones de la abreviación elegida para la reasignación — desplegables encadenados
    const reasigExplicacionesDisponibles =
        motivosLiberacion?.find((m: any) => m.id === reasigMotivoId)?.explicaciones ?? [];

    const reasignacionCompleta =
        ((reasigTipo === 'paquete_existente' && !!reasigPaqueteId) ||
            (reasigTipo === 'nuevo_paquete' && !!reasigEncuestadorId)) &&
        !!reasigMotivoId &&
        !!reasigExplicacionId;

    const segundaCompleta =
        !habilitaSegunda ||
        segundaAccion === 'pendiente' ||
        (segundaAccion === 'registrar' &&
            !!v2Resultado &&
            !!v2Fecha &&
            (v2Resultado === 'exitosa' || !!v2Motivo)) ||
        (segundaAccion === 'reasignar' && reasignacionCompleta);

    const puedeGuardar = primeraCompleta && segundaCompleta && !procesandoRespuesta;

    // Estado en el que quedará la solicitud con las opciones elegidas
    const estadoResultante = (): string | null => {
        if (registraVisita1) {
            if (v1Resultado === 'exitosa') return 'ejecutada';
            if (v1Resultado === 'fallida' && v1Motivo && v1Motivo !== MOTIVO_AUSENTE) return 'notificada';
        }
        if (!habilitaSegunda) return null;
        if (segundaAccion === 'pendiente' || segundaAccion === 'reasignar') return 'pendiente';
        if (segundaAccion === 'registrar' && v2Resultado === 'exitosa') return 'ejecutada';
        if (segundaAccion === 'registrar' && v2Resultado === 'fallida') return 'notificada';
        return null;
    };

    const handleRegistrarRespuesta = () => {
        if (!puedeGuardar) return;
        setProcesandoRespuesta(true);

        const payload: Record<string, any> = {};

        if (registraVisita1) {
            payload.visita1_resultado = v1Resultado;
            payload.visita1_fecha = v1Fecha;
            if (v1Resultado === 'fallida') {
                payload.visita1_motivo = v1Motivo;
                payload.visita1_observacion = v1Observacion || undefined;
            }
        }

        if (habilitaSegunda) {
            payload.segunda_accion = segundaAccion;

            if (segundaAccion === 'registrar') {
                payload.visita2_resultado = v2Resultado;
                payload.visita2_fecha = v2Fecha;
                if (v2Resultado === 'fallida') {
                    payload.visita2_motivo = v2Motivo;
                    payload.visita2_observacion = v2Observacion || undefined;
                }
            }

            if (segundaAccion === 'reasignar') {
                payload.reasignacion_tipo = reasigTipo;
                payload.reasignacion_paquete_id = reasigTipo === 'paquete_existente' ? reasigPaqueteId : undefined;
                payload.reasignacion_encuestador_id = reasigTipo === 'nuevo_paquete' ? reasigEncuestadorId : undefined;
                payload.reasignacion_motivo_liberacion_id = reasigMotivoId;
                payload.reasignacion_motivo_explicacion_id = reasigExplicacionId;
            }
        }

        router.patch(
            `/gestion_campo/package/${paquete.id}/solicitudes/${modalRespuesta.id}/respuesta`,
            payload,
            {
                preserveScroll: true,
                onSuccess: () => cerrarModalRespuesta(),
                onFinish: () => setProcesandoRespuesta(false),
            }
        );
    };

    const fetchOpcionesReasig = (solicitudId: number) => {
        setCargandoOpciones(true);
        fetch(`/gestion_campo/solicitudes/${solicitudId}/opciones-reasignacion`, {
            headers: { Accept: 'application/json' },
        })
            .then((r) => r.json())
            .then((data) => setOpcionesReasig(data))
            .catch(() => setOpcionesReasig({ paquetes: [], encuestadores: [] }))
            .finally(() => setCargandoOpciones(false));
    };

    const seleccionarSegundaAccion = (accion: 'registrar' | 'reasignar' | 'pendiente') => {
        setSegundaAccion(accion);
        if (accion === 'reasignar' && !opcionesReasig && modalRespuesta) {
            fetchOpcionesReasig(modalRespuesta.id);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEntregarPaquete = () => {
        router.patch(
            `/gestion_campo/package/${paquete.id}/entregar`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setConfirmEntregar(false),
            }
        );
    };

    const abrirConfirmLiberar = (solicitudId: number) => {
        setLibMotivoId('');
        setLibExplicacionId('');
        setConfirmLiberar(solicitudId);
    };

    const cerrarConfirmLiberar = () => {
        setConfirmLiberar(null);
        setLibMotivoId('');
        setLibExplicacionId('');
        setProcesandoLiberar(false);
    };

    // Explicaciones de la abreviación elegida — los desplegables van encadenados
    const explicacionesDisponibles =
        motivosLiberacion?.find((m: any) => m.id === libMotivoId)?.explicaciones ?? [];

    const puedeLiberar = !!libMotivoId && !!libExplicacionId && !procesandoLiberar;

    const handleLiberar = (solicitudId: number) => {
        if (!puedeLiberar) return;
        setProcesandoLiberar(true);
        router.patch(
            `/gestion_campo/package/${paquete.id}/solicitudes/${solicitudId}/liberar`,
            {
                motivo_liberacion_id: libMotivoId,
                motivo_explicacion_id: libExplicacionId,
            },
            {
                preserveScroll: true,
                onSuccess: () => cerrarConfirmLiberar(),
                onFinish: () => setProcesandoLiberar(false),
            }
        );
    };

    // Bloque de detalle de la opción de segunda visita elegida; se renderiza justo debajo de su opción
    const detalleSegundaAccion = (accion: 'registrar' | 'reasignar' | 'pendiente') => {
        if (accion === 'registrar') {
            // Resultado de la segunda visita
            return (
                <div className="mt-2 ml-7 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                    <div className="space-y-2">
                        <label
                            className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                v2Resultado === 'exitosa'
                                    ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            <input
                                type="radio"
                                name="v2_resultado"
                                value="exitosa"
                                checked={v2Resultado === 'exitosa'}
                                onChange={() => { setV2Resultado('exitosa'); setV2Motivo(''); setV2Observacion(''); }}
                                className="mt-0.5 shrink-0"
                            />
                            <div>
                                <p className="text-sm font-medium text-green-700 dark:text-green-300">Visita satisfactoria</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    La solicitud queda <strong>Ejecutada</strong>; esta fecha será la fecha de ejecución.
                                </p>
                            </div>
                        </label>

                        <label
                            className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                v2Resultado === 'fallida'
                                    ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            <input
                                type="radio"
                                name="v2_resultado"
                                value="fallida"
                                checked={v2Resultado === 'fallida'}
                                onChange={() => { setV2Resultado('fallida'); setV2Motivo(MOTIVO_AUSENTE); setV2Observacion(''); }}
                                className="mt-0.5 shrink-0"
                            />
                            <div>
                                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">No fue posible atender</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Tras dos visitas sin éxito la solicitud queda <strong>Notificada</strong>.
                                </p>
                            </div>
                        </label>
                    </div>

                    {v2Resultado === 'fallida' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Motivo de la segunda visita <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={v2Motivo}
                                    onChange={(e) => setV2Motivo(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                >
                                    <option value="">— Seleccionar motivo —</option>
                                    {MOTIVOS_VISITA.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Observaciones (opcional)
                                </label>
                                <textarea
                                    value={v2Observacion}
                                    onChange={(e) => setV2Observacion(e.target.value)}
                                    rows={3}
                                    maxLength={1000}
                                    placeholder="Detalles adicionales sobre la segunda visita..."
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Fecha de la segunda visita <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={v2Fecha}
                            onChange={(e) => setV2Fecha(e.target.value)}
                            min={fechaMinimaVisita2 || undefined}
                            max={hoyISO()}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#4171B1]"
                        />
                    </div>
                </div>
            );
        }

        if (accion === 'reasignar') {
            // Reasignación a otro encuestador
            return (
                <div className="mt-2 ml-7 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3">
                    <p className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                        <ArrowRightLeft size={13} />
                        Destino de la reasignación
                    </p>

                    {/* Selector de tipo */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                            reasigTipo === 'paquete_existente'
                                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}>
                            <input
                                type="radio"
                                name="reasig_tipo"
                                value="paquete_existente"
                                checked={reasigTipo === 'paquete_existente'}
                                onChange={() => setReasigTipo('paquete_existente')}
                                className="mt-0.5 shrink-0"
                            />
                            <div>
                                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Paquete existente</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Añadir a un paquete activo de otro encuestador</p>
                            </div>
                        </label>
                        <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                            reasigTipo === 'nuevo_paquete'
                                ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}>
                            <input
                                type="radio"
                                name="reasig_tipo"
                                value="nuevo_paquete"
                                checked={reasigTipo === 'nuevo_paquete'}
                                onChange={() => setReasigTipo('nuevo_paquete')}
                                className="mt-0.5 shrink-0"
                            />
                            <div>
                                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Nuevo paquete</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Crear un paquete nuevo y asignarlo a un encuestador</p>
                            </div>
                        </label>
                    </div>

                    {cargandoOpciones ? (
                        <div className="flex items-center justify-center py-8 text-sm text-gray-600">
                            Cargando opciones...
                        </div>
                    ) : opcionesReasig && (
                        <>
                            {reasigTipo === 'paquete_existente' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Seleccionar paquete de destino
                                    </label>
                                    {opcionesReasig.paquetes.length === 0 ? (
                                        <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md px-3 py-2">
                                            No hay paquetes activos compatibles disponibles. Usa la opción "Nuevo paquete".
                                        </p>
                                    ) : (
                                        <select
                                            value={reasigPaqueteId}
                                            onChange={(e) => setReasigPaqueteId(Number(e.target.value))}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        >
                                            <option value="">— Seleccionar paquete —</option>
                                            {opcionesReasig.paquetes.map((p: any) => (
                                                <option key={p.id} value={p.id}>
                                                    Paquete {p.id} — {p.encuestador} ({p.solicitudes_count} solicitud{p.solicitudes_count !== 1 ? 'es' : ''})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {reasigTipo === 'nuevo_paquete' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Asignar encuestador al nuevo paquete
                                    </label>
                                    <select
                                        value={reasigEncuestadorId}
                                        onChange={(e) => setReasigEncuestadorId(Number(e.target.value))}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    >
                                        <option value="">— Seleccionar encuestador —</option>
                                        {opcionesReasig.encuestadores.map((e: any) => (
                                            <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </>
                    )}

                    {/* Motivo de la reasignación — mismo catálogo que la liberación manual */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Motivo de la reasignación
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Abreviación <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={reasigMotivoId}
                                onChange={(e) => {
                                    setReasigMotivoId(e.target.value ? Number(e.target.value) : '');
                                    setReasigExplicacionId('');
                                }}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
                            >
                                <option value="">— Seleccionar abreviación —</option>
                                {motivosLiberacion?.map((m: any) => (
                                    <option key={m.id} value={m.id}>{m.abreviacion}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Explicación <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={reasigExplicacionId}
                                onChange={(e) => setReasigExplicacionId(e.target.value ? Number(e.target.value) : '')}
                                disabled={!reasigMotivoId}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">
                                    {reasigMotivoId ? '— Seleccionar explicación —' : 'Selecciona primero una abreviación'}
                                </option>
                                {reasigExplicacionesDisponibles.map((e: any) => (
                                    <option key={e.id} value={e.id}>{e.explicacion}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Detalle Paquete ${paquete.id}`} />

            <div className="flex flex-col gap-6 p-4 bg-gray-100 dark:bg-gray-950">

                {/* ENCABEZADO */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 flex justify-between items-center">
                    <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        Detalle de Paquete {paquete.id}
                    </h1>
                </div>

                {/* DATOS DEL PAQUETE */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
                    <h2 className="text-base font-semibold text-[#4171B1] mb-4 border-b pb-2">
                        Información del Paquete
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                        <div>
                            <strong className="text-gray-600 dark:text-gray-400">Código</strong>
                            <p className="mt-1 text-gray-800 dark:text-gray-200 font-medium">{paquete.id}</p>
                        </div>
                        <div>
                            <strong className="text-gray-600 dark:text-gray-400">Creado por</strong>
                            <p className="mt-1 text-gray-800 dark:text-gray-200">{paquete.creado_por}</p>
                        </div>
                        <div>
                            <strong className="text-gray-600 dark:text-gray-400">Asignado a</strong>
                            <p className="mt-1 text-gray-800 dark:text-gray-200">{paquete.asignado_a}</p>
                        </div>
                        <div>
                            <strong className="text-gray-600 dark:text-gray-400">Fecha de creación</strong>
                            <p className="mt-1 text-gray-800 dark:text-gray-200">{paquete.creado_el ?? '-'}</p>
                        </div>
                    </div>
                </div>

                {/* BOTÓN VOLVER */}
                <div className="flex gap-3">
                    <Link
                        href="/gestion_campo/package"
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-gray-200 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                        Volver
                    </Link>
                </div>

                {/* SOLICITUDES DEL PAQUETE */}
                {solicitudes?.length > 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between border-b pb-2 mb-4">
                            <h2 className="text-base font-semibold text-[#4171B1]">
                                Solicitudes del paquete ({solicitudes.length})
                            </h2>
                            {can('Editar paquetes') && (
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        title="Gestionar solicitudes del paquete"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#4171B1] hover:bg-[#365f96] text-white rounded-md transition-colors"
                                    >
                                        <Settings size={14} />
                                        Gestionar
                                        <ChevronDown size={14} />
                                    </button>
                                    {dropdownOpen && (
                                        <div className="absolute right-0 z-20 mt-1 w-52 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                            <button
                                                onClick={() => { if (todasAsignadas) { setDropdownOpen(false); setConfirmEntregar(true); } }}
                                                disabled={!todasAsignadas}
                                                title={!todasAsignadas ? 'Solo disponible cuando todas las solicitudes están en estado Asignada' : undefined}
                                                className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left ${
                                                    !todasAsignadas
                                                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <PackageCheck size={14} className={!todasAsignadas ? 'text-gray-600 dark:text-gray-600' : 'text-blue-600'} />
                                                Entregar paquete
                                            </button>
                                            <button
                                                onClick={() => { if (puedeAgregarSolicitudes) { setDropdownOpen(false); router.visit(`/gestion_campo/package/${paquete.id}/agregar`); } }}
                                                disabled={!puedeAgregarSolicitudes}
                                                title={!puedeAgregarSolicitudes ? 'Solo disponible cuando todas las solicitudes están en estado Asignada o Pendiente' : undefined}
                                                className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left ${
                                                    !puedeAgregarSolicitudes
                                                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <PlusCircle size={14} className={!puedeAgregarSolicitudes ? 'text-gray-600 dark:text-gray-600' : 'text-green-600'} />
                                                Agregar solicitud
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="border-b bg-gray-50 dark:bg-gray-800 dark:text-gray-200">
                                        <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">#</th>
                                        <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">Nro Radicado</th>
                                        <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">ID SisbenApp</th>
                                        <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">Comuna</th>
                                        <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">Barrio</th>
                                        <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">Código encuestador</th>
                                        <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">Nombre encuestador</th>
                                        <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">Estado</th>
                                        {can('Editar paquetes') && (
                                            <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">Acciones</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="dark:text-gray-300">
                                    {solicitudes.map((sol: any, index: number) => (
                                        <tr key={sol.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 align-top">
                                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{index + 1}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{sol.num_radicado ?? '-'}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{sol.id_SisbenApp ?? '-'}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{sol.comuna?.nombre ?? '-'}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{sol.barrio?.nombre ?? '-'}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{paquete.codigo_encuestador ?? '-'}</td>
                                            <td className="px-3 py-2 min-w-[140px]">{paquete.asignado_a ?? '-'}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {estadoGestionBadge(sol.estado_gestion ?? '')}
                                            </td>
                                            {can('Editar paquetes') && (
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        {(sol.estado_gestion === 'entregada' || sol.estado_gestion === 'pendiente') && (
                                                            <button
                                                                onClick={() => abrirModalRespuesta(sol)}
                                                                title="Registrar respuesta de visita"
                                                                aria-label={`Registrar la respuesta de visita de la solicitud ${sol.num_radicado ?? sol.id_SisbenApp ?? sol.id}`}
                                                                className="p-1.5 rounded-md text-white bg-[#4171B1] hover:bg-[#365f96] cursor-pointer"
                                                            >
                                                                <ClipboardEdit size={14} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => sol.estado_gestion === 'asignada' && abrirConfirmLiberar(sol.id)}
                                                            disabled={sol.estado_gestion !== 'asignada'}
                                                            title={sol.estado_gestion !== 'asignada' ? 'Solo se puede liberar una solicitud en estado Asignada' : 'Liberar solicitud del paquete'}
                                                            aria-label={sol.estado_gestion !== 'asignada' ? `No se puede liberar la solicitud ${sol.num_radicado ?? sol.id_SisbenApp ?? sol.id}: solo se libera en estado Asignada` : `Liberar del paquete la solicitud ${sol.num_radicado ?? sol.id_SisbenApp ?? sol.id}`}
                                                            className={`p-1.5 rounded-md text-white ${
                                                                sol.estado_gestion !== 'asignada'
                                                                    ? 'bg-red-300 dark:bg-red-900/40 cursor-not-allowed'
                                                                    : 'bg-red-500 hover:bg-red-600 cursor-pointer'
                                                            }`}
                                                        >
                                                            <FolderMinus size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Este paquete no tiene solicitudes asociadas.
                        </p>
                    </div>
                )}

                {/* DIÁLOGO DE CONFIRMACIÓN ENTREGAR */}
                {confirmEntregar && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-sm mx-4">
                            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                                ¿Entregar paquete?
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                Todas las solicitudes del paquete cambiarán su estado de gestión a{' '}
                                <strong>Entregada</strong>. ¿Deseas continuar?
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setConfirmEntregar(false)}
                                    className="px-4 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleEntregarPaquete}
                                    className="px-4 py-2 text-sm rounded-md bg-blue-700 text-white hover:bg-blue-800"
                                >
                                    Entregar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL REGISTRAR RESPUESTA */}
                {modalRespuesta && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

                            {/* Header */}
                            <div className="flex items-start justify-between p-5 border-b dark:border-gray-700 shrink-0">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                                        Registrar respuesta de la solicitud
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Ciudadano: <strong>{modalRespuesta.ciudadano?.nombre_completo ?? '-'}</strong>
                                        {' — '}ID SisbenApp: <strong>{modalRespuesta.id_SisbenApp ?? '-'}</strong>
                                    </p>
                                </div>
                                <button
                                    onClick={cerrarModalRespuesta}
                                    className="ml-4 p-1 text-gray-600 hover:text-gray-600 dark:hover:text-gray-200 rounded-md shrink-0"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Body scrollable */}
                            <div className="overflow-y-auto flex-1 p-5">
                                {/* Historial de visitas previas con trazabilidad de encuestador */}
                                {modalRespuesta.visitas?.length > 0 && (
                                    <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs space-y-2">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                            Historial de visitas
                                        </p>
                                        {modalRespuesta.visitas.map((v: any) => {
                                            const resultadoColor = v.resultado === 'exitosa'
                                                ? 'text-green-700 dark:text-green-400'
                                                : v.resultado === 'notificada'
                                                    ? 'text-purple-700 dark:text-purple-400'
                                                    : 'text-amber-700 dark:text-amber-400';
                                            return (
                                                <div key={v.numero_visita} className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 space-y-0.5">
                                                    <p className="text-gray-700 dark:text-gray-200 font-medium">
                                                        Visita {v.numero_visita}
                                                        <span className={`ml-2 ${resultadoColor}`}>
                                                            — {v.resultado.charAt(0).toUpperCase() + v.resultado.slice(1)}
                                                        </span>
                                                        <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">{v.fecha}</span>
                                                    </p>
                                                    {v.encuestador && (
                                                        <p className="text-gray-500 dark:text-gray-400">
                                                            Encuestador: <span className="font-medium text-gray-600 dark:text-gray-300">{v.encuestador.nombre_completo} ({v.encuestador.codigo})</span>
                                                        </p>
                                                    )}
                                                    {v.motivo && (
                                                        <p className="text-amber-700 dark:text-amber-400">Motivo: {v.motivo}</p>
                                                    )}
                                                    {v.observacion && (
                                                        <p className="text-gray-500 dark:text-gray-400 italic">{v.observacion}</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* ── SECCIÓN 1: PRIMERA VISITA ── */}
                                <section className="mb-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4171B1] text-xs font-semibold text-white">1</span>
                                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Primera visita</h4>
                                    </div>

                                    {!registraVisita1 ? (
                                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-xs text-gray-600 dark:text-gray-300">
                                            Ya registrada el <strong>{visita1Previa.fecha}</strong>
                                            {visita1Previa.motivo && <> — motivo <strong>{visita1Previa.motivo}</strong></>}.
                                            Continúa con el registro de la segunda visita.
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2 mb-4">
                                                <label
                                                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                                        v1Resultado === 'exitosa'
                                                            ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="v1_resultado"
                                                        value="exitosa"
                                                        checked={v1Resultado === 'exitosa'}
                                                        onChange={() => {
                                                            setV1Resultado('exitosa');
                                                            setV1Motivo('');
                                                            setV1Observacion('');
                                                            setSegundaAccion('');
                                                        }}
                                                        className="mt-0.5 shrink-0"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Visita satisfactoria</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                            La solicitud fue atendida. Queda <strong>Ejecutada</strong> y esta fecha será la fecha de ejecución.
                                                        </p>
                                                    </div>
                                                </label>

                                                <label
                                                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                                        v1Resultado === 'fallida'
                                                            ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="v1_resultado"
                                                        value="fallida"
                                                        checked={v1Resultado === 'fallida'}
                                                        onChange={() => {
                                                            setV1Resultado('fallida');
                                                            setV1Motivo('');
                                                            setV1Observacion('');
                                                            setSegundaAccion('');
                                                        }}
                                                        className="mt-0.5 shrink-0"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">No fue posible atender</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                            Se registra el motivo. Solo <strong>{MOTIVO_AUSENTE}</strong> habilita una segunda visita.
                                                        </p>
                                                    </div>
                                                </label>
                                            </div>

                                            {v1Resultado === 'fallida' && (
                                                <div className="space-y-3 mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Motivo de la visita no satisfactoria <span className="text-red-500">*</span>
                                                        </label>
                                                        <select
                                                            value={v1Motivo}
                                                            onChange={(e) => { setV1Motivo(e.target.value); setSegundaAccion(''); }}
                                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                                        >
                                                            <option value="">— Seleccionar motivo —</option>
                                                            {MOTIVOS_VISITA.map((m) => (
                                                                <option key={m} value={m}>{m}</option>
                                                            ))}
                                                        </select>
                                                        {v1Motivo && v1Motivo !== MOTIVO_AUSENTE && (
                                                            <p className="mt-1.5 text-xs text-purple-700 dark:text-purple-300">
                                                                Con este motivo la solicitud finaliza aquí y queda <strong>Notificada</strong>; no se habilita una segunda visita.
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Observaciones (opcional)
                                                        </label>
                                                        <textarea
                                                            value={v1Observacion}
                                                            onChange={(e) => setV1Observacion(e.target.value)}
                                                            rows={3}
                                                            maxLength={1000}
                                                            placeholder="Detalles adicionales sobre la visita..."
                                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Fecha de la primera visita <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    value={v1Fecha}
                                                    onChange={(e) => setV1Fecha(e.target.value)}
                                                    max={hoyISO()}
                                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#4171B1]"
                                                />
                                            </div>
                                        </>
                                    )}
                                </section>

                                {/* ── SECCIÓN 2: SEGUNDA VISITA — solo visible si la primera fue AUSENTE ── */}
                                {habilitaSegunda && (
                                    <section className="mb-5 rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-900/10 p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-gray-900">2</span>
                                            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Segunda visita</h4>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 ml-8">
                                            {registraVisita1
                                                ? `La primera visita quedó como ${MOTIVO_AUSENTE}, por lo que la solicitud admite una segunda visita.`
                                                : 'Esta solicitud quedó pendiente de una segunda visita.'}
                                        </p>

                                        <div className="space-y-2">
                                            {[
                                                {
                                                    value: 'registrar' as const,
                                                    titulo: 'Registrar el resultado de la segunda visita',
                                                    detalle: 'La segunda visita ya se realizó: fue satisfactoria o el ciudadano volvió a estar ausente.',
                                                    activo: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20',
                                                    texto: 'text-blue-700 dark:text-blue-300',
                                                },
                                                {
                                                    value: 'reasignar' as const,
                                                    titulo: 'Reasignar a otro encuestador',
                                                    detalle: 'Otro encuestador realizará la segunda visita. La solicitud queda Pendiente en el paquete de destino.',
                                                    activo: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20',
                                                    texto: 'text-orange-600 dark:text-orange-400',
                                                },
                                                {
                                                    value: 'pendiente' as const,
                                                    titulo: 'Dejar pendiente para el mismo encuestador',
                                                    detalle: 'La solicitud queda Pendiente en este paquete, a la espera de la segunda visita.',
                                                    activo: 'border-gray-400 bg-gray-100 dark:bg-gray-800',
                                                    texto: 'text-gray-700 dark:text-gray-300',
                                                },
                                            ].map((op) => (
                                                <div key={op.value}>
                                                    <label
                                                        className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors bg-white dark:bg-gray-900 ${
                                                            segundaAccion === op.value
                                                                ? op.activo
                                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="segunda_accion"
                                                            value={op.value}
                                                            checked={segundaAccion === op.value}
                                                            onChange={() => seleccionarSegundaAccion(op.value)}
                                                            className="mt-0.5 shrink-0"
                                                        />
                                                        <div>
                                                            <p className={`text-sm font-medium ${op.texto}`}>{op.titulo}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{op.detalle}</p>
                                                        </div>
                                                    </label>
                                                    {segundaAccion === op.value && detalleSegundaAccion(op.value)}
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Resumen del estado en el que quedará la solicitud */}
                                {estadoResultante() && (
                                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300">
                                        Al guardar, la solicitud quedará en estado
                                        {estadoGestionBadge(estadoResultante() as string)}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 px-5 py-4 border-t dark:border-gray-700 shrink-0">
                                <button
                                    onClick={cerrarModalRespuesta}
                                    disabled={procesandoRespuesta}
                                    className="px-4 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleRegistrarRespuesta}
                                    disabled={!puedeGuardar}
                                    className="px-4 py-2 text-sm rounded-md bg-[#4171B1] text-white hover:bg-[#365f96] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {procesandoRespuesta ? 'Guardando...' : 'Guardar respuesta'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* DIÁLOGO DE CONFIRMACIÓN LIBERAR */}
                {confirmLiberar !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md">
                            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                                ¿Liberar solicitud?
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                                La solicitud volverá al estado <strong>Enviada a campo</strong> y quedará disponible para ser incluida en otro paquete.
                                El motivo queda registrado en el historial de paquetes de la solicitud.
                            </p>

                            <div className="space-y-3 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Abreviación <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={libMotivoId}
                                        onChange={(e) => {
                                            setLibMotivoId(e.target.value ? Number(e.target.value) : '');
                                            setLibExplicacionId('');
                                        }}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                                    >
                                        <option value="">— Seleccionar abreviación —</option>
                                        {motivosLiberacion?.map((m: any) => (
                                            <option key={m.id} value={m.id}>{m.abreviacion}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Explicación <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={libExplicacionId}
                                        onChange={(e) => setLibExplicacionId(e.target.value ? Number(e.target.value) : '')}
                                        disabled={!libMotivoId}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">
                                            {libMotivoId ? '— Seleccionar explicación —' : 'Selecciona primero una abreviación'}
                                        </option>
                                        {explicacionesDisponibles.map((e: any) => (
                                            <option key={e.id} value={e.id}>{e.explicacion}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={cerrarConfirmLiberar}
                                    disabled={procesandoLiberar}
                                    className="px-4 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleLiberar(confirmLiberar)}
                                    disabled={!puedeLiberar}
                                    className="px-4 py-2 text-sm rounded-md bg-red-500 text-gray-900 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {procesandoLiberar ? 'Liberando...' : 'Liberar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </AppLayout>
    );
}
