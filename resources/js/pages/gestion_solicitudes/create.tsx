import { Head, useForm, usePage } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { useState, useEffect, useCallback, useRef } from 'react'
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

type TipoConsulta = {
    id: number
    nombre: string
}

type Canal = {
    id: number
    nombre: string
}

type Props = {
    tiposDocumento: TipoDocumento[],
    comunas: Comuna[],
    tiposTramite: TipoTramite[],
    tiposConsulta: TipoConsulta[],
    canales: Canal[],
    barrios: Barrio[],
    puntoAtencionId: number | null,
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Solicitudes',
        href: '/gestion_solicitudes',
    },
    {
        title: 'Registrar Solicitud',
        href: '/gestion_solicitudes/create',
    },
]

export default function CrearSolicitud({ tiposDocumento, tiposTramite, tiposConsulta, comunas, canales, barrios, puntoAtencionId }: Props) {

    const { auth } = usePage().props as any
    const can = (permission: string) => auth.user.permissions?.includes(permission)

    // Se arranca en el tipo que el usuario realmente puede registrar: si solo
    // tiene permiso para atenciones, abrir en "efectiva" le mostraría un
    // formulario que no puede enviar y sin pestaña para salir de él.
    const tipoInicial: 'efectiva' | 'no_efectiva' =
        can('Crear solicitudes') ? 'efectiva' : 'no_efectiva'

    const [tipoSolicitud, setTipoSolicitud] =
        useState<'efectiva' | 'no_efectiva'>(tipoInicial)

    const [barriosFiltrados, setBarriosFiltrados] = useState<Barrio[]>([])

    const [ciudadanoEncontrado, setCiudadanoEncontrado] = useState<boolean | null>(null)
    const [buscandoCiudadano, setBuscandoCiudadano] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const { data, setData, post, processing, errors } = useForm({
        nombre: '',
        documento: '',
        tipo_documento_id: '',
        telefono: '',
        comuna_id: '',
        barrio: '',
        barrio_id: '' as number | '',
        direccion: '',
        tipo_tramite_id: '',
        tipo_consulta_id: '',
        canal_id: '',
        observacion: '',
        id_sisben_app: '',
        radicado: '',
        tipo_solicitud: tipoInicial,
    })

    const buscarCiudadano = useCallback(async (documento: string, tipoDocId: string) => {
        if (documento.length < 4 || !tipoDocId) {
            setCiudadanoEncontrado(null)
            return
        }
        setBuscandoCiudadano(true)
        try {
            const res = await fetch(
                `/api/ciudadano/buscar?documento=${encodeURIComponent(documento)}&tipo_documento_id=${encodeURIComponent(tipoDocId)}`,
                { headers: { Accept: 'application/json' } }
            )
            if (!res.ok) {
                setCiudadanoEncontrado(false)
                return
            }
            const ciudadano = await res.json()
            if (ciudadano && typeof ciudadano === 'object' && ciudadano.id) {
                setData(d => ({
                    ...d,
                    nombre: ciudadano.nombre_completo,
                    tipo_documento_id: String(ciudadano.tipo_documento_id),
                    telefono: ciudadano.telefono ?? '',
                }))
                setCiudadanoEncontrado(true)
            } else {
                setCiudadanoEncontrado(false)
            }
        } catch {
            setCiudadanoEncontrado(false)
        } finally {
            setBuscandoCiudadano(false)
        }
    }, [setData])

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        post('/gestion_solicitudes')
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Solicitudes - Registrar Solicitud" />

            <div className="flex flex-col gap-6 p-4 bg-gray-100">

                {/* HEADER */}
                <div className="bg-white rounded-lg shadow p-1 flex justify-between items-center">

                    <h1 className="text-lg font-semibold">
                        Registrar Nueva Solicitud
                    </h1>

                    <div className="flex bg-gray-200 rounded-md overflow-hidden">

                        {/* EFECTIVA */}
                        {can('Crear solicitudes') && (
                            <button
                                type="button"
                                disabled={!can('Crear solicitudes')}
                                onClick={() => {
                                    setTipoSolicitud('efectiva')
                                    setData('tipo_solicitud', 'efectiva')
                                    setData('tipo_consulta_id', '')
                                }}
                                className={`px-5 py-2 text-sm font-medium transition ${tipoSolicitud === 'efectiva'
                                        ? 'bg-[#00AA61] text-gray-900'
                                        : 'bg-gray-300 text-gray-700'
                                    }
                                    ${!can('Crear solicitudes') ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                            >
                                Efectiva
                            </button>
                        )}

                        {/* NO EFECTIVA */}
                        {can('Crear atenciones') && (
                            <button
                                type="button"
                                disabled={!can('Crear atenciones')}
                                onClick={() => {
                                    setTipoSolicitud('no_efectiva')
                                    setData('tipo_solicitud', 'no_efectiva')
                                    setData('tipo_tramite_id', '')
                                }}
                                className={`px-5 py-2 text-sm font-medium transition ${tipoSolicitud === 'no_efectiva'
                                        ? 'bg-[#E85068] text-gray-900'
                                        : 'bg-gray-300 text-gray-700'
                                    }${!can('Crear atenciones') ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                            >
                                No efectiva
                            </button>
                        )}

                    </div>

                </div>

                {/* FORM */}
                <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 space-y-4">

                    {/* ID SISBEN */}
                    {tipoSolicitud === 'efectiva' && (
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
                                    onChange={e =>
                                        setData('id_sisben_app', e.target.value.replace(/\D/g, ''))
                                    }
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
                                    onChange={e =>
                                        setData('radicado', e.target.value.replace(/\D/g, ''))
                                    }
                                />
                                <InputError id="radicado-error" message={errors.radicado} />
                            </div>

                        </div>
                    )}

                    {/* DOCUMENTO */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        <div className="space-y-1">
                            <Label htmlFor="tipo_documento_id">Tipo de Documento *</Label>

                            <select
                                aria-invalid={!!errors.tipo_documento_id}
                                aria-describedby={errors.tipo_documento_id ? 'tipo_documento_id-error' : undefined}
                                id="tipo_documento_id"
                                value={data.tipo_documento_id}
                                onChange={(e) => {
                                    const tipoId = e.target.value
                                    setData(d => ({ ...d, tipo_documento_id: tipoId, nombre: '', telefono: '' }))
                                    setCiudadanoEncontrado(null)
                                    if (debounceRef.current) clearTimeout(debounceRef.current)
                                    if (data.documento.length >= 4 && tipoId) {
                                        debounceRef.current = setTimeout(() => buscarCiudadano(data.documento, tipoId), 500)
                                    }
                                }}
                                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar...</option>

                                {tiposDocumento.map((td) => (
                                    <option key={td.id} value={td.id}>
                                        {td.codigo} – {td.nombre}
                                    </option>
                                ))}

                            </select>

                            <InputError id="tipo_documento_id-error" message={errors.tipo_documento_id} />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="documento">Número de documento *</Label>
                            <div className="relative">
                                <Input
                                    id="documento"
                                    aria-invalid={!!errors.documento}
                                    aria-describedby={errors.documento ? 'documento-error' : undefined}
                                    placeholder="Ingrese número documento"
                                    maxLength={14}
                                    inputMode="numeric"
                                    value={data.documento}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '')
                                        setData(d => ({ ...d, documento: val, nombre: '', telefono: '' }))
                                        setCiudadanoEncontrado(null)
                                        if (debounceRef.current) clearTimeout(debounceRef.current)
                                        if (val.length >= 4 && data.tipo_documento_id) {
                                            debounceRef.current = setTimeout(() => buscarCiudadano(val, data.tipo_documento_id), 500)
                                        }
                                    }}
                                    className={ciudadanoEncontrado === true ? 'border-green-500 pr-9' : ciudadanoEncontrado === false ? 'border-orange-400 pr-9' : ''}
                                />
                                {buscandoCiudadano && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">...</span>
                                )}
                                {!buscandoCiudadano && ciudadanoEncontrado === true && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 text-base" title="Ciudadano encontrado">✓</span>
                                )}
                            </div>
                            {ciudadanoEncontrado === true && (
                                <p className="text-xs text-green-600 font-medium">Ciudadano existe en el sistema.</p>
                            )}
                            {ciudadanoEncontrado === false && data.documento.length >= 4 && (
                                <p className="text-xs text-orange-500">Ciudadano no existe aún en el sistema.</p>
                            )}
                            <InputError id="documento-error" message={errors.documento} />
                        </div>

                    </div>

                    {/* NOMBRE */}
                    <div className="space-y-1">
                        <Label htmlFor="nombre">Nombre completo *</Label>
                        <Input
                            id="nombre"
                            aria-invalid={!!errors.nombre}
                            aria-describedby={errors.nombre ? 'nombre-error' : undefined}
                            placeholder="Ingrese el nombre completo"
                            maxLength={120}
                            value={data.nombre}
                            onChange={e =>
                                setData(
                                    'nombre',
                                    e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').toUpperCase()
                                )
                            }
                        />
                        <InputError id="nombre-error" message={errors.nombre} />
                    </div>

                    {/* TELEFONO + COMUNA */}
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
                                onChange={e =>
                                    setData('telefono', e.target.value.replace(/\D/g, ''))
                                }
                            />
                            <InputError id="telefono-error" message={errors.telefono} />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="comuna_id">Comuna *</Label>

                            <select
                                aria-invalid={!!errors.comuna_id}
                                aria-describedby={errors.comuna_id ? 'comuna_id-error' : undefined}
                                id="comuna_id"
                                value={data.comuna_id}
                                onChange={(e) => {
                                    const comunaId = e.target.value
                                    setData(d => ({
                                        ...d,
                                        comuna_id: comunaId,
                                        barrio_id: '',
                                        barrio: '',
                                    }))
                                    setBarriosFiltrados(
                                        comunaId
                                            ? barrios.filter(b => b.comuna_id === Number(comunaId))
                                            : []
                                    )
                                }}
                                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar...</option>

                                {comunas.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nombre}
                                    </option>
                                ))}

                            </select>

                            <InputError id="comuna_id-error" message={errors.comuna_id} />
                        </div>

                    </div>

                    {/* BARRIO + DIRECCION */}
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

                        {tipoSolicitud === 'efectiva' && (
                            <div className="space-y-1">
                                <Label htmlFor="direccion">Dirección completa</Label>
                                <Input
                                    id="direccion"
                                    aria-invalid={!!errors.direccion}
                                    aria-describedby={errors.direccion ? 'direccion-error' : undefined}
                                    placeholder="Ingrese la dirección completa"
                                    maxLength={150}
                                    value={data.direccion}
                                    onChange={e =>
                                        setData('direccion', e.target.value.toUpperCase())
                                    }
                                />
                                <InputError id="direccion-error" message={errors.direccion} />
                            </div>
                        )}

                    </div>

                    {/* TRAMITE / CONSULTA + CANAL */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        {tipoSolicitud === 'efectiva' && (
                            <div className="space-y-1">

                                <Label htmlFor="tipo_tramite_id">Tipo de Tramite *</Label>

                                <select
                                    id="tipo_tramite_id"
                                    aria-invalid={!!errors.tipo_tramite_id}
                                    aria-describedby={errors.tipo_tramite_id ? 'tipo_tramite_id-error' : undefined}
                                    value={data.tipo_tramite_id}
                                    onChange={(e) => setData('tipo_tramite_id', e.target.value)}
                                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccionar...</option>

                                    {tiposTramite.map((tt) => (
                                        <option key={tt.id} value={tt.id}>
                                            {tt.codigo} – {tt.nombre}
                                        </option>
                                    ))}

                                </select>

                                <InputError id="tipo_tramite_id-error" message={errors.tipo_tramite_id} />
                            </div>
                        )}

                        {tipoSolicitud === 'no_efectiva' && (

                            <div className="space-y-1">
                                <Label htmlFor="tipo_consulta_id">Tipo de Consulta *</Label>

                                <select
                                    id="tipo_consulta_id"
                                    aria-invalid={!!errors.tipo_consulta_id}
                                    aria-describedby={errors.tipo_consulta_id ? 'tipo_consulta_id-error' : undefined}
                                    value={data.tipo_consulta_id}
                                    onChange={(e) => setData('tipo_consulta_id', e.target.value)}
                                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccionar...</option>

                                    {tiposConsulta.map((tc) => (
                                        <option key={tc.id} value={tc.id}>
                                            {tc.nombre}
                                        </option>
                                    ))}

                                </select>

                                <InputError id="tipo_consulta_id-error" message={errors.tipo_consulta_id} />
                            </div>

                        )}

                        
                        {tipoSolicitud === 'no_efectiva' && (

                            <div className="space-y-1">
                                <Label htmlFor="canal_id">Canal *</Label>

                                <select
                                    id="canal_id"
                                    aria-invalid={!!errors.canal_id}
                                    aria-describedby={errors.canal_id ? 'canal_id-error' : undefined}
                                    value={data.canal_id}
                                    onChange={(e) => setData('canal_id', e.target.value)}
                                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccionar...</option>

                                    {canales.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.nombre}
                                        </option>
                                    ))}

                                </select>

                                <InputError id="canal_id-error" message={errors.canal_id} />
                            </div>

                        )}
                        

                        {tipoSolicitud === 'efectiva' && (
                        <div className="space-y-1">

                            <Label htmlFor="canal_id">Canal *</Label>

                            <select
                                id="canal_id"
                                aria-invalid={!!errors.canal_id}
                                aria-describedby={errors.canal_id ? 'canal_id-error' : undefined}
                                value={data.canal_id}
                                onChange={(e) => setData('canal_id', e.target.value)}
                                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar...</option>

                                {canales.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nombre}
                                    </option>
                                ))}

                            </select>

                            <InputError id="canal_id-error" message={errors.canal_id} />

                        </div>
                        )}

                    </div>

                    {/* OBSERVACION */}
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

                        <p className="text-xs text-gray-600">
                            {data.observacion.length}/300
                        </p>

                        <InputError id="observacion-error" message={errors.observacion} />

                    </div>

                    {/* BOTONES */}
                    <div className="flex justify-end gap-3 pt-3">

                        <a
                            href="/gestion_solicitudes"
                            className="bg-[#E85068] hover:brightness-110 text-gray-900 px-4 py-2 rounded-md text-sm transition duration-200"
                        >
                            Cancelar
                        </a>

                        <Button
                            type="submit"
                            disabled={processing}
                            className="bg-black hover:bg-gray-900 text-white"
                        >
                            {processing ? 'Guardando...' : 'Guardar Solicitud'}
                        </Button>

                    </div>

                </form>

            </div>
        </AppLayout>
    )
}