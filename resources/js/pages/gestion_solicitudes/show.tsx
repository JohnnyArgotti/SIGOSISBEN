import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useState, useEffect, type ReactNode } from 'react';
import { Transition } from '@headlessui/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Solicitudes',
        href: '/gestion_solicitudes',
    },
    {
        title: 'Detalle Solicitud',
        href: '#',
    },
];

type Solicitud = {
    id: number;
    ciudadano: string;
    tipo_documento: string;
    num_documento: string;
    telefono: string;
    tipo_tramite: string;
    canal: string;
    punto: string;
    asistencial: string;
    id_sisben_app: string;
    num_radicado: string;
    observacion: string;
    direccion: string;
    creado_el: string;
    creado_el_raw: string;
    puede_editar: boolean;
    plazo_edicion_horas: number;
    fecha_limite_edicion: string;
    plazo_edicion_vencido: boolean;
    comuna: string;
    barrio: string;
    estado_gestion?: string;
    cancelacion?: {
        por: string | null;
        en: string | null;
        motivo: string | null;
        desde: string | null;
    } | null;
    usuario: {
        id: number;
        nombres: string;
        apellidos: string;
    };
    solicitudesRelacionadas?: Array<{
        id: number;
        tipo_tramite: string;
        canal: string;
        punto: string;
        creado_el: string;
    }>;
};

const Campo = ({ label, value, className = '' }: { label: string; value: ReactNode; className?: string }) => (
    <div className={className}>
        <strong>{label}</strong>
        <p className="mt-1 text-gray-700 whitespace-pre-wrap">{value ?? <span className="text-gray-600 italic">—</span>}</p>
    </div>
);

export default function ShowSolicitud() {
    const { solicitud, solicitudesRelacionadas, auth, flash } = usePage().props as unknown as { solicitud: Solicitud, solicitudesRelacionadas: any[], auth: any, flash: any };
    const [showFlash, setShowFlash] = useState(!!flash?.error);
    const [errorMessage, setErrorMessage] = useState<string | null>(flash?.error || null);

    const isAdmin = auth.user?.roles?.some((role: any) => role.name === 'Administrador');

    // El plazo y los permisos los resuelve el servidor (ver GestionsolicitudController).
    const canEdit = solicitud.puede_editar;
    const plazoVencido = solicitud.plazo_edicion_vencido;

    useEffect(() => {
        if (flash?.error) {
            setErrorMessage(flash.error);
            setShowFlash(true);
            const timer = setTimeout(() => setShowFlash(false), 10_000);
            return () => clearTimeout(timer);
        } else if (!isAdmin && plazoVencido) {
            setErrorMessage(
                `No se puede editar esta solicitud porque ya venció el plazo de ${solicitud.plazo_edicion_horas} horas desde su creación.`,
            );
            setShowFlash(true);
            const timer = setTimeout(() => setShowFlash(false), 10_000);
            return () => clearTimeout(timer);
        }
    }, [flash?.error, plazoVencido, isAdmin, solicitud.plazo_edicion_horas]);

    // Mismo estado (de gestión) que se muestra en la tabla del listado.
    const estadoBadge = (estado: string) => {
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Detalle Solicitud" />

            <div className="flex flex-col gap-6 p-4 bg-gray-100">

                {/* FLASH ERROR */}
                <Transition
                    show={showFlash}
                    enter="transition ease-out duration-300"
                    enterFrom="opacity-0 -translate-y-2"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-300"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 -translate-y-2"
                >
                    <div className="rounded-md border border-red-200 bg-red-50 p-4">
                        <div className="flex items-center gap-3">
                            <svg className="h-5 w-5 text-red-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                        </div>
                    </div>
                </Transition>


                <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
                    <h1 className="text-lg font-semibold text-gray-800">
                        Detalle de Solicitud #{solicitud.id}
                    </h1>
                </div>


                {/* DATOS DEL CIUDADANO */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-base font-semibold text-[#4171B1] mb-4 border-b pb-2">
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
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-base font-semibold text-[#4171B1] mb-4 border-b pb-2">
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
                        <Campo label="Estado" value={estadoBadge(solicitud.estado_gestion ?? 'registrada')} />
                        {solicitud.cancelacion && (
                            <div className="col-span-2 md:col-span-3 rounded-lg border border-red-200 bg-red-50 p-4">
                                <h3 className="text-sm font-semibold text-red-800 mb-3">Información de cancelación</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <Campo label="Cancelada por" value={solicitud.cancelacion.por ?? <span className="text-gray-600 italic">Sin registro</span>} />
                                    <Campo label="Fecha de cancelación" value={solicitud.cancelacion.en} />
                                    <Campo label="Motivo de cancelación" value={solicitud.cancelacion.motivo ?? <span className="text-gray-600 italic">Sin motivo registrado</span>} className="md:col-span-2" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* BOTONES */}
                <div className="flex flex-col gap-2">
                    <div className="flex gap-3">
                        <Link
                            href="/gestion_solicitudes"
                            className="px-4 py-2 bg-gray-200 rounded-md text-sm hover:bg-gray-300"
                        >
                            Volver
                        </Link>
                        {canEdit && (
                            <Link
                                href={`/gestion_solicitudes/${solicitud.id}/edit`}
                                className="px-4 py-2 rounded-md bg-[#3F73B3] hover:bg-[#365f96] rounded-md text-white text-sm"
                            >
                                Editar
                            </Link>
                        )}
                    </div>

                </div>

                {solicitudesRelacionadas?.length > 0 ? (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-base font-semibold text-[#4171B1] mb-4 border-b pb-2">
                            Otras solicitudes con el mismo radicado
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th scope="col" className="px-3 py-2 text-left">#</th>
                                        <th scope="col" className="px-3 py-2 text-left">Trámite</th>
                                        <th scope="col" className="px-3 py-2 text-left">Canal</th>
                                        <th scope="col" className="px-3 py-2 text-left">Punto</th>
                                        <th scope="col" className="px-3 py-2 text-left">Fecha</th>
                                        <th scope="col" className="px-3 py-2 text-left">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {solicitudesRelacionadas.map((item: any, index: number) => (
                                        <tr key={item.id} className="border-t">
                                            <td className="px-3 py-2">{index + 1}</td>
                                            <td className="px-3 py-2">{item.tipo_tramite}</td>
                                            <td className="px-3 py-2">{item.canal}</td>
                                            <td className="px-3 py-2">{item.punto}</td>
                                            <td className="px-3 py-2">{item.creado_el}</td>
                                            <td className="px-3 py-2">
                                                <Link
                                                    href={`/gestion_solicitudes/${item.id}`}
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
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">No hay otras solicitudes registradas para este ciudadano.</p>
                    </div>
                )}

            </div>
        </AppLayout>
    );
}
