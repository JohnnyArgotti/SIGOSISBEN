import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useEffect, useState } from 'react';
import { FileText, PlusCircle, Pencil, PowerOff, Power, ExternalLink } from 'lucide-react';
import { FlashMessage } from '@/components/flash-message';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Documentos Públicos',
        href: '/gestion_documentos_publicos',
    },
];

type DocumentoPublico = {
    id: number;
    nombre: string;
    enlace: string;
    estado: boolean;
    creado_el: string;
    actualizado_el: string;
};

export default function Index() {
    const { documentos, flash } = usePage().props as unknown as {
        documentos: DocumentoPublico[];
        flash?: { success?: string; error?: string };
    };

    const { auth } = usePage().props as any;

    const can = (permission: string) => {
        return auth.user.permissions?.includes(permission);
    };

    const [search, setSearch] = useState('');
    const [confirmDocumento, setConfirmDocumento] = useState<{ id: number; estado: boolean } | null>(null);

    const filtered = documentos.filter((d) =>
        d.nombre.toLowerCase().includes(search.toLowerCase())
    );

    const fmt = (date: string) =>
        date
            ? new Date(date).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
              })
            : '-';

    const handleToggle = (id: number) => {
        router.patch(`/gestion_documentos_publicos/${id}/toggle`, {}, {
            onSuccess: () => setConfirmDocumento(null),
        });
    };

    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['documentos'],
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Documentos Públicos" />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Gestión de documentos públicos</h1>

            <div className="flex flex-col gap-6 p-4 bg-[#F3F4F6]">

                {/* Flash */}
                <FlashMessage success={flash?.success} error={flash?.error} />

                {/* Botón registrar */}
                {can('Crear documentos públicos') && (
                    <div>
                        <Link
                            href="/gestion_documentos_publicos/create"
                            className="bg-[#4171B1] hover:bg-[#365f96] text-white px-4 py-2 rounded-md shadow"
                        >
                            <PlusCircle className="text-white w-5 h-5 inline mr-2" />
                            Registrar Documento Público
                        </Link>
                    </div>
                )}

                {/* Tabla */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">

                    {/* Cabecera */}
                    <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <FileText className="text-[#4171B1] w-5 h-5" />
                            <h2 className="font-bold text-gray-700 dark:text-gray-200">
                                Lista de Documentos Públicos
                            </h2>
                        </div>

                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4171B1] dark:bg-gray-800 dark:text-white w-64"
                        />
                    </div>

                    <div className="overflow-x-auto -mx-4">

                        <table className="w-full text-sm text-left table-auto">

                            <thead className="border-b bg-gray-50 dark:bg-gray-800 dark:text-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">ID</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Nombre</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Enlace</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Estado</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Creado</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Actualizado</th>
                                    <th scope="col" className="p-2 font-semibold text-center whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="dark:text-gray-300">

                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-4 text-center text-gray-600">
                                            No se encontraron documentos.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((d) => (
                                        <tr key={d.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">

                                            <td className="p-2 whitespace-nowrap">
                                                {d.id}
                                            </td>

                                            <td className="p-2 whitespace-nowrap">
                                                {d.nombre}
                                            </td>

                                            <td className="p-2 max-w-xs">
                                                {d.enlace.startsWith('https://') ? (
                                                    <a
                                                        href={d.enlace}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-[#4171B1] hover:underline"
                                                        title={d.enlace}
                                                    >
                                                        <span className="truncate max-w-[16rem]">{d.enlace}</span>
                                                        <ExternalLink size={14} className="shrink-0" />
                                                    </a>
                                                ) : (
                                                    <span className="truncate block max-w-[16rem]">{d.enlace}</span>
                                                )}
                                            </td>

                                            <td className="p-2 whitespace-nowrap">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        d.estado
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}
                                                >
                                                    {d.estado ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>

                                            <td className="p-2 whitespace-nowrap">
                                                {fmt(d.creado_el)}
                                            </td>

                                            <td className="p-2 whitespace-nowrap">
                                                {fmt(d.actualizado_el)}
                                            </td>

                                            {/* ACCIONES */}
                                            <td className="p-2 text-center whitespace-nowrap">
                                                <div className="flex justify-center gap-2">

                                                    {can('Editar documentos públicos') && (
                                                        <Link
                                                            href={`/gestion_documentos_publicos/${d.id}/edit`}
                                                            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 p-2 rounded-md"
                                                            title="Editar"
                                                            aria-label={`Editar el documento ${d.nombre}`}
                                                        >
                                                            <Pencil size={16} />
                                                        </Link>
                                                    )}

                                                    {can('Inactivar documentos públicos') && (
                                                        <button
                                                            onClick={() => setConfirmDocumento({ id: d.id, estado: d.estado })}
                                                            className={`${d.estado ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-gray-900 p-2 rounded-md`}
                                                            title={d.estado ? 'Inactivar' : 'Activar'}
                                                            aria-label={`${d.estado ? 'Inactivar' : 'Activar'} el documento ${d.nombre}`}
                                                        >
                                                            {d.estado ? <PowerOff size={16} /> : <Power size={16} />}
                                                        </button>
                                                    )}

                                                </div>
                                            </td>

                                        </tr>
                                    ))
                                )}

                            </tbody>

                        </table>

                    </div>
                </div>
            </div>

            {/* Modal de confirmación */}
            {confirmDocumento !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                            {confirmDocumento.estado ? '¿Inactivar documento?' : '¿Activar documento?'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            {confirmDocumento.estado
                                ? 'El documento dejará de mostrarse en "Acerca de".'
                                : 'El documento volverá a mostrarse en "Acerca de".'}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmDocumento(null)}
                                className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleToggle(confirmDocumento.id)}
                                className={`px-4 py-2 text-sm rounded-md text-white ${
                                    confirmDocumento.estado
                                        ? 'bg-red-500 hover:bg-red-600'
                                        : 'bg-green-500 hover:bg-green-600'
                                }`}
                            >
                                {confirmDocumento.estado ? 'Inactivar' : 'Activar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
