import { Head, useForm, usePage } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { useState, useEffect } from 'react'
import type { BreadcrumbItem } from '@/types'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import InputError from '@/components/input-error'
import { Transition } from '@headlessui/react'
import BarrioCombobox from '@/components/barrio-combobox'

type TipoDocumento = {
    id: number
    nombre: string
    codigo: string
}

type Comuna = {
    id: number
    nombre: string
}

type Barrio = {
    id: number
    nombre: string
    comuna_id: number
}

type TipoConsulta = {
    id: number
    nombre: string
}

type Canal = {
    id: number
    nombre: string
}

type Atencion = {
    id: number
    tipo_consulta_id: number | ''
    fecha: string
    punto_atencion_id: number
    creado_el: string
    creado_el_raw: string
    ciudadano: {
        nombre_completo: string
        num_documento: string
        telefono: string
        tipo_documento_id: number
        comuna_id: number
        barrio_id: number
    }
    comuna_id: number
    barrio_id: number
    canal_id: number
    usuario?: {
        id: number
    }
}

type Props = {
    tiposDocumento: TipoDocumento[],
    tiposConsulta: TipoConsulta[],
    comunas: Comuna[],
    canales: Canal[],
    barrios: Barrio[],
    atencion: Atencion,
    flash: any
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Solicitudes',
        href: '/gestion_solicitudes',
    },
    {
        title: 'Editar atención',
        href: '#',
    },
]

