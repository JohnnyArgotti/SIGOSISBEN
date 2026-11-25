import { Head, useForm, usePage } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import type { BreadcrumbItem } from '@/types'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import InputError from '@/components/input-error'

type TipoDocumento = {
    id: number
    nombre: string
    codigo: string
}

type Props = {
    tiposDocumento?: TipoDocumento[]
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Gestión Encuestadores', href: '/gestion_encuestadores' },
    { title: 'Registrar Encuestador', href: '/gestion_encuestadores/create' },
]

export default function Create({ tiposDocumento = [] }: Props) {

    const { auth } = usePage().props as any
    const can = (permission: string) => auth.user.permissions?.includes(permission)

    const { data, setData, post, processing, errors } = useForm({
        tipo_documento_id: '',
        nombres: '',
        apellidos: '',
        num_documento: '',
        telefono: '',
    })

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        post('/gestion_encuestadores')
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión Encuestadores - Registrar Encuestador" />

            <div className="flex flex-col gap-6 p-4 bg-gray-100">

                {/* HEADER */}
                <div className="bg-white rounded-lg shadow p-2">
                    <h1 className="text-lg font-semibold">
                        Registrar Encuestador
                    </h1>
                </div>

                {/* FORM */}
                <form onSubmit={submit} className="bg-white rounded-lg shadow p-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* TIPO DOCUMENTO */}
                        <div className="space-y-1">
                            <Label htmlFor="tipo_documento_id">Tipo de Documento *</Label>
                            <select
                                aria-invalid={!!errors.tipo_documento_id}
                                aria-describedby={errors.tipo_documento_id ? 'tipo_documento_id-error' : undefined}
                                id="tipo_documento_id"
                                value={data.tipo_documento_id}
                                onChange={(e) => setData('tipo_documento_id', e.target.value)}
                                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccione tipo de documento</option>

                                {tiposDocumento.length > 0 ? (
                                    tiposDocumento.map((td) => (
                                        <option key={td.id} value={td.id}>
                                            {td.codigo} – {td.nombre}
                                        </option>
                                    ))
                                ) : (
                                    <option disabled>Cargando...</option>
                                )}
                            </select>
                            <InputError id="tipo_documento_id-error" message={errors.tipo_documento_id} />
                        </div>

                        {/* DOCUMENTO */}
                        <div className="space-y-1">
                            <Label htmlFor="num_documento">Número de documento *</Label>
                            <Input
                                id="num_documento"
                                aria-invalid={!!errors.num_documento}
                                aria-describedby={errors.num_documento ? 'num_documento-error' : undefined}
                                placeholder="Ingrese número de documento"
                                maxLength={20}
                                value={data.num_documento}
                                onChange={e =>
                                    setData('num_documento', e.target.value.replace(/\D/g, ''))
                                }
                            />
                            <InputError id="num_documento-error" message={errors.num_documento} />
                        </div>

                        {/* NOMBRES */}
                        <div className="space-y-1">
                            <Label htmlFor="nombres">Nombres *</Label>
                            <Input
                                id="nombres"
                                aria-invalid={!!errors.nombres}
                                aria-describedby={errors.nombres ? 'nombres-error' : undefined}
                                placeholder="Ingrese los nombres"
                                value={data.nombres}
                                onChange={e => setData('nombres', e.target.value.toUpperCase())}
                            />
                            <InputError id="nombres-error" message={errors.nombres} />
                        </div>

                        {/* APELLIDOS */}
                        <div className="space-y-1">
                            <Label htmlFor="apellidos">Apellidos *</Label>
                            <Input
                                id="apellidos"
                                aria-invalid={!!errors.apellidos}
                                aria-describedby={errors.apellidos ? 'apellidos-error' : undefined}
                                placeholder="Ingrese los apellidos"
                                value={data.apellidos}
                                onChange={e => setData('apellidos', e.target.value.toUpperCase())}
                            />
                            <InputError id="apellidos-error" message={errors.apellidos} />
                        </div>

                        {/* TELEFONO */}
                        <div className="space-y-1">
                            <Label htmlFor="telefono">Teléfono</Label>
                            <Input
                                id="telefono"
                                aria-invalid={!!errors.telefono}
                                aria-describedby={errors.telefono ? 'telefono-error' : undefined}
                                placeholder="Ingrese el número de teléfono"
                                maxLength={10}
                                value={data.telefono}
                                onChange={e =>
                                    setData('telefono', e.target.value.replace(/\D/g, ''))
                                }
                            />
                            <InputError id="telefono-error" message={errors.telefono} />
                        </div>

                    </div>

                    {/* BOTONES */}
                    <div className="flex justify-end gap-3 pt-6">

                        <a
                            href="/gestion_encuestadores"
                            className="bg-[#E85068] hover:brightness-110 text-gray-900 px-4 py-2 rounded-md text-sm"
                        >
                            Cancelar
                        </a>

                        <Button
                            type="submit"
                            disabled={processing}
                            className="bg-black hover:bg-gray-900 text-white"
                        >
                            {processing ? 'Guardando...' : 'Guardar Encuestador'}
                        </Button>

                    </div>

                </form>

            </div>
        </AppLayout>
    )
}