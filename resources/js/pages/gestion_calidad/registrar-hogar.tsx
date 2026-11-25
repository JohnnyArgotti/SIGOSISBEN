import { Head, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useRef } from 'react';
import { Paperclip, Lock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import InputError from '@/components/input-error';
import { FlashMessage } from '@/components/flash-message';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de calidad',
        href: '/gestion_calidad',
    },
    {
        title: 'Registrar Hogar',
        href: '#',
    },
];

const soloEnteros = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const valor = e.target.value.replace(/\D/g, '');
    setter(valor);
};

export default function RegistrarHogar() {
    const {
        solicitud,
        categorias_sisben = {},
        estados_dnp = {},
        usuario_actual = '',
        fecha_resolucion = '',
        lock_minutos = 15,
        flash,
    } = usePage().props as any;

    const archivoRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm<{
        cantidad_hogares: string;
        categoria_sisben: string;
        estado: string;
        observacion_dnp: string;
        soporte_pdf: File | null;
    }>({
        cantidad_hogares: '',
        categoria_sisben: '',
        // Desenlace habitual del registro; se puede cambiar por el que reporte el DNP.
        estado: 'aprobada',
        observacion_dnp: '',
        soporte_pdf: null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/gestion_calidad/${solicitud.id}/registrar-hogar`, {
            forceFormData: true,
        });
    };

    // Libera la reserva del formulario antes de salir, para que el resto de
    // usuarios no tenga que esperar a que expire sola.
    const cancelar = () => {
        router.delete(`/gestion_calidad/${solicitud.id}/registrar-hogar/liberar`);
    };

    const nombreArchivo = data.soporte_pdf?.name ?? null;
    const tamanoArchivo = data.soporte_pdf
        ? (data.soporte_pdf.size / 1024 / 1024).toFixed(2) + ' MB'
        : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Registrar Hogar – Gestión de calidad" />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Registrar hogar</h1>

            <div className="flex flex-col gap-4 p-2 sm:p-4 bg-[#F3F4F6] dark:bg-gray-950 text-gray-900 dark:text-gray-200">

                <FlashMessage success={flash?.success} error={flash?.error} />

                {/* Datos de la solicitud */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b dark:border-gray-700">
                        <h2 className="font-semibold text-gray-700 dark:text-gray-200">
                            Datos de la Solicitud
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">ID SisbenApp</p>
                            <p className="font-medium">{solicitud?.id_SisbenApp || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">N° Radicado</p>
                            <p className="font-medium">{solicitud?.num_radicado ?? '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">N° Documento</p>
                            <p className="font-medium">{solicitud?.ciudadano?.num_documento ?? '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Solicitante</p>
                            <p className="font-medium">{solicitud?.ciudadano?.nombre_completo ?? '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Estado de Gestión</p>
                            <p className="font-medium capitalize">{solicitud?.estado_gestion ?? '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Barrio</p>
                            <p className="font-medium">{solicitud?.barrio?.nombre ?? '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Comuna</p>
                            <p className="font-medium">{solicitud?.comuna?.nombre ?? '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Formulario */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b dark:border-gray-700">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">
                            Información del Hogar
                        </h3>
                    </div>

                    <div className="flex items-start gap-2 mb-4 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                        <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                            Esta solicitud queda reservada para usted durante {lock_minutos} minutos: mientras tanto,
                            ningún otro usuario podrá registrar el hogar. Si no termina en ese plazo, la reserva se
                            libera automáticamente.
                        </span>
                    </div>

                    <form onSubmit={handleSubmit} encType="multipart/form-data">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="cantidad_hogares">
                                    Cantidad de Hogares{' '}
                                    <span className="text-xs font-normal text-gray-600">(opcional)</span>
                                </Label>
                                <Input
                                    aria-invalid={!!errors.cantidad_hogares}
                                    aria-describedby={errors.cantidad_hogares ? 'cantidad_hogares-error' : undefined}
                                    id="cantidad_hogares"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={5}
                                    placeholder="Ej: 5"
                                    value={data.cantidad_hogares}
                                    onChange={(e) =>
                                        soloEnteros(e, (val) => setData('cantidad_hogares', val))
                                    }
                                    disabled={processing}
                                    className={errors.cantidad_hogares ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                />
                                <InputError id="cantidad_hogares-error" message={errors.cantidad_hogares} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="categoria_sisben">
                                    Categoría SISBÉN IV <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    aria-invalid={!!errors.categoria_sisben}
                                    aria-describedby={errors.categoria_sisben ? 'categoria_sisben-error' : undefined}
                                    id="categoria_sisben"
                                    value={data.categoria_sisben}
                                    onChange={(e) => setData('categoria_sisben', e.target.value)}
                                    disabled={processing}
                                    className={
                                        'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-colors ' +
                                        'focus:outline-none focus:ring-1 ' +
                                        'dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 ' +
                                        (errors.categoria_sisben
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-input focus:ring-ring')
                                    }
                                >
                                    <option value="">-- Seleccione una categoría --</option>
                                    {Object.entries(categorias_sisben as Record<string, string>).map(
                                        ([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </select>
                                <InputError id="categoria_sisben-error" message={errors.categoria_sisben} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="estado">
                                    Estado <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    aria-invalid={!!errors.estado}
                                    aria-describedby={errors.estado ? 'estado-error' : undefined}
                                    id="estado"
                                    value={data.estado}
                                    onChange={(e) => setData('estado', e.target.value)}
                                    disabled={processing}
                                    className={
                                        'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-colors ' +
                                        'focus:outline-none focus:ring-1 ' +
                                        'dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 ' +
                                        (errors.estado
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-input focus:ring-ring')
                                    }
                                >
                                    <option value="">-- Seleccione un estado --</option>
                                    {Object.entries(estados_dnp as Record<string, string>).map(
                                        ([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </select>
                                <p className="text-xs text-gray-600">Estado reportado por el DNP.</p>
                                <InputError id="estado-error" message={errors.estado} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label>
                                    Fecha de Resolución Final{' '}
                                    <span className="text-xs font-normal text-gray-600">(automática)</span>
                                </Label>
                                <Input
                                    value={fecha_resolucion}
                                    readOnly
                                    disabled
                                    className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                                />
                                <p className="text-xs text-gray-600">Se asignará al momento de guardar.</p>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label>
                                    Registrado por{' '}
                                    <span className="text-xs font-normal text-gray-600">(automático)</span>
                                </Label>
                                <Input
                                    value={usuario_actual}
                                    readOnly
                                    disabled
                                    className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                                />
                            </div>
                        </div>

                        {/* Observación del DNP */}
                        <div className="mt-5 flex flex-col gap-1.5">
                            <Label htmlFor="observacion_dnp">
                                Observación DNP{' '}
                                <span className="text-xs font-normal text-gray-600">(opcional)</span>
                            </Label>
                            <textarea
                                aria-invalid={!!errors.observacion_dnp}
                                aria-describedby={errors.observacion_dnp ? 'observacion_dnp-error' : undefined}
                                id="observacion_dnp"
                                placeholder="ESCRIBA AQUÍ LA OBSERVACIÓN DEL DNP..."
                                maxLength={300}
                                rows={3}
                                value={data.observacion_dnp}
                                onChange={(e) => setData('observacion_dnp', e.target.value.toUpperCase())}
                                disabled={processing}
                                className={
                                    'w-full rounded-md border px-3 py-2 text-sm bg-transparent transition-colors ' +
                                    'focus:outline-none focus:ring-1 ' +
                                    'dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 ' +
                                    (errors.observacion_dnp
                                        ? 'border-red-500 focus:ring-red-500'
                                        : 'border-input focus:ring-ring')
                                }
                            />
                            <p className="text-xs text-gray-600">
                                {data.observacion_dnp.length}/300 · El texto se guarda en mayúsculas.
                            </p>
                            <InputError id="observacion_dnp-error" message={errors.observacion_dnp} />
                        </div>

                        {/* Carga de soporte PDF */}
                        <div className="mt-6 flex flex-col gap-1.5">
                            <Label htmlFor="soporte_pdf_btn">
                                Archivo Soporte PDF <span className="text-red-500">*</span>
                            </Label>

                            <input
                                ref={archivoRef}
                                id="soporte_pdf"
                                name="soporte_pdf"
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    setData('soporte_pdf', file);
                                }}
                                disabled={processing}
                            />

                            <div
                                className={
                                    'flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border rounded-md ' +
                                    'bg-gray-50 dark:bg-gray-800 ' +
                                    (errors.soporte_pdf
                                        ? 'border-red-500'
                                        : 'border-gray-200 dark:border-gray-700')
                                }
                            >
                                <Button
                                    id="soporte_pdf_btn"
                                    aria-invalid={!!errors.soporte_pdf}
                                    aria-describedby={errors.soporte_pdf ? 'soporte_pdf-error' : undefined}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={processing}
                                    onClick={() => archivoRef.current?.click()}
                                    className="gap-2 shrink-0"
                                >
                                    <Paperclip className="w-4 h-4" />
                                    {nombreArchivo ? 'Cambiar archivo soporte' : 'Cargar archivo soporte'}
                                </Button>

                                {nombreArchivo ? (
                                    <div className="flex flex-col text-sm">
                                        <span className="text-green-700 dark:text-green-400 font-medium break-all">
                                            {nombreArchivo}
                                        </span>
                                        <span className="text-xs text-gray-500">{tamanoArchivo}</span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-600 dark:text-gray-500">
                                        Solo PDF · Máximo 1 MB
                                    </span>
                                )}
                            </div>

                            <InputError id="soporte_pdf-error" message={errors.soporte_pdf} />
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3 mt-6 justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={processing}
                                onClick={cancelar}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="gap-2 bg-black hover:bg-gray-900 text-white"
                            >
                                {processing ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Guardando...
                                    </>
                                ) : (
                                    'Registrar Hogar'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
