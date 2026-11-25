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
        title: 'Detalle Atención',
        href: '#',
    },
];

type Atencion = {
    id: number;
    ciudadano: string;
    tipo_documento: string;
    num_documento: string;
    telefono: string;
    tipo_consulta: string;
    fecha: string;
    punto: string;
    asistencial: string;
    creado_el: string;
    creado_el_raw: string;
    puede_editar: boolean;
    plazo_edicion_horas: number;
    fecha_limite_edicion: string;
    plazo_edicion_vencido: boolean;
    comuna: string;
    barrio: string;
};

const Campo = ({ label, value, className = '' }: { label: string; value: ReactNode; className?: string }) => (
    <div className={className}>
        <strong>{label}</strong>
        <p className="mt-1 text-gray-700 whitespace-pre-wrap">{value ?? <span className="text-gray-600 italic">—</span>}</p>
    </div>
);

export default function ShowAtencion() {
    const { atencion, flash, auth } = usePage().props as unknown as { atencion: Atencion, flash: any, auth: any };
    const [showFlash, setShowFlash] = useState(!!flash?.error);
    const [errorMessage, setErrorMessage] = useState<string | null>(flash?.error || null);

    // Verificar si atencion existe
    if (!atencion) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Error" />
                <div className="flex flex-col gap-6 p-4 bg-gray-100">
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-red-600">Error: No se pudo cargar la información de la atención.</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    const isAdmin = auth?.user?.roles?.some((role: any) => role.name === 'Administrador');

    // El plazo y los permisos los resuelve el servidor (ver GestionsolicitudController).
    const canEdit = atencion.puede_editar;
    const plazoVencido = atencion.plazo_edicion_vencido;

    useEffect(() => {
        if (flash?.error) {
            setErrorMessage(flash.error);
            setShowFlash(true);
            const timer = setTimeout(() => setShowFlash(false), 10_000);
            return () => clearTimeout(timer);
        } else if (!isAdmin && plazoVencido) {
            setErrorMessage(
                `No se puede editar esta atención porque ya venció el plazo de ${atencion.plazo_edicion_horas} horas desde su creación.`,
            );
            setShowFlash(true);
            const timer = setTimeout(() => setShowFlash(false), 10_000);
            return () => clearTimeout(timer);
        }
    }, [flash?.error, plazoVencido, isAdmin, atencion.plazo_edicion_horas]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Detalle Atención" />

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
                        Detalle de Atención No Efectiva #{atencion.id}
                    </h1>
                </div>

                {/* DATOS DEL CIUDADANO */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-base font-semibold text-[#E85068] mb-4 border-b pb-2">
                        Datos del Ciudadano
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                        <Campo label="Tipo de Documento" value={atencion.tipo_documento} />
                        <Campo label="Nro de Documento" value={atencion.num_documento} />
                        <Campo label="Nombre Completo" value={atencion.ciudadano} />
                        <Campo label="Teléfono" value={atencion.telefono} />
                        <Campo label="Comuna" value={atencion.comuna} />
                        <Campo label="Barrio" value={atencion.barrio} />
                    </div>
                </div>

                {/* DATOS DE LA ATENCIÓN */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-base font-semibold text-[#E85068] mb-4 border-b pb-2">
                        Datos de la Atención
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                        <Campo label="Tipo de Consulta" value={atencion.tipo_consulta} />
                        <Campo label="Asistencial" value={atencion.asistencial} />
                        <Campo label="Fecha de Atención" value={atencion.fecha} />
                        <Campo label="Fecha de Registro" value={atencion.creado_el} />
                        <Campo label="Punto de Atención / Evento" value={atencion.punto} />
                    </div>
                </div>

                {/* BOTONES */}
                <div className="flex gap-3">
                    <Link
                        href="/gestion_solicitudes"
                        className="px-4 py-2 bg-gray-200 rounded-md text-sm hover:bg-gray-300"
                    >
                        Volver
                    </Link>
                    {canEdit && (
                        <Link
                            href={`/gestion_atenciones/${atencion.id}/edit`}
                            className="px-4 py-2 rounded-md bg-[#E85068] hover:brightness-110 text-gray-900 text-sm"
                        >
                            Editar
                        </Link>
                    )}
                </div>

            </div>
        </AppLayout>
    );
}
