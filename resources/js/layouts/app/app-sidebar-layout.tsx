import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { InactivityGuard } from '@/components/inactivity-guard';
import { SkipLink } from '@/components/skip-link';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            {/* Primer elemento enfocable de la pagina: permite saltarse la barra
                lateral y la cabecera, que se repiten en todas las vistas. */}
            <SkipLink />
            <InactivityGuard />
            <AppSidebar />
            {/*
             * tabIndex={-1} hace el <main> enfocable por programa sin meterlo en
             * el recorrido de tabulacion. Sin el, algunos navegadores desplazan
             * la vista pero dejan el foco en el enlace, y el siguiente Tab
             * devuelve al usuario a la barra lateral.
             */}
            <AppContent
                variant="sidebar"
                className="overflow-auto"
                id="contenido-principal"
                tabIndex={-1}
            >
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
        </AppShell>
    );
}
