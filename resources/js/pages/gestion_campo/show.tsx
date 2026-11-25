import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Campo',
        href: '/gestion_campo',
    },
    {
        title: 'Detalle de Solicitud',
        href: '#',
    },
];

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
    };
    const config = map[estado] ?? { label: estado, className: 'bg-gray-100 text-gray-600' };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${config.className}`}>
            {config.label}
        </span>
    );
};

const Campo = ({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) => (
    <div className={className}>
        <strong className="text-gray-700 dark:text-gray-300">{label}</strong>
        <p className="mt-1 text-gray-700 dark:text-gray-400 whitespace-pre-wrap">
            {value ?? <span className="text-gray-600 italic">—</span>}
        </p>
    </div>
);

export default function ShowSolicitudCampo() {
    const { solicitud, solicitudesRelacionadas, historialPaquetes } = usePage().props as any;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Detalle Solicitud #${solicitud.id} — Campo`} />

            <div className="flex flex-col gap-6 p-4 bg-gray-100 dark:bg-gray-950">

                {/* HEADER */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 flex justify-between items-center">
                    <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        Detalle de Solicitud #{solicitud.id}
                    </h1>
                </div>

                {/* DATOS DEL CIUDADANO */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
                    <h2 className="text-base font-semibold text-[#4171B1] mb-4 border-b dark:border-gray-700 pb-2">
                        Datos del Ciudadano
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                        <Campo label="Tipo de Documento" value={solicitud.tipo_documento} />
                        <Campo label="Nro de Documento" value={solicitud.num_documento} />
                        <Campo label="Nombre Completo" value={solicitud.ciudadano} />
                        <Campo label="Teléfono" value={solicitud.telefono} />
                        <Campo label="Dirección" value={solicitud.direccion} />
                        <Campo label="Comuna" value={solicitud.comuna} />
                        <Campo label="Barrio" value={solicitud.barrio} />
                    </div>
                </div>

                {/* DATOS DE LA SOLICITUD */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
                    <h2 className="text-base font-semibold text-[#4171B1] mb-4 border-b dark:border-gray-700 pb-2">
                        Datos de la Solicitud
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                        <Campo label="ID SisbenApp" value={solicitud.id_sisben_app} />
                        <Campo label="Nro de Radicado" value={solicitud.num_radicado} />
                        <Campo label="Tipo de Trámite" value={solicitud.tipo_tramite} />
                        <Campo label="Asistencial" value={solicitud.asistencial} />
                        <Campo label="Fecha de Registro" value={solicitud.creado_el} />
                        <Campo label="Punto de Atención / Evento" value={solicitud.punto} />
                        <Campo label="Canal" value={solicitud.canal} />
                        <Campo label="Observación" value={solicitud.observacion} className="col-span-2 md:col-span-3" />
                        <Campo label="Estado" value={estadoGestionBadge(solicitud.estado_gestion)} />
                        {solicitud.cancelacion && (
                            <div className="col-span-2 md:col-span-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4">
                                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-3">Información de cancelación</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <Campo label="Cancelada por" value={solicitud.cancelacion.por ?? <span className="text-gray-600 italic">Sin registro</span>} />
                                    <Campo label="Fecha de cancelación" value={solicitud.cancelacion.en} />
                                    <Campo label="Motivo de cancelación" value={solicitud.cancelacion.motivo ?? <span className="text-gray-600 italic">Sin motivo registrado</span>} className="md:col-span-2" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* DATOS DE ENCUESTA */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
                    <h2 className="text-base font-semibold text-[#4171B1] mb-4 border-b dark:border-gray-700 pb-2">
                        Datos de Encuesta
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                        <Campo label="Paquete" value={solicitud.paquete_id} />
                        <Campo label="Código Encuestador" value={solicitud.encuestador_codigo} />
                        <Campo label="Nombre de Encuestador" value={solicitud.encuestador_nombre} />
                        <Campo label="Fecha de Ejecución" value={solicitud.fecha_ejecucion} />
                        <Campo label="Fecha de Notificación" value={solicitud.fecha_notificacion} />
                        <Campo label="Fecha Primera Visita" value={solicitud.fecha_visita1} />
                        <Campo label="Motivo Primera Visita" value={solicitud.motivo_visita1} />
                        <Campo label="Fecha Segunda Visita" value={solicitud.fecha_visita2} />
                        <Campo label="Motivo Segunda Visita" value={solicitud.motivo_visita2} />
                    </div>
                </div>

                {/* HISTORIAL DE PAQUETES */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
                    <h2 className="text-base font-semibold text-[#4171B1] mb-4 border-b dark:border-gray-700 pb-2">
                        Historial de paquetes
                    </h2>
                    {historialPaquetes?.length > 0 ? (
                        <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6">
                            {historialPaquetes.map((e: any, index: number) => (
                                <li key={index} className="ml-6">
                                    <span
                                        className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${
                                            e.activa ? 'bg-blue-500' : 'bg-gray-400'
                                        }`}
                                    />
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                            Paquete #{e.paquete_id}
                                        </span>
                                        {e.activa ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                                Actual
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                {e.salida_label ?? 'Salida'}
                                            </span>
                                        )}
                                    </div>
                                    {e.encuestador && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-medium">Encuestador:</span> {e.encuestador}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Asignada el {e.asignada_en ?? '—'}
                                        {e.asignada_por && <> por {e.asignada_por}</>}
                                    </p>
                                    {!e.activa && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Salió el {e.liberada_en ?? '—'}
                                            {e.liberada_por && <> por {e.liberada_por}</>}
                                        </p>
                                    )}
                                    {e.motivo_abreviacion && (
                                        <div className="mt-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
                                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                                {e.motivo_abreviacion}
                                            </p>
                                            {e.motivo_explicacion && (
                                                <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                                                    {e.motivo_explicacion}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-500 italic">
                            Esta solicitud aún no ha sido asignada a ningún paquete.
                        </p>
                    )}
                </div>

                {/* HISTORIAL DE VISITAS */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
                    <h2 className="text-base font-semibold text-[#4171B1] mb-4 border-b dark:border-gray-700 pb-2">
                        Historial de visitas
                    </h2>
                    {solicitud.visitas?.length > 0 ? (
                        <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6">
                            {solicitud.visitas.map((v: any) => {
                                const resultadoConfig: Record<string, { label: string; dot: string; badge: string }> = {
                                    exitosa:    { label: 'Exitosa',    dot: 'bg-green-500',  badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
                                    fallida:    { label: 'Fallida',    dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
                                    notificada: { label: 'Notificada', dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
                                };
                                const cfg = resultadoConfig[v.resultado] ?? { label: v.resultado, dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700' };
                                return (
                                    <li key={v.numero_visita} className="ml-6">
                                        <span className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${cfg.dot}`} />
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                                Visita {v.numero_visita}
                                            </span>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                                                {cfg.label}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{v.fecha}</span>
                                        </div>
                                        {v.encuestador && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                <span className="font-medium">Encuestador:</span>{' '}
                                                {v.encuestador.nombre_completo}{' '}
                                                <span className="text-xs text-gray-600">({v.encuestador.codigo})</span>
                                            </p>
                                        )}
                                        {v.paquete_id && (
                                            <p className="text-xs text-gray-600 dark:text-gray-500">
                                                Paquete #{v.paquete_id}
                                            </p>
                                        )}
                                        {v.motivo && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                                <span className="font-medium">Motivo:</span> {v.motivo}
                                            </p>
                                        )}
                                        {v.observacion && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 whitespace-pre-wrap italic">
                                                {v.observacion}
                                            </p>
                                        )}
                                        {v.fecha_notificacion && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                                <span className="font-medium">Fecha notificación:</span> {v.fecha_notificacion}
                                            </p>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-500 italic">
                            Aún no se han registrado visitas para esta solicitud.
                        </p>
                    )}
                </div>

                {/* BOTONES */}
                <div className="flex gap-3">
                    <Link
                        href="/gestion_campo"
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md text-sm text-gray-800 dark:text-gray-200"
                    >
                        Volver
                    </Link>
                </div>

                {/* SOLICITUDES RELACIONADAS */}
                {solicitudesRelacionadas?.length > 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
                        <h2 className="text-base font-semibold text-[#4171B1] mb-4 border-b dark:border-gray-700 pb-2">
                            Otras solicitudes con el mismo radicado
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800">
                                        <th scope="col" className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">#</th>
                                        <th scope="col" className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Trámite</th>
                                        <th scope="col" className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Canal</th>
                                        <th scope="col" className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Punto</th>
                                        <th scope="col" className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Estado</th>
                                        <th scope="col" className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Fecha</th>
                                        <th scope="col" className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {solicitudesRelacionadas.map((item: any, index: number) => (
                                        <tr key={item.id} className="border-t dark:border-gray-700">
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-400">{index + 1}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-400">{item.tipo_tramite}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-400">{item.canal}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-400">{item.punto}</td>
                                            <td className="px-3 py-2">{estadoGestionBadge(item.estado_gestion)}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-400">{item.creado_el}</td>
                                            <td className="px-3 py-2">
                                                <Link
                                                    href={`/gestion_campo/solicitudes/${item.id}`}
                                                    className="text-[#4171B1] hover:underline"
                                                >
                                                    Ver
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">No hay otras solicitudes registradas para este ciudadano.</p>
                    </div>
                )}

            </div>
        </AppLayout>
    );
}