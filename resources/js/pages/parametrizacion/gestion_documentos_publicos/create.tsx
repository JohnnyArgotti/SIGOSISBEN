import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Documentos Públicos',
        href: '/gestion_documentos_publicos',
    },
    {
        title: 'Registrar Documento',
        href: '/gestion_documentos_publicos/create',
    },
];

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        nombre: '',
        enlace: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/gestion_documentos_publicos');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Documentos Públicos - Registrar Documento Público" />

            <div className="flex flex-col gap-6 p-4 bg-[#F3F4F6]">

                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-3 flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
                        Registrar Documento Público
                    </h1>
                </div>

                <form
                    onSubmit={submit}
                    className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 flex flex-col gap-6"
                >
                    {/* Nombre */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="nombre">Nombre</Label>
                        <Input
                            aria-invalid={!!errors.nombre}
                            aria-describedby={errors.nombre ? 'nombre-error' : undefined}
                            id="nombre"
                            type="text"
                            value={data.nombre}
                            onChange={(e) => setData('nombre', e.target.value)}
                            placeholder="Ej: Manual de Usuario"
                            maxLength={150}
                            className="max-w-lg"
                        />
                        <InputError id="nombre-error" message={errors.nombre} />
                    </div>

                    {/* Enlace */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="enlace">Enlace</Label>
                        <Input
                            aria-invalid={!!errors.enlace}
                            aria-describedby={errors.enlace ? 'enlace-error' : undefined}
                            id="enlace"
                            type="url"
                            value={data.enlace}
                            onChange={(e) => setData('enlace', e.target.value)}
                            placeholder="https://..."
                            maxLength={2048}
                            className="max-w-lg"
                        />
                        <InputError id="enlace-error" message={errors.enlace} />
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-3 pt-2">
                        <a
                            href="/gestion_documentos_publicos"
                            className="bg-[#E85068] hover:brightness-110 text-gray-900 px-4 py-2 rounded-md text-sm"
                        >
                            Cancelar
                        </a>
                        <Button type="submit" disabled={processing}>
                            Guardar
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
