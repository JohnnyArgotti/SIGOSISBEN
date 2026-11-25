import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Acceso pendiente', href: '#' },
];

type Props = {
    autenticacion_ad: boolean;
    nombre: string;
};

export default function SinAcceso() {
    const { autenticacion_ad, nombre } = usePage().props as unknown as Props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Acceso pendiente" />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Acceso pendiente</h1>

            <div className="flex h-full flex-1 flex-col gap-4 overflow-auto rounded-xl p-4">
                <div className="relative min-h-[60vh] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-5 px-6 max-w-lg text-center">

                            {/* Ícono de alerta */}
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                                <svg
                                    className="h-8 w-8 text-yellow-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                                    />
                                </svg>
                            </div>

                            {/* Título y bienvenida */}
                            <div>
                                {nombre && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                        Bienvenido/a, <span className="font-medium">{nombre}</span>
                                    </p>
                                )}
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                                    Acceso pendiente de configuración
                                </h2>
                            </div>

                            {/* Mensaje diferenciado */}
                            <p className="text-gray-600 dark:text-gray-400">
                                {autenticacion_ad
                                    ? 'Su cuenta fue autenticada correctamente mediante Active Directory, pero aún no posee permisos asignados dentro del SIGO Sisben. Comuníquese con el administrador del sistema para que le asigne el perfil correspondiente.'
                                    : 'Su cuenta no posee permisos configurados dentro del SIGO Sisben. Comuníquese con el administrador del sistema para que le asigne el perfil correspondiente.'}
                            </p>

                            {/* Etiqueta de tipo */}
                            <span className="rounded bg-gray-200 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                                {autenticacion_ad ? 'Active Directory' : 'Local'} · Sin roles asignados
                            </span>

                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