export default function EditarAtencion({ tiposDocumento, tiposConsulta, comunas, canales, barrios, atencion, flash }: Props) {

    const [barriosFiltrados, setBarriosFiltrados] = useState<Barrio[]>([])
    const [showFlash, setShowFlash] = useState(!!flash?.error)
    const [errorMessage, setErrorMessage] = useState<string | null>(flash?.error || null)

    const { data, setData, put, processing, errors } = useForm<{
        nombre: string
        documento: string
        tipo_documento_id: number | ''
        telefono: string
        comuna_id: number | ''
        barrio_id: number | ''
        barrio: string
        tipo_consulta_id: number | ''
        fecha: string
        canal_id: number | ''
    }>({
        nombre: atencion.ciudadano?.nombre_completo ?? '',
        documento: atencion.ciudadano?.num_documento ?? '',
        tipo_documento_id: atencion.ciudadano?.tipo_documento_id ?? '',
        telefono: atencion.ciudadano?.telefono ?? '',
        comuna_id: atencion.comuna_id ?? '',
        barrio_id: atencion.barrio_id ?? '' as number | '',
        barrio: '',
        tipo_consulta_id: atencion.tipo_consulta_id ?? '',
        fecha: atencion.fecha ?? '',
        canal_id: atencion.canal_id ?? '',
    })

    useEffect(() => {
        const comunaId = data.comuna_id
        if (comunaId) {
            setBarriosFiltrados(barrios.filter(b => b.comuna_id === Number(comunaId)))
        }
    }, [data.comuna_id])

    const { auth } = usePage().props as any

    const isAdmin = auth.user?.roles?.some((role: any) => role.name === 'Administrador')

    // El acceso a esta pantalla ya lo valida el backend (propiedad, permiso y
    // plazo de edición); aquí solo se muestran los errores que llegan por flash.
    useEffect(() => {
        if (flash?.error) {
            setErrorMessage(flash.error)
            setShowFlash(true)
            const timer = setTimeout(() => setShowFlash(false), 10_000)
            return () => clearTimeout(timer)
        }
    }, [flash?.error])

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        put(`/gestion_atenciones/${atencion.id}`)
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Atención" />

            <div className="flex flex-col gap-6 p-4 bg-gray-100">

                {/* FLASH ERROR - Solo mostrar si no es admin */}
                {!isAdmin && (
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
                )}

                <div className="bg-white rounded-lg shadow p-1 flex justify-between items-center">
                    <h1 className="text-lg font-semibold">Editar Atención No Efectiva</h1>
                </div>

                <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 space-y-4">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="tipo_documento_id">Tipo de Documento *</Label>
                            <select
                                id="tipo_documento_id"
                                aria-invalid={!!errors.tipo_documento_id}
                                aria-describedby={errors.tipo_documento_id ? 'tipo_documento_id-error' : undefined}
                                value={data.tipo_documento_id}
                                onChange={e => setData('tipo_documento_id', e.target.value ? Number(e.target.value) : '')}
                                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                
                            >
                                <option value="">Seleccionar...</option>
                                {tiposDocumento.map(td => (
                                    <option key={td.id} value={td.id}>{td.codigo} – {td.nombre}</option>
                                ))}
                            </select>
                            <InputError id="tipo_documento_id-error" message={errors.tipo_documento_id} />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="documento">Número de documento *</Label>
                            <Input
                                id="documento"
                                aria-invalid={!!errors.documento}
                                aria-describedby={errors.documento ? 'documento-error' : undefined}
                                placeholder="Ingrese número documento"
                                maxLength={14}
                                inputMode="numeric"
                                value={data.documento}
                                onChange={e => setData('documento', e.target.value.replace(/\D/g, ''))}
                                
                            />
                            <InputError id="documento-error" message={errors.documento} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="nombre">Nombre completo *</Label>
                        <Input
                            id="nombre"
                            aria-invalid={!!errors.nombre}
                            aria-describedby={errors.nombre ? 'nombre-error' : undefined}
                            placeholder="Ingrese el nombre completo"
                            maxLength={120}
                            value={data.nombre}
                            onChange={e => setData('nombre', e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').toUpperCase())}
                            
                        />
                        <InputError id="nombre-error" message={errors.nombre} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="telefono">Teléfono</Label>
                            <Input
                                id="telefono"
                                aria-invalid={!!errors.telefono}
                                aria-describedby={errors.telefono ? 'telefono-error' : undefined}
                                type="text"
                                maxLength={10}
                                inputMode="numeric"
                                placeholder="Ingrese el número de teléfono"
                                value={data.telefono}
                                onChange={e => setData('telefono', e.target.value.replace(/\D/g, ''))}
                                
                            />
                            <InputError id="telefono-error" message={errors.telefono} />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="comuna_id">Comuna *</Label>
                            <select
                                id="comuna_id"
                                aria-invalid={!!errors.comuna_id}
                                aria-describedby={errors.comuna_id ? 'comuna_id-error' : undefined}
                                value={data.comuna_id}
                                onChange={e => {
                                    const comunaId = e.target.value
                                    setData(d => ({ ...d, comuna_id: comunaId ? Number(comunaId) : '', barrio_id: '', barrio: '' }))
                                    setBarriosFiltrados(comunaId ? barrios.filter(b => b.comuna_id === Number(comunaId)) : [])
                                }}
                                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                
                            >
                                <option value="">Seleccionar...</option>
                                {comunas.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                            <InputError id="comuna_id-error" message={errors.comuna_id} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Barrio</Label>
                            <BarrioCombobox
                                barrios={barriosFiltrados}
                                comunaId={data.comuna_id}
                                value={data.barrio_id}
                                newValue={data.barrio}
                                onSelect={(id, nombre) => {
                                    setData(d => ({
                                        ...d,
                                        barrio_id: id,
                                        barrio: nombre,
                                    }))
                                }}
                                disabled={!data.comuna_id}
                                error={errors.barrio_id || errors.barrio}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="tipo_consulta_id">Tipo de Consulta *</Label>
                            <select
                                id="tipo_consulta_id"
                                aria-invalid={!!errors.tipo_consulta_id}
                                aria-describedby={errors.tipo_consulta_id ? 'tipo_consulta_id-error' : undefined}
                                value={data.tipo_consulta_id}
                                onChange={e => setData('tipo_consulta_id', e.target.value ? Number(e.target.value) : '')}
                                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                
                            >
                                <option value="">Seleccionar...</option>
                                {tiposConsulta.map(tc => (
                                    <option key={tc.id} value={tc.id}>{tc.nombre}</option>
                                ))}
                            </select>
                            <InputError id="tipo_consulta_id-error" message={errors.tipo_consulta_id} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="fecha">Fecha de Atención</Label>
                            <Input
                                id="fecha"
                                aria-invalid={!!errors.fecha}
                                aria-describedby={errors.fecha ? 'fecha-error' : undefined}
                                type="datetime-local"
                                value={data.fecha}
                                onChange={e => setData('fecha', e.target.value)}
                                className="w-full border rounded-md px-3 py-2 text-sm"
                            />
                            <InputError id="fecha-error" message={errors.fecha} />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="canal_id">Canal</Label>
                            <select
                                id="canal_id"
                                aria-invalid={!!errors.canal_id}
                                aria-describedby={errors.canal_id ? 'canal_id-error' : undefined}
                                value={data.canal_id}
                                onChange={e => setData('canal_id', e.target.value ? Number(e.target.value) : '')}
                                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                              
                            >
                                <option value="">Seleccionar...</option>
                                {canales.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                            <InputError id="canal_id-error" message={errors.canal_id} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3">
                        <a
                            href="/gestion_solicitudes"
                            className="bg-[#E85068] hover:brightness-110 text-gray-900 px-4 py-2 rounded-md text-sm transition duration-200"
                        >
                            Cancelar
                        </a>
                        <Button
                            type="submit"
                            className="bg-[#3F73B3] hover:bg-[#365f96] text-white"
                        >
                            {processing ? 'Actualizando...' : 'Actualizar Atención'}
                        </Button>
                    </div>

                </form>

            </div>
        </AppLayout>
    );
}
