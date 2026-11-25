export type User = {
    id: number;
    tipo_documento_id: number;
    nombres: string;
    apellidos: string;
    nombre_usuario: string;
    num_documento: string;
    telefono?: string;
    correo?: string;
    estado: boolean;
    /** true cuando la identidad proviene de Active Directory (datos de solo lectura). */
    autenticacion_ad: boolean;
    avatar?: string;
    email_verified_at: string | null;
    creado_el: string;
    actualizado_el: string;
    roles: { id: number; name: string }[];
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};
