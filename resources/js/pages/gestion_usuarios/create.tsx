import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { REQUISITOS_CONTRASENA } from '@/lib/requisitos-contrasena';
import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { 
        title: 'Gestión de Usuarios', 
        href: '/gestion_usuarios' 
    },
    { 
        title: 'Registrar Usuario', 
        href: '/gestion_usuarios/create' 
    },
];

type TipoDocumento = { id: number; nombre: string; codigo: string };
type Rol = { id: number; name: string };

type Props = {
    tiposDocumento: TipoDocumento[];
    roles: Rol[];
};

export default function Create({ tiposDocumento, roles }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        tipo_documento_id: '',
        num_documento: '',
        nombres: '',
        apellidos: '',
        nombre_usuario: '',
        correo: '',
        telefono: '',
        contrasena: '',
        contrasena_confirmation: '',
        estado: true as boolean,
        roles: [] as string[],
    });

    const [showAdminModal, setShowAdminModal] = useState(false);

    const toggleRol = (name: string) => {
        // Si se está seleccionando el rol Administrador, mostrar confirmación
        if (name === 'Administrador' && !data.roles.includes(name)) {
            setShowAdminModal(true);
            return;
        }
        setData('roles',
            data.roles.includes(name)
                ? data.roles.filter((r) => r !== name)
                : [...data.roles, name]
        );
    };

    const confirmarRolAdmin = () => {
        setData('roles', [...data.roles, 'Administrador']);
        setShowAdminModal(false);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/gestion_usuarios');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Registrar Usuario" />

            <div className="flex flex-col gap-6 p-4 bg-gray-100">

                <div className="bg-white rounded-lg shadow p-2 flex justify-between items-center">
                    <h1 className="text-lg font-semibold text-lg">
                        Registrar Nuevo Usuario
                    </h1>
                </div>

                <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 space-y-3">

                    {/* Tipo de documento + Número */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="tipo_documento_id">Tipo de Documento *</Label>
                            <select
                                aria-invalid={!!errors.tipo_documento_id}
                                aria-describedby={errors.tipo_documento_id ? 'tipo_documento_id-error' : undefined}
                                id="tipo_documento_id"
                                value={data.tipo_documento_id}
                                onChange={(e) => setData('tipo_documento_id', e.target.value)}
                                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
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
                            <Label htmlFor="num_documento">Número de Documento *</Label>
                            <Input
                                aria-invalid={!!errors.num_documento}
                                aria-describedby={errors.num_documento ? 'num_documento-error' : undefined}
                                id="num_documento"
                                value={data.num_documento}
                                inputMode="numeric"
                                maxLength={20}
                                onChange={(e) => setData('num_documento', e.target.value.replace(/\D/g, ''))}
                                placeholder="Ej: 1234567890"
                            />
                            <InputError id="num_documento-error" message={errors.num_documento} />
                        </div>
                    </div>

                    {/* Nombres + Apellidos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="nombres">Nombres *</Label>
                            <Input
                                aria-invalid={!!errors.nombres}
                                aria-describedby={errors.nombres ? 'nombres-error' : undefined}
                                id="nombres"
                                value={data.nombres}
                                maxLength={100}
                                onChange={(e) => setData('nombres', e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').toUpperCase())}
                                placeholder="Ej: Juan Carlos"
                            />
                            <InputError id="nombres-error" message={errors.nombres} />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="apellidos">Apellidos *</Label>
                            <Input
                                aria-invalid={!!errors.apellidos}
                                aria-describedby={errors.apellidos ? 'apellidos-error' : undefined}
                                id="apellidos"
                                value={data.apellidos}
                                maxLength={100}
                                onChange={(e) => setData('apellidos', e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').toUpperCase())}
                                placeholder="Ej: Pérez García"
                            />
                            <InputError id="apellidos-error" message={errors.apellidos} />
                        </div>
                    </div>

                    {/* Correo + Teléfono */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="correo">Correo Electrónico *</Label>
                            <Input
                                aria-invalid={!!errors.correo}
                                aria-describedby={errors.correo ? 'correo-error' : undefined}
                                id="correo"
                                type="email"
                                value={data.correo}
                                onChange={(e) => setData('correo', e.target.value.toLowerCase())}
                                placeholder="Ej: jperez@correo.com"
                            />
                            <InputError id="correo-error" message={errors.correo} />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="telefono">Teléfono</Label>
                            <Input
                                aria-invalid={!!errors.telefono}
                                aria-describedby={errors.telefono ? 'telefono-error' : undefined}
                                id="telefono"
                                value={data.telefono}
                                inputMode="numeric"
                                maxLength={20}
                                onChange={(e) => setData('telefono', e.target.value.replace(/\D/g, ''))}
                                placeholder="Ej: 3001234567"
                            />
                            <InputError id="telefono-error" message={errors.telefono} />
                        </div>
                    </div>

                    {/* Nombre de usuario */}
                    <div className="space-y-1">
                        <Label htmlFor="nombre_usuario">Nombre de Usuario *</Label>
                        <Input
                            aria-invalid={!!errors.nombre_usuario}
                            aria-describedby={errors.nombre_usuario ? 'nombre_usuario-error' : undefined}
                            id="nombre_usuario"
                            value={data.nombre_usuario}
                            maxLength={60}
                            onChange={(e) => setData('nombre_usuario', e.target.value.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase())}
                            placeholder="Ej: jperez"
                        />
                        <InputError id="nombre_usuario-error" message={errors.nombre_usuario} />
                    </div>

                    {/* Contraseña */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="contrasena">Contraseña *</Label>
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
                            <Label htmlFor="contrasena_confirmation">Confirmar Contraseña *</Label>
                            <PasswordInput
                                id="contrasena_confirmation"
                                value={data.contrasena_confirmation}
                                onChange={(e) => setData('contrasena_confirmation', e.target.value)}
                                placeholder="Repite la contraseña"
                            />
                        </div>
                    </div>

                    {/* Roles */}
                    <div className="space-y-2">
                        <Label id="roles-label">Roles del Usuario</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="group" aria-labelledby="roles-label" aria-describedby={errors.roles ? 'roles-error' : undefined}>
                            {roles.map((rol) => (
                                <label
                                    key={rol.id}
                                    className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors ${data.roles.includes(rol.name)
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={data.roles.includes(rol.name)}
                                        onChange={() => toggleRol(rol.name)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                    />
                                    {rol.name}
                                </label>
                            ))}
                        </div>
                        <InputError id="roles-error" message={errors.roles} />
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-3 pt-2">
                        <a
                            href="/gestion_usuarios"
                            className="bg-[#E85068] hover:brightness-110 text-gray-900 px-4 py-2 rounded-md text-sm transition duration-200"
                        >
                            Cancelar
                        </a>
                        <Button type="submit" disabled={processing} className="bg-black hover:bg-gray-900 text-white">
                            {processing ? 'Guardando...' : 'Guardar Usuario'}
                        </Button>
                    </div>

                </form>
            </div>

            {/* Modal de confirmación para rol Administrador */}
            {showAdminModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm">

                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
                                <ShieldAlert className="w-7 h-7 text-amber-600" />
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                    ¿Asignar rol Administrador?
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                                    Este rol otorga acceso total al sistema. Asegúrese de que el usuario
                                    está debidamente autorizado para ejercer funciones administrativas.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowAdminModal(false)}
                                className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarRolAdmin}
                                className="px-4 py-2 text-sm rounded-md bg-amber-600 hover:bg-amber-700 text-gray-900 font-medium"
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
