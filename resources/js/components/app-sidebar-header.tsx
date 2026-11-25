import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { usePage } from '@inertiajs/react';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { useEventoLogout } from '@/hooks/useEventoLogout';

type PuntoAtencion = {
    id: number;
    nombre: string;
};

type EventoActivo = {
    id: number;
    nombre: string;
    fecha?: string;
    hora_fin?: string;
};

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { puntoAtencion, eventoActivo } = usePage().props as {
        puntoAtencion?: PuntoAtencion;
        eventoActivo?: EventoActivo;
    };

    useEventoLogout(eventoActivo);

    const label = eventoActivo
        ? <>Evento: <span className="font-semibold text-gray-700">{eventoActivo.nombre}</span></>
        : <>Punto de atención: <span className="font-semibold text-gray-700">{puntoAtencion?.nombre || 'No seleccionado'}</span></>;

    return (
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className="text-sm text-gray-500">
                {label}
            </div>
        </header>
    );
}
