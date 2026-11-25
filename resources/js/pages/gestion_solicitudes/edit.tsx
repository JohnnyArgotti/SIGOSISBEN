import { Head, useForm } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { useState, useEffect } from 'react'
import type { BreadcrumbItem } from '@/types'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import InputError from '@/components/input-error'
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

type TipoTramite = {
    id: number
    nombre: string
    codigo: string
}

type Canal = {
    id: number
    nombre: string
}

type Solicitud = {
    id: number
    id_SisbenApp: string
    num_radicado: string
    tipo_tramite_id: number | ''
    punto_atencion_id: number
    creado_el: string
    ciudadano: {
        nombre_completo: string
        num_documento: string
        telefono: string
        tipo_documento_id: number
        comuna_id: number
        barrio_id: number
        direccion?: string
    }
    comuna_id: number
    barrio_id: number
    canal_id: number
    observacion: string
    direccion: string
    usuario?: {
        id: number
    }
}

type Props = {
    tiposDocumento: TipoDocumento[],
    comunas: Comuna[],
    tiposTramite: TipoTramite[],
    canales: Canal[],
    barrios: Barrio[],
    puntoAtencionId: number | null,
    solicitud: Solicitud,
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Solicitudes',
        href: '/gestion_solicitudes',
    },
    {
        title: 'Editar solicitud',
        href: '#',
    },
]

export default function EditarSolicitud({ tiposDocumento, tiposTramite, comunas, canales, barrios, puntoAtencionId, solicitud }: Props) {

    const [tipoSolicitud, setTipoSolicitud] = useState<'efectiva' | 'no_efectiva'>('efectiva')
    const [barriosFiltrados, setBarriosFiltrados] = useState<Barrio[]>([])

    const { data, setData, put, processing, errors } = useForm<{
        nombre: string
        documento: string
        tipo_documento_id: number | ''
        telefono: string
        comuna_id: number | ''
        barrio_id: number | ''
        barrio: string
        direccion: string
        tipo_tramite_id: number | ''
        canal_id: number | ''
        observacion: string
        id_sisben_app: string
        radicado: string
        tipo_solicitud: 'efectiva' | 'no_efectiva'
    }>({
        nombre: solicitud.ciudadano?.nombre_completo ?? '',
        documento: solicitud.ciudadano?.num_documento ?? '',
        tipo_documento_id: solicitud.ciudadano?.tipo_documento_id ?? '',
        telefono: solicitud.ciudadano?.telefono ?? '',
        comuna_id: solicitud.comuna_id ?? '',
        barrio_id: solicitud.barrio_id ?? '' as number | '',
        barrio: '',
        direccion: solicitud.direccion ?? '',
        tipo_tramite_id: solicitud.tipo_tramite_id ?? '',
        canal_id: solicitud.canal_id ?? '',
        observacion: solicitud.observacion ?? '',
        id_sisben_app: solicitud.id_SisbenApp ?? '',
        radicado: solicitud.num_radicado ?? '',
        tipo_solicitud: 'efectiva',
    })

    useEffect(() => {
        const comunaId = data.comuna_id
        if (comunaId) {
            setBarriosFiltrados(barrios.filter(b => b.comuna_id === Number(comunaId)))
        }
    }, [data.comuna_id])

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        put(`/gestion_solicitudes/${solicitud.id}`)
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Solicitud" />

            <div className="flex flex-col gap-6 p-4 bg-gray-100">

                <div className="bg-white rounded-lg shadow p-1 flex justify-between items-center">
                    <h1 className="text-lg font-semibold">Editar Solicitud</h1>
                </div>

                <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 space-y-4">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        <div className="space-y-1">
                            <Label htmlFor="id_sisben_app">Id SisbenApp</Label>
                            <Input
                                id="id_sisben_app"
                                aria-invalid={!!errors.id_sisben_app}
                                aria-describedby={errors.id_sisben_app ? 'id_sisben_app-error' : undefined}
                                placeholder="Ingrese ID SisbenApp"
                                maxLength={15}
                                inputMode="numeric"
                                value={data.id_sisben_app}
                                onChange={e => setData('id_sisben_app', e.target.value.replace(/\D/g, ''))}
                                
                            />
                            <InputError id="id_sisben_app-error" message={errors.id_sisben_app} />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="radicado">Radicado</Label>
                            <Input
                                id="radicado"
                                aria-invalid={!!errors.radicado}
                                aria-describedby={errors.radicado ? 'radicado-error' : undefined}
                                placeholder="Ingrese número de radicado"
                                maxLength={22}
                                inputMode="numeric"
                                value={data.radicado}
                                onChange={e => setData('radicado', e.target.value.replace(/\D/g, ''))}
                                
                            />
                            <InputError id="radicado-error" message={errors.radicado} />
                        </div>

                    </div>

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
                            <Label htmlFor="direccion">Dirección completa</Label>
                            <Input
                                id="direccion"
                                aria-invalid={!!errors.direccion}
                                aria-describedby={errors.direccion ? 'direccion-error' : undefined}
                                placeholder="Ingrese la dirección completa"
                                maxLength={150}
                                value={data.direccion}
                                onChange={e => setData('direccion', e.target.value)}
                            />
                            <InputError id="direccion-error" message={errors.direccion} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="tipo_tramite_id">Tipo de Tramite *</Label>
                            <select
                                id="tipo_tramite_id"
                                aria-invalid={!!errors.tipo_tramite_id}
                                aria-describedby={errors.tipo_tramite_id ? 'tipo_tramite_id-error' : undefined}
                                value={data.tipo_tramite_id}
                                onChange={e => setData('tipo_tramite_id', e.target.value ? Number(e.target.value) : '')}
                                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                             
                            >
                                <option value="">Seleccionar...</option>
                                {tiposTramite.map(tt => (
                                    <option key={tt.id} value={tt.id}>{tt.codigo} – {tt.nombre}</option>
                                ))}
                            </select>
                            <InputError id="tipo_tramite_id-error" message={errors.tipo_tramite_id} />
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

                    <div className="space-y-1">
                        <Label htmlFor="observacion">Observación</Label>
                        <textarea
                            id="observacion"
                            aria-invalid={!!errors.observacion}
                            aria-describedby={errors.observacion ? 'observacion-error' : undefined}
                            placeholder="Escriba aquí la observación..."
                            maxLength={300}
                            value={data.observacion}
                            onChange={e => setData('observacion', e.target.value)}
                            className="w-full border rounded-md px-3 py-2 text-sm"
                            rows={3}
                        />
                        <p className="text-xs text-gray-600">{data.observacion.length}/300</p>
                        <InputError id="observacion-error" message={errors.observacion} />
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
                            className="bg-black hover:bg-gray-900 text-white"
                        >
                            {processing ? 'Actualizando...' : 'Actualizar Solicitud'}
                        </Button>
                    </div>

                </form>
            </div>
        </AppLayout>
    )
}
