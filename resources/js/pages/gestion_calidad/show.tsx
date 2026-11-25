import { Head, Link, usePage } from '@inertiajs/react';
import { Eye, Pencil } from 'lucide-react';
import { useState } from 'react';
import VisorPdf from '@/components/visor-pdf';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de calidad',
        href: '/gestion_calidad',
    },
    {
        title: 'Detalle de Solicitud',
        href: '#',
    },
];

const estadoGestionBadge = (estado: string) => {
    const map: Record<string, { label: string; className: string }> = {
        ejecutada:  { label: 'Ejecutada',  className: 'bg-green-500 text-gray-900' },
        notificada: { label: 'Notificada', className: 'bg-purple-600 text-white' },
        cancelada:  { label: 'Cancelada',  className: 'bg-red-200 text-red-800' },
        pendiente:  { label: 'Pendiente',  className: 'bg-orange-400 text-gray-900' },
        // Desenlaces reportados por el DNP
        aprobada:      { label: 'Aprobada',        className: 'bg-green-700 text-white' },
        sincronizada:  { label: 'Sincronizada',    className: 'bg-blue-600 text-white' },
        realizada:     { label: 'Realizada',       className: 'bg-green-600 text-gray-900' },
        pendiente_dnp: { label: 'Pendiente (DNP)', className: 'bg-yellow-700 text-white' },
        cancelada_dnp: { label: 'Cancelada (DNP)', className: 'bg-red-900 text-white' },
        rechazada:     { label: 'Rechazada',       className: 'bg-red-700 text-white' },
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
        <strong className="text-gray-700 dark:text-gray-300 text-sm">{label}</strong>
        <p className="mt-1 text-gray-700 dark:text-gray-400 text-sm whitespace-pre-wrap">
            {value ?? <span className="text-gray-600 italic">—</span>}
        </p>
    </div>
);

export default function ShowSolicitudCalidad() {
    const { solicitud, auth } = usePage().props as any;
    const [visorAbierto, setVisorAbierto] = useState(false);

    const can = (permission: string) => auth?.user?.permissions?.includes(permission);
    const puedeEditarHogar = can('Editar hogares') && solicitud.puede_editar_hogar;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Detalle Solicitud #${solicitud.id} — Calidad`} />

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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <Campo label="ID SisbenApp" value={solicitud.id_SisbenApp} />
                        <Campo label="Nro de Radicado" value={solicitud.num_radicado} />
                        <Campo label="Tipo de Trámite" value={solicitud.tipo_tramite} />
                        <Campo label="Asistencial" value={solicitud.asistencial} />
                        <Campo label="Fecha de Registro" value={solicitud.creado_el} />
                        <Campo label="Punto de Atención / Evento" value={solicitud.punto} />
                        <Campo label="Canal" value={solicitud.canal} />
                        <Campo label="Observación" value={solicitud.observacion} className="col-span-2 md:col-span-3" />
                        <Campo label="Estado" value={estadoGestionBadge(solicitud.estado_gestion)} />
                    </div>
                </div>

                {/* DATOS DE ENCUESTA */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
                    <h2 className="text-base font-semibold text-[#4171B1] mb-4 border-b dark:border-gray-700 pb-2">
                        Datos de Encuesta
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <Campo label="Paquete" value={solicitud.paquete_id} />
                        <Campo label="Código Encuestador" value={solicitud.encuestador_codigo} />
                        <Campo label="Nombre de Encuestador" value={solicitud.encuestador_nombre} />
                        <Campo label="Fecha de Ejecución" value={solicitud.fecha_ejecucion} />
                        <Campo label="Fecha de Notificación" value={solicitud.fecha_notificacion} />
                        <Campo label="Fecha Primera Visita" value={solicitud.fecha_visita1} />
                        <Campo label="Motivo Primera Visita" value={solicitud.motivo_visita1} />
                        <Campo label="Fecha Segunda Visita" value={solicitud.fecha_visita2} />
                        <Campo label="Motivo Segunda Visita" value={solicitud.motivo_visita2} />
                        {solicitud.observacion_visita1 && (
                            <Campo label="Observaciones Primera Visita" value={solicitud.observacion_visita1} className="col-span-2 md:col-span-3" />
                        )}
                        {solicitud.observacion_visita2 && (
                            <Campo label="Observaciones Segunda Visita" value={solicitud.observacion_visita2} className="col-span-2 md:col-span-3" />
                        )}
                    </div>
                </div>

                {/* DATOS DE HOGAR */}
                {solicitud.tiene_registro && (
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between gap-3 mb-4 border-b dark:border-gray-700 pb-2">
                            <h2 className="text-base font-semibold text-[#4171B1]">
                                Datos de Hogar
                            </h2>
                            {puedeEditarHogar && (
                                <Link
                                    href={`/gestion_calidad/${solicitud.id}/editar-hogar`}
                                    title="Editar hogar"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-gray-900 text-xs font-medium transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Editar hogar
                                </Link>
                            )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <Campo label="Cantidad de Hogares" value={solicitud.cantidad_hogares} />
                            <Campo label="Categoría SISBÉN IV" value={
                                solicitud.categoria_sisben
                                    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">{solicitud.categoria_sisben}</span>
                                    : null
                            } />
                            <Campo label="Registrado por"      value={solicitud.usuario_calidad} />
                            <Campo label="Fecha de Resolución" value={solicitud.fecha_resolucion} />
                        </div>

                        <div className="mt-6">
                            <Campo
                                label="Observación DNP"
                                value={solicitud.observacion_dnp
                                    ? <span className="whitespace-pre-line">{solicitud.observacion_dnp}</span>
                                    : null}
                            />
                        </div>

                        {/* Soporte PDF */}
                        {solicitud.tiene_documento && (
                            <div className="mt-5 pt-4 border-t dark:border-gray-700 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Archivo soporte
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {solicitud.documento_nombre}
                                        {solicitud.documento_tamano && (
                                            <span className="ml-2 text-gray-600">({solicitud.documento_tamano})</span>
                                        )}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setVisorAbierto(true)}
                                    title="Ver soporte PDF"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4171B1] hover:bg-[#365f96] text-white text-xs font-medium transition-colors"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    Ver PDF
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {solicitud.tiene_documento && (
                    <VisorPdf
                        abierto={visorAbierto}
                        onOpenChange={setVisorAbierto}
                        urlVer={`/gestion_calidad/${solicitud.id}/ver-soporte`}
                        urlDescargar={`/gestion_calidad/${solicitud.id}/descargar-soporte`}
                        nombreArchivo={solicitud.documento_nombre}
                        tamanoArchivo={solicitud.documento_tamano}
                    />
                )}

                {/* BOTONES */}
                <div className="flex gap-3">
                    <Link
                        href="/gestion_calidad"
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md text-sm text-gray-800 dark:text-gray-200 transition-colors"
                    >
                        Volver
                    </Link>
                </div>

            </div>
        </AppLayout>
    );
}
