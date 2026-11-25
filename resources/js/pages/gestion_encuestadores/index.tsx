import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import type { BreadcrumbItem } from '@/types'
import { useEffect, useRef, useState } from 'react'
import { FilePlus, PlusCircle, Pencil, PowerOff, Power, Download, Info } from 'lucide-react'
import Pagination from '@/components/Pagination'
import { FlashMessage } from '@/components/flash-message'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Gestión Encuestadores', href: '/gestion_encuestadores' },
]

export default function Index() {
    const { auth, encuestadores = { data: [], total: 0, current_page: 1, last_page: 1 }, flash, filters = {} } = usePage().props as any

    const [search, setSearch] = useState((filters as any).search || '')
    const [confirm, setConfirm] = useState<{ id: number; estado: boolean } | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [])

    const can = (permission: string) => {
        return auth.user.permissions?.includes(permission)
    }

    const descargar = (tipo: string) => {
        const params = new URLSearchParams({ search, tipo })
        window.open(`/gestion_encuestadores/exportar?${params.toString()}`, '_blank')
    }

    const aplicarFiltros = (override: Partial<{ search: string; pagina: number }> = {}) => {
        router.get('/gestion_encuestadores', {
            search,
            pagina: encuestadores.current_page,
            ...override,
        }, { preserveState: true, replace: true })
    }

    const irAPagina = (pagina: number) => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        aplicarFiltros({ pagina })
    }

    const filtered = encuestadores.data || []

    const fmt = (date: string) =>
        date
            ? new Date(date).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
              })
            : '-'

    const handleToggle = (id: number) => {
        router.patch(`/gestion_encuestadores/${id}/toggle`, {}, {
            onSuccess: () => setConfirm(null),
        })
    }
    

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión Encuestadores" />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Gestión de encuestadores</h1>

            <div className="flex flex-col gap-4 sm:gap-6 p-2 sm:p-4 bg-[#F3F4F6] dark:bg-gray-950 text-gray-900 dark:text-gray-200">

                {(flash?.success || flash?.error) && (
                    <FlashMessage success={flash?.success} error={flash?.error} />
                )}

                {/* BOTÓN */}
                <div>
                    {can('Crear encuestadores') && (
                        <Link
                            href="/gestion_encuestadores/create"
                            className="bg-[#4171B1] hover:bg-[#365f96] text-white px-4 py-2 rounded-md shadow"
                        >
                            <PlusCircle className="text-white w-5 h-5 inline mr-2" />
                            Registrar encuestador
                        </Link>
                    )}
                </div>

                {/* TABLA */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">

                    <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <FilePlus className="text-[#4171B1] w-5 h-5" />
                            <h2 className="font-bold text-gray-700 dark:text-gray-200">
                                Lista de Encuestadores({encuestadores.total || 0})
                            </h2>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={() => descargar('xlsx')}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium text-gray-900 transition-colors"
                                >
                                    <Download size={16} />
                                    Excel
                                </button>
                                <button
                                    onClick={() => descargar('csv')}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium text-white transition-colors"
                                >
                                    <Download size={16} />
                                    CSV
                                </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        setSearch(value)
                                        if (debounceRef.current) clearTimeout(debounceRef.current)
                                        debounceRef.current = setTimeout(() => {
                                            aplicarFiltros({ search: value, pagina: 1 })
                                        }, 500)
                                    }}
                                    className="border dark:border-gray-700 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                                />
                                <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                        <TooltipTrigger type="button" className="text-gray-600 hover:text-gray-600 dark:hover:text-gray-300">
                                            <Info size={16} />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Buscar por código o documento</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto -mx-4">
                        <table className="w-full text-sm text-left table-auto">
                            <thead className="border-b bg-gray-50 dark:bg-gray-800 dark:text-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Código</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Tipo de Documento</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Nro Documento</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Nombres</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Apellidos</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Teléfono</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Estado</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Creado</th>
                                    <th scope="col" className="p-2 font-semibold whitespace-nowrap">Actualizado</th>
                                    <th scope="col" className="p-2 font-semibold text-center whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="dark:text-gray-300">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="p-4 text-center text-gray-600 dark:text-gray-500">
                                            No hay encuestadores.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((e: any) => (
                                        <tr key={e.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="p-2 whitespace-nowrap">{e.codigo}</td>
                                            <td className="p-2 whitespace-nowrap">{e.tipo_documento?.codigo ?? '-'}</td>
                                            <td className="p-2 whitespace-nowrap">{e.num_documento || '-'}</td>
                                            <td className="p-2 whitespace-nowrap">{e.nombres}</td>
                                            <td className="p-2 whitespace-nowrap">{e.apellidos}</td>
                                            <td className="p-2 whitespace-nowrap">{e.telefono || '-'}</td>

                                            <td className="p-2 whitespace-nowrap">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        e.estado
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}
                                                >
                                                    {e.estado ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>

                                            <td className="p-2 whitespace-nowrap">{fmt(e.creado_el)}</td>
                                            <td className="p-2 whitespace-nowrap">{fmt(e.actualizado_el)}</td>

                                            <td className="p-2 text-center whitespace-nowrap">
                                                <div className="flex justify-center gap-2">

                                                    {can('Editar encuestadores') && (
                                                        <Link
                                                            href={`/gestion_encuestadores/${e.id}/edit`}
                                                            title="Editar encuestador"
                                                            aria-label={`Editar al encuestador ${e.nombres} ${e.apellidos}`}
                                                            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 p-2 rounded-md"
                                                        >
                                                            <Pencil size={16} />
                                                        </Link>
                                                    )}

                                                    {can('Inactivar encuestadores') && (
                                                        <button
                                                            onClick={() => setConfirm({ id: e.id, estado: e.estado })}
                                                            className={`${e.estado ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-gray-900 p-1.5 rounded-md`}
                                                            title={e.estado ? 'Inactivar' : 'Activar'}
                                                            aria-label={`${e.estado ? 'Inactivar' : 'Activar'} al encuestador ${e.nombres} ${e.apellidos}`}
                                                        >
                                                            {e.estado ? <PowerOff size={16} /> : <Power size={16} />}
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

                    {encuestadores.last_page > 1 && (
                        <Pagination
                            currentPage={encuestadores.current_page}
                            lastPage={encuestadores.last_page}
                            total={encuestadores.total}
                            perPage={10}
                            onPageChange={irAPagina}
                        />
                    )}
                </div>
            </div>

            {/* MODAL */}
            {confirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-sm">

                        <h3 className="font-semibold mb-2">
                            {confirm.estado ? '¿Inactivar encuestador?' : '¿Activar encuestador?'}
                        </h3>

                        <p className="text-sm text-gray-500 mb-6">
                            {confirm.estado
                                ? 'El encuestador será desactivado.'
                                : 'El encuestador será activado nuevamente.'}
                        </p>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setConfirm(null)}
                                className="px-3 py-1 border rounded"
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={() => handleToggle(confirm.id)}
                                className={`px-3 py-1 text-gray-900 rounded ${confirm.estado ? 'bg-red-500' : 'bg-green-500'
                                    }`}
                            >
                                Confirmar
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </AppLayout>
    )
}