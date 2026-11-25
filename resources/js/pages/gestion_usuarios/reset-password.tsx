import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { REQUISITOS_CONTRASENA } from '@/lib/requisitos-contrasena';

type Usuario = {
    id: number;
    nombres: string;
    apellidos: string;
    nombre_usuario: string;
};

type Props = {
    usuario: Usuario;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Gestión de Usuarios', href: '/gestion_usuarios' },
    { title: 'Restablecer Contraseña', href: '#' },
];

export default function ResetPassword({ usuario }: Props) {
    const { data, setData, patch, processing, errors } = useForm({
        contrasena: '',
        contrasena_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        patch(`/gestion_usuarios/${usuario.id}/reset-password`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Restablecer Contraseña" />

            <div className="flex flex-col gap-6 p-4 bg-gray-100">

                <div className="bg-white rounded-lg shadow p-2 flex justify-between items-center">
                    <h1 className="text-lg font-semibold flex items-center gap-2">
                        Restablecer Contraseña
                    </h1>
                </div>

                {/* Aviso de usuario afectado */}
                <div className="rounded-md border border-orange-200 bg-orange-50 p-4 flex items-start gap-3">
                    <div>
                        <p className="text-sm font-semibold text-orange-800">
                            Estás restableciendo la contraseña de:
                        </p>
                        <p className="text-sm text-orange-700 mt-0.5">
                            {usuario.nombres} {usuario.apellidos}{' '}
                            <span className="font-medium">(@{usuario.nombre_usuario})</span>
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                            Esta acción es inmediata. El usuario deberá usar la nueva contraseña en su próximo inicio de sesión.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 space-y-5">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="contrasena">Nueva contraseña *</Label>
                            <PasswordInput
                                aria-invalid={!!errors.contrasena}
                                aria-describedby={errors.contrasena ? 'contrasena-ayuda contrasena-error' : 'contrasena-ayuda'}
                                id="contrasena"
                                value={data.contrasena}
                                onChange={(e) => setData('contrasena', e.target.value)}
                                placeholder="Entre 8 y 12 caracteres"
                                autoComplete="new-password"
                            />
                            <p id="contrasena-ayuda" className="text-xs text-gray-600 dark:text-gray-400">
                                {REQUISITOS_CONTRASENA}
                            </p>
                            <InputError id="contrasena-error" message={errors.contrasena} />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="contrasena_confirmation">Confirmar nueva contraseña *</Label>
                            <PasswordInput
                                aria-invalid={!!errors.contrasena_confirmation}
                                aria-describedby={errors.contrasena_confirmation ? 'contrasena_confirmation-error' : undefined}
                                id="contrasena_confirmation"
                                value={data.contrasena_confirmation}
                                onChange={(e) => setData('contrasena_confirmation', e.target.value)}
                                placeholder="Repite la contraseña"
                                autoComplete="new-password"
                            />
                            <InputError id="contrasena_confirmation-error" message={errors.contrasena_confirmation} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <a
                            href="/gestion_usuarios"
                            className="bg-[#E85068] hover:brightness-110 text-gray-900 px-4 py-2 rounded-md text-sm transition duration-200"
                        >
                            Cancelar
                        </a>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="bg-black hover:bg-gray-900 text-white"
                        >
                            {processing ? 'Guardando...' : 'Restablecer contraseña'}
                        </Button>
                    </div>

                </form>
            </div>
        </AppLayout>
    );
}
