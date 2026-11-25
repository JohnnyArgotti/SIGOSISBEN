import { Head } from '@inertiajs/react'
import GuestLayout from '@/layouts/guest-layout'
import { ExternalLink, FileText, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

type DocumentoPublico = {
    id: number
    nombre: string
    enlace: string
}

/* ---------- Bloque reutilizable ---------- */

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
            <header className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {title}
                </h2>
            </header>

            <div className="px-5 py-5">{children}</div>
        </section>
    )
}

const equipoTrabajo = ['Ing. Victor Quiceno', 'Ing. Juan Junior Sinisterra']

/* ---------- Vista ---------- */

export default function AcercaDe({ documentos = [] }: { documentos?: DocumentoPublico[] }) {
    // El backend ya exige https; se repite aquí porque esta vista es pública.
    const documentosVisibles = documentos.filter((d) => d.enlace.startsWith('https://'))

    return (
        <GuestLayout>
            <Head title="Acerca de" />

            <div className="flex flex-1 flex-col bg-[#F3F4F6] dark:bg-gray-900">
                <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 md:px-6">

                    {/* PORTADA */}
                    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
                        <div className="px-5 py-6 md:px-8 md:py-8">
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl dark:text-gray-100">
                                Acerca de SIGO-SISBÉN
                            </h1>

                            <p className="mt-2 text-sm text-gray-600 md:text-base dark:text-gray-300">
                                Sistema de Información para la Gestión Operativa del SISBÉN
                            </p>

                            <ul className="mt-5 list-disc space-y-1 pl-5 text-sm text-gray-700 marker:text-gray-400 dark:text-gray-300 dark:marker:text-gray-500">
                                <li>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        Versión:
                                    </span>{' '}
                                    1.0
                                </li>

                                <li>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        Año:
                                    </span>{' '}
                                    2026
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* DESCRIPCIÓN */}
                    <SectionCard title="SIGO - SISBÉN">
                        <div className="space-y-4 text-sm leading-7 text-gray-700 md:text-justify dark:text-gray-300">
                            <p>
                                SIGO-SISBÉN es una solución tecnológica desarrollada para apoyar la
                                gestión, seguimiento, control y trazabilidad de los procesos operativos
                                asociados al SISBÉN en el Distrito de Santiago de Cali.
                            </p>

                            <p>
                                El sistema busca facilitar la administración de la información, optimizar
                                los procesos internos y proporcionar herramientas para el seguimiento y
                                control de las actividades desarrolladas por los equipos responsables.
                            </p>
                        </div>
                    </SectionCard>

                    {/* MARCO INSTITUCIONAL */}
                    <SectionCard title="Marco institucional">
                        <p className="text-sm leading-7 text-gray-700 md:text-justify dark:text-gray-300">
                            El desarrollo de SIGO-SISBÉN se realiza en el marco del{' '}
                            <strong className="font-semibold text-gray-900 dark:text-gray-100">
                                Convenio Interadministrativo 859 de 2025
                            </strong>
                            , entre la Universidad Antonio José Camacho y el Departamento Administrativo
                            de Planeación de Santiago de Cali, representado por la Subdirección de
                            Desarrollo Integral.
                        </p>
                    </SectionCard>

                    {/* ENTIDADES PARTICIPANTES */}
                    <SectionCard title="Entidades participantes">
                        <ul className="list-disc space-y-4 pl-5 text-sm leading-7 text-gray-700 marker:text-gray-400 dark:text-gray-300 dark:marker:text-gray-500">
                            <li>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    Departamento Administrativo de Planeación – DAP
                                </span>
                                <br />
                                Subdirección de Desarrollo Integral. Entidad vinculada a la gestión
                                institucional del proceso y a la definición, seguimiento y validación de
                                los requerimientos asociados al proyecto.
                            </li>

                            <li>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    Universidad Antonio José Camacho – UNIAJC
                                </span>
                                <br />
                                Entidad participante en el desarrollo y ejecución del proyecto en el marco
                                del convenio interadministrativo.
                            </li>
                        </ul>
                    </SectionCard>

                    {/* EQUIPO DE DESARROLLO */}
                    <SectionCard title="Equipo de desarrollo">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <div className="mb-3 rounded-md bg-gray-100 px-4 py-2.5 dark:bg-gray-900/50">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        Líder de proyecto
                                    </h3>
                                </div>

                                <ul className="list-disc space-y-1.5 pl-6 text-sm leading-7 text-gray-700 marker:text-gray-400 dark:text-gray-300 dark:marker:text-gray-500">
                                    <li>Ing. Euvar Diuza</li>
                                </ul>
                            </div>

                            <div>
                                <div className="mb-3 rounded-md bg-gray-100 px-4 py-2.5 dark:bg-gray-900/50">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        Equipo de trabajo
                                    </h3>
                                </div>

                                <ul className="list-disc space-y-1.5 pl-6 text-sm leading-7 text-gray-700 marker:text-gray-400 dark:text-gray-300 dark:marker:text-gray-500">
                                    {equipoTrabajo.map((nombre) => (
                                        <li key={nombre}>{nombre}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </SectionCard>

                    {/* DOCUMENTOS PÚBLICOS */}
                    {documentosVisibles.length > 0 && (
                        <SectionCard title="Documentos públicos">
                            <ul className="space-y-2 text-sm">
                                {documentosVisibles.map((documento) => (
                                    <li key={documento.id}>
                                        <a
                                            href={documento.enlace}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 font-medium text-[#4171B1] hover:underline dark:text-blue-400"
                                        >
                                            <FileText className="size-4 shrink-0" />
                                            {documento.nombre}
                                            <ExternalLink className="size-3.5 shrink-0" />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </SectionCard>
                    )}

                    {/* SEGURIDAD */}
                    <SectionCard title="Seguridad y protección de la información">
                        <div className="space-y-4 text-sm leading-7 text-gray-700 md:text-justify dark:text-gray-300">
                            <p>
                                La información gestionada mediante SIGO-SISBÉN está sujeta a las
                                disposiciones aplicables en materia de protección de datos personales,
                                seguridad de la información, confidencialidad, acceso, tratamiento y
                                custodia de la información.
                            </p>

                            <p>
                                El acceso a las funcionalidades y a la información del sistema se
                                encuentra controlado mediante mecanismos de autenticación, roles y
                                permisos de usuario.
                            </p>
                        </div>
                    </SectionCard>

                    {/* IMPORTANTE */}
                    <section className="rounded-lg border border-l-4 border-[#E85068]/30 border-l-[#E85068] bg-[#E85068]/5 px-5 py-5 shadow-sm dark:border-[#E85068]/40 dark:border-l-[#E85068] dark:bg-[#E85068]/10">
                        <div className="flex items-start gap-3">
                            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#E85068]" />

                            <div>
                                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                    Importante
                                </h2>

                                <p className="mt-1.5 text-sm leading-7 text-gray-700 md:text-justify dark:text-gray-300">
                                    SIGO-SISBÉN constituye una herramienta de apoyo a la gestión
                                    institucional. Su utilización se encuentra sujeta a los
                                    procedimientos, lineamientos, competencias institucionales y
                                    disposiciones normativas aplicables al proceso SISBÉN.
                                </p>
                            </div>
                        </div>
                    </section>

                </div>

                {/* FOOTER */}
                <footer className="mt-auto border-t border-gray-500 bg-gray-400 py-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm md:flex-row">

                        <p className="font-medium whitespace-nowrap text-gray-900 dark:text-gray-100">
                            © {new Date().getFullYear()} SIGO SISBÉN
                        </p>

                        <p className="text-center text-gray-800 dark:text-gray-200">
                            Departamento Administrativo de Planeación Distrital - Alcaldía de Santiago de Cali
                        </p>

                        <p className="font-medium whitespace-nowrap text-gray-900 dark:text-gray-100">
                            Todos los derechos reservados.
                        </p>

                    </div>
                </footer>

            </div>
        </GuestLayout>
    )
}
