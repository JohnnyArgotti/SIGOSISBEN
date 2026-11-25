import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
    return (
        <>
            <Head title="Olvidé mi contraseña" />

            <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-900 flex flex-col">

                {/* HEADER */}
                <div className="bg-gray-400 dark:bg-gray-800 h-16 flex items-center justify-between px-4 md:px-6 shadow">
                    <img src="/img/Logo propuesto SIGO-SISBEN.png" alt="Logo SIGO-SISBEN" className="h-10 md:h-12" />
                    <img src="/img/logo_alcadia.svg" alt="Logo Alcaldía" className="h-8 md:h-10 w-auto object-contain" />
                </div>

                {/* CONTENIDO */}
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">

                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center">
                        SIGO SISBÉN
                    </h1>

                    <p className="text-gray-600 dark:text-gray-300 mb-8 text-center text-sm md:text-base">
                        Sistema de Información para la Gestión Operativa del Sisbén
                    </p>

                    <div className="w-full max-w-md">

                        {/* CARD */}
                        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">

                            {/* Barra superior de la card */}
                            <div className="bg-[#E85068] text-gray-900 text-lg text-center py-3 font-semibold">
                                Restablecimiento de contraseña
                            </div>

                            {/* Cuerpo de la card */}
                            <div className="p-8 flex flex-col items-center gap-6">

                                {/* Texto */}
                                <div className="space-y-3 text-center">
                                    <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                                        ¿Olvidaste tu contraseña?
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed text-justify">
                                        Por razones de seguridad, el restablecimiento de contraseñas
                                        es gestionado exclusivamente por el administrador del sistema.
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed text-justify">
                                        Comunícate con el administrador responsable de tu institución
                                        y solicita el restablecimiento de tu acceso. Una vez realizado,
                                        podrás ingresar con tus nuevas credenciales.
                                    </p>
                                </div>

                                {/* Separador */}
                                <div className="w-full h-px bg-gray-200 dark:bg-gray-700" />

                                {/* Enlace de regreso */}
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-[#4171B1] dark:text-blue-400 hover:underline font-medium text-sm"
                                >
                                    <ArrowLeft size={16} />
                                    Volver al inicio de sesión
                                </Link>

                            </div>
                        </div>

                    </div>
                </div>

                {/* FOOTER */}
                <footer className="mt-auto bg-gray-400 dark:bg-gray-800 border-t border-gray-500 dark:border-gray-700 py-4">
                    <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-sm">

                        <p className="text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap">
                            © {new Date().getFullYear()} SIGO SISBÉN
                        </p>

                        <p className="text-center text-gray-800 dark:text-gray-200">
                            Departamento Administrativo de Planeación Distrital - Alcaldía de Santiago de Cali
                        </p>

                        <a
                            href="/acerca_de"
                            className="text-blue-900 dark:text-blue-300 hover:underline font-semibold whitespace-nowrap md:text-right"
                        >
                            Acerca de
                        </a>

                    </div>
                </footer>

            </div>
        </>
    );
}
