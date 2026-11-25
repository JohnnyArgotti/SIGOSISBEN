import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de eventos',
        href: '/gestion_eventos',
    },
    {
        title: 'Registrar evento',
        href: '/gestion_eventos/create',
    },
];

type Usuario = {
    id: number;
    nombres: string;
    apellidos: string;
};

type Comuna = {
    id: number;
    nombre: string;
};

type Barrio = {
    id: number;
    nombre: string;
    comuna_id: number;
};

type Props = {
    usuarios: Usuario[];
    comunas: Comuna[];
    barrios: Barrio[];
};

const selectClass =
    'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4171B1] dark:bg-gray-800 dark:text-white';

export default function Create({ usuarios, comunas, barrios }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        nombre: '',
        responsable_id: '',
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
        entidad_organizadora: '',
        direccion: '',
        comuna_id: '',
        barrio_id: '',
    });

    const [barriosFiltrados, setBarriosFiltrados] = useState<Barrio[]>([]);

    // Se usa toLocaleDateString('en-CA') para obtener YYYY-MM-DD en la zona
    // horaria del navegador (Colombia, UTC-5). toISOString() devuelve UTC y
    // en horas nocturnas muestra la fecha del día siguiente.
    const today = new Date().toLocaleDateString('en-CA');

    const handleComuna = (comunaId: string) => {
        setData((d) => ({ ...d, comuna_id: comunaId, barrio_id: '' }));
        setBarriosFiltrados(comunaId ? barrios.filter((b) => b.comuna_id === Number(comunaId)) : []);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!data.nombre.trim()) {
            alert('El nombre del evento es obligatorio.');
            return;
        }
        if (!data.fecha) {
            alert('La fecha del evento es obligatoria.');
            return;
        }
        if (data.fecha < today) {
            alert('No se puede registrar un evento con una fecha anterior al día de hoy.');
            return;
        }
        if (!data.hora_inicio) {
            alert('La hora de inicio es obligatoria.');
            return;
        }
        if (!data.hora_fin) {
            alert('La hora de fin es obligatoria.');
            return;
        }
        if (data.hora_inicio >= data.hora_fin) {
            alert('La hora de inicio debe ser menor a la hora de fin.');
            return;
        }

        post('/gestion_eventos');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Registrar Evento" />

            <div className="flex flex-col gap-6 p-4 bg-[#F3F4F6]">

                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-3 flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
                        Registrar Evento
                    </h1>
                </div>

                <form
                    onSubmit={submit}
                    className="bg-white dark:bg-gray-900 rounded-xl shadow p-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Nombre */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="nombre">Nombre del evento *</Label>
                            <Input
                                aria-invalid={!!errors.nombre}
                                aria-describedby={errors.nombre ? 'nombre-error' : undefined}
                                id="nombre"
                                type="text"
                                value={data.nombre}
                                onChange={(e) => setData('nombre', e.target.value)}
                                placeholder="Ej: Jornada de actualización norte"
                            />
                            <InputError id="nombre-error" message={errors.nombre} />
                        </div>

                        {/* Entidad organizadora */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="entidad_organizadora">Entidad organizadora *</Label>
                            <Input
                                aria-invalid={!!errors.entidad_organizadora}
                                aria-describedby={errors.entidad_organizadora ? 'entidad_organizadora-error' : undefined}
                                id="entidad_organizadora"
                                type="text"
                                value={data.entidad_organizadora}
                                onChange={(e) => setData('entidad_organizadora', e.target.value)}
                                placeholder="Ej: Alcaldía de Cali"
                            />
                            <InputError id="entidad_organizadora-error" message={errors.entidad_organizadora} />
                        </div>

                        {/* Responsable */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="responsable_id">Responsable *</Label>
                            <select
                                aria-invalid={!!errors.responsable_id}
                                aria-describedby={errors.responsable_id ? 'responsable_id-error' : undefined}
                                id="responsable_id"
                                value={data.responsable_id}
                                onChange={(e) => setData('responsable_id', e.target.value)}
                                className={selectClass}
                            >
                                <option value="">Seleccione un responsable</option>
                                {usuarios.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.nombres} {u.apellidos}
                                    </option>
                                ))}
                            </select>
                            <InputError id="responsable_id-error" message={errors.responsable_id} />
                        </div>

                        {/* Dirección */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="direccion">Dirección *</Label>
                            <Input
                                aria-invalid={!!errors.direccion}
                                aria-describedby={errors.direccion ? 'direccion-error' : undefined}
                                id="direccion"
                                type="text"
                                value={data.direccion}
                                onChange={(e) => setData('direccion', e.target.value)}
                                placeholder="Ej: Calle 5 # 10-20"
                            />
                            <InputError id="direccion-error" message={errors.direccion} />
                        </div>

                        {/* Fecha + Horas */}
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="fecha">Fecha de realización *</Label>
                                <Input
                                    aria-invalid={!!errors.fecha}
                                    aria-describedby={errors.fecha ? 'fecha-error' : undefined}
                                    id="fecha"
                                    type="date"
                                    value={data.fecha}
                                    min={today}
                                    onChange={(e) => setData('fecha', e.target.value)}
                                />
                                <InputError id="fecha-error" message={errors.fecha} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="hora_inicio">Hora de inicio *</Label>
                                <Input
                                    aria-invalid={!!errors.hora_inicio}
                                    aria-describedby={errors.hora_inicio ? 'hora_inicio-error' : undefined}
                                    id="hora_inicio"
                                    type="time"
                                    value={data.hora_inicio}
                                    onChange={(e) => setData('hora_inicio', e.target.value)}
                                />
                                <InputError id="hora_inicio-error" message={errors.hora_inicio} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="hora_fin">Hora de fin *</Label>
                                <Input
                                    aria-invalid={!!errors.hora_fin}
                                    aria-describedby={errors.hora_fin ? 'hora_fin-error' : undefined}
                                    id="hora_fin"
                                    type="time"
                                    value={data.hora_fin}
                                    onChange={(e) => setData('hora_fin', e.target.value)}
                                />
                                <InputError id="hora_fin-error" message={errors.hora_fin} />
                            </div>
                        </div>

                        {/* Comuna y Barrio */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="comuna_id">Comuna *</Label>
                            <select
                                aria-invalid={!!errors.comuna_id}
                                aria-describedby={errors.comuna_id ? 'comuna_id-error' : undefined}
                                id="comuna_id"
                                value={data.comuna_id}
                                onChange={(e) => handleComuna(e.target.value)}
                                className={selectClass}
                            >
                                <option value="">Seleccione una comuna</option>
                                {comunas.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nombre}
                                    </option>
                                ))}
                            </select>
                            <InputError id="comuna_id-error" message={errors.comuna_id} />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="barrio_id">Barrio *</Label>
                            <select
                                aria-invalid={!!errors.barrio_id}
                                aria-describedby={errors.barrio_id ? 'barrio_id-error' : undefined}
                                id="barrio_id"
                                value={data.barrio_id}
                                onChange={(e) => setData('barrio_id', e.target.value)}
                                disabled={barriosFiltrados.length === 0}
                                className={`${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <option value="">
                                    {data.comuna_id ? 'Seleccione un barrio' : 'Seleccione primero una comuna'}
                                </option>
                                {barriosFiltrados.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.nombre}
                                    </option>
                                ))}
                            </select>
                            <InputError id="barrio_id-error" message={errors.barrio_id} />
                        </div>
                    </div>
                    {/* Botones */}
                    <div className="flex justify-end gap-3 pt-2">
                        <a
                            href="/gestion_eventos"
                            className="bg-[#E85068] hover:brightness-110 text-gray-900 px-4 py-2 rounded-md text-sm transition duration-200"
                        >
                            Cancelar
                        </a>
                        <Button type="submit" disabled={processing}>
                            Guardar Evento
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

