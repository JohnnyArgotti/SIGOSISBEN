import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Puntos',
        href: '/gestion_puntos',
    },
    {
        title: 'Editar punto',
        href: '#',
    },
];

type PuntoAtencion = {
    id: number;
    nombre: string;
    estado: boolean;
};

type Props = {
    punto: PuntoAtencion;
};

export default function Edit({ punto }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        nombre: punto.nombre,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/gestion_puntos/${punto.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Punto de Atención" />

            <div className="flex flex-col gap-6 p-4 bg-[#F3F4F6]">

                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-3 flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
                        Editar Punto de Atención
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
                            className="max-w-lg"
                        />
                        <InputError id="nombre-error" message={errors.nombre} />
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-3 pt-2">
                        <a
                            href="/gestion_puntos"
                            className="bg-[#E85068] hover:brightness-110 text-gray-900 px-4 py-2 rounded-md text-sm"
                        >
                            Cancelar
                        </a>
                        <Button type="submit" disabled={processing}>
                            Actualizar
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
