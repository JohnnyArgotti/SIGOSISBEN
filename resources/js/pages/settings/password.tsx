import { useState, useRef } from 'react';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/user-password';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Configuración de contraseña',
        href: edit(),
    },
];

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, put, processing, errors, reset, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const hasValues =
        data.current_password.trim() !== '' &&
        data.password.trim() !== '' &&
        data.password_confirmation.trim() !== '';

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasValues) return;
        setShowConfirm(true);
    };

    const confirmar = () => {
        setShowConfirm(false);
        put('/settings/password', {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errs) => {
                if (errs.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }
                if (errs.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Configuración de contraseña" />

            <h1 className="sr-only">Configuración de contraseña</h1>

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
                                <p className="text-sm font-medium text-green-800">¡Contraseña actualizada correctamente!</p>
                            </div>
                        </div>
                    </Transition>

                    <Heading
                        variant="small"
                        title="Actualizar contraseña"
                        description="Usa una contraseña segura de entre 8 y 12 caracteres, combinando mayúsculas, minúsculas y números"
                    />

                    <form onSubmit={submit} className="space-y-6">

                        <div className="grid gap-2">
                            <Label htmlFor="current_password">Contraseña actual</Label>
                            <PasswordInput
                                aria-invalid={!!errors.current_password}
                                aria-describedby={errors.current_password ? 'current_password-error' : undefined}
                                id="current_password"
                                ref={currentPasswordInput}
                                name="current_password"
                                className="mt-1 block w-full"
                                autoComplete="current-password"
                                placeholder="Contraseña actual"
                                value={data.current_password}
                                onChange={(e) => setData('current_password', e.target.value)}
                            />
                            <InputError id="current_password-error" message={errors.current_password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Nueva contraseña</Label>
                            <PasswordInput
                                aria-invalid={!!errors.password}
                                aria-describedby={errors.password ? 'password-error' : undefined}
                                id="password"
                                ref={passwordInput}
                                name="password"
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                placeholder="Nueva contraseña"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                            />
                            <InputError id="password-error" message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">Confirmar contraseña</Label>
                            <PasswordInput
                                aria-invalid={!!errors.password_confirmation}
                                aria-describedby={errors.password_confirmation ? 'password_confirmation-error' : undefined}
                                id="password_confirmation"
                                name="password_confirmation"
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                placeholder="Confirmar contraseña"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                            />
                            <InputError id="password_confirmation-error" message={errors.password_confirmation} />
                        </div>

                        <div className="flex items-center gap-4">
                            <a
                                href="/home"
                                className="bg-[#E85068] hover:brightness-110 text-gray-900 px-4 py-2 rounded-md text-sm transition duration-200"
                            >
                                Cancelar
                            </a>

                            <button
                                type="submit"
                                disabled={!hasValues || processing}
                                className="bg-black hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                            >
                                {processing ? 'Guardando...' : 'Guardar contraseña'}
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
                            Confirmar cambio de contraseña
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                            ¿Estás seguro de que deseas actualizar tu contraseña?
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

