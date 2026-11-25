import { useState } from 'react';
import { Transition } from '@headlessui/react';
import { Head, useForm, usePage } from '@inertiajs/react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Configuración de perfil',
        href: edit(),
    },
];

const CampoLectura = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="grid gap-2">
        <Label>{label}</Label>
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {value || '-'}
        </div>
    </div>
);

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage().props as any;
    const user = auth.user;

    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        correo:   user.correo   as string,
        telefono: (user.telefono ?? '') as string,
    });

    const [showConfirm, setShowConfirm] = useState(false);

    const hasChanges =
        data.correo   !== user.correo ||
        data.telefono !== (user.telefono ?? '');

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasChanges) return;
        setShowConfirm(true);
    };

    const confirmar = () => {
        setShowConfirm(false);
        patch('/settings/profile', { preserveScroll: true });
    };

    // Los usuarios institucionales ven su información en solo lectura: nombres,
    // apellidos y correo se sincronizan desde Active Directory en cada inicio
    // de sesión, así que cualquier cambio hecho aquí se perdería.
    if (user.autenticacion_ad) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Configuración de perfil" />

                <h1 className="sr-only">Configuración de perfil</h1>

                <SettingsLayout>
                    <div className="space-y-6">
                        <Heading
                            variant="small"
                            title="Información del perfil"
                            description="Datos de tu cuenta institucional"
                        />

                        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                            Tu información personal y tu contraseña provienen del Directorio Activo
                            de la institución y no pueden modificarse desde el SIGO. Si necesitas
                            corregir alguno de estos datos, comunícate con el área de Tecnología.
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <CampoLectura label="Nombres" value={user.nombres} />
                            <CampoLectura label="Apellidos" value={user.apellidos} />
                            <CampoLectura label="Usuario institucional" value={user.nombre_usuario} />
                            <CampoLectura label="Correo electrónico" value={user.correo} />
                        </div>

                        <div>
                            <a
                                href="/home"
                                className="inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-gray-900"
                            >
                                Volver al inicio
                            </a>
                        </div>
                    </div>
                </SettingsLayout>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Configuración de perfil" />

            <h1 className="sr-only">Configuración de perfil</h1>

            <SettingsLayout>
                <div className="space-y-6">

                    {/* Mensaje de éxito */}
                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-out duration-300"
                        enterFrom="opacity-0 -translate-y-2"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-300"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 -translate-y-2"
                    >
                        <div className="rounded-md border border-green-200 bg-green-50 p-4">
                            <div className="flex items-center gap-3">
                                <svg className="h-5 w-5 text-green-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm font-medium text-green-800">Información actualizada correctamente.</p>
                            </div>
                        </div>
                    </Transition>

                    <Heading
                        variant="small"
                        title="Información del perfil"
                        description="Actualiza tu correo y tu teléfono"
                    />

                    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div className="grid gap-2 md:col-span-2">
                            <Label htmlFor="correo">Correo</Label>
                            <Input
                                id="correo"
                                aria-invalid={!!errors.correo}
                                aria-describedby={errors.correo ? 'correo-error' : undefined}
                                type="email"
                                className="mt-1 block w-full"
                                value={data.correo}
                                name="correo"
                                required
                                autoComplete="email"
                                placeholder="tu@email.com"
                                onChange={(e) => setData('correo', e.target.value.toLowerCase())}
                            />
                            <InputError id="correo-error" className="mt-2" message={errors.correo} />
                        </div>

                        <div className="grid gap-2 md:col-span-2">
                            <Label htmlFor="telefono">Teléfono</Label>
                            <Input
                                id="telefono"
                                aria-invalid={!!errors.telefono}
                                aria-describedby={errors.telefono ? 'telefono-error' : undefined}
                                className="mt-1 block w-full"
                                value={data.telefono}
                                name="telefono"
                                inputMode="numeric"
                                maxLength={20}
                                autoComplete="tel"
                                placeholder="Ej: 3001234567"
                                onChange={(e) => setData('telefono', e.target.value.replace(/\D/g, ''))}
                            />
                            <InputError id="telefono-error" className="mt-2" message={errors.telefono} />
                        </div>

                        <div className="flex items-center gap-4 md:col-span-2">
                            <a
                                href="/home"
                                className="bg-[#E85068] hover:brightness-110 text-gray-900 px-4 py-2 rounded-md text-sm transition duration-200"
                            >
                                Cancelar
                            </a>

                            <button
                                type="submit"
                                disabled={!hasChanges || processing}
                                className="bg-black hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                            >
                                {processing ? 'Guardando...' : 'Guardar información'}
                            </button>
                        </div>

                    </form>
                </div>
            </SettingsLayout>

            {/* Modal de confirmación */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
                            Confirmar cambios
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                            ¿Estás seguro de que deseas actualizar tu información de perfil?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowConfirm(false)}
                                className="bg-[#E85068] hover:brightness-110 text-gray-900 px-4 py-2 rounded-md text-sm transition duration-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmar}
                                className="bg-green-500 hover:bg-green-600 text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </AppLayout>
    );
}

