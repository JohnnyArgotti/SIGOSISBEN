import { Head, useForm, router, usePage, Link } from '@inertiajs/react'
import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type Punto = {
    id: number
    nombre: string
}

type Evento = {
    id: number
    nombre: string
}

type Props = {
    puntos: Punto[]
    eventos: Evento[]
    showModal?: boolean
}

export default function Login({ puntos, eventos, showModal = false }: Props) {

    const { flash } = usePage().props as any

    const { data, setData, post, processing, errors, reset } = useForm({
        nombre_usuario: '',
        password: '',
    })

    const [modal, setModal] = useState(showModal)
    const [showPassword, setShowPassword] = useState(false)
    // "punto_X" o "evento_X"
    const [seleccion, setSeleccion] = useState<string>('')
    const [loadingPunto, setLoadingPunto] = useState(false)
    const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string>('')

    useEffect(() => {
        // Reiniciar el timer de inactividad para que una nueva sesión no
        // herede el timestamp de la sesión anterior y cause logout inmediato.
        localStorage.setItem('last_activity_time', String(Date.now()))

        // Detectar cierre por inactividad iniciado desde el frontend
        if (localStorage.getItem('session_expired_inactivity') === '1') {
            localStorage.removeItem('session_expired_inactivity')
            setSessionExpiredMsg('Tu sesión fue cerrada por inactividad.')
            return
        }
        // Detectar cierre por inactividad iniciado desde el backend (middleware)
        if (flash?.error) {
            setSessionExpiredMsg(flash.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Auto-cerrar el mensaje después de 8 segundos
    useEffect(() => {
        if (!sessionExpiredMsg) return
        const t = setTimeout(() => setSessionExpiredMsg(''), 10_000)
        return () => clearTimeout(t)
    }, [sessionExpiredMsg])

    useEffect(() => {
        setModal(showModal)
    }, [showModal])

    useEffect(() => {
        if (!modal) {
            reset()
            setData({
                nombre_usuario: '',
                password: '',
            })
        }
    }, [modal])

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        post('/login')
    }

    const guardarPunto = () => {
        if (!seleccion) {
            alert("Seleccione un punto de atención o evento")
            return
        }

        const [tipo, id] = seleccion.split('_')

        setLoadingPunto(true)

        router.post('/guardar-punto', {
            tipo,
            seleccion_id: Number(id),
        }, {
            onFinish: () => {
                setLoadingPunto(false)
            }
        })
    }

    return (
        <>
            <Head title="SIGO SISBÉN" />

            <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-900 flex flex-col">

                {/* HEADER */}
                <div className="bg-gray-400 dark:bg-gray-800 h-16 flex items-center justify-between px-4 md:px-6 shadow">
                    <img src="/img/Logo propuesto SIGO-SISBEN.png" alt="Logo SIGO-SISBEN" className="h-10 md:h-12" />
                    <img src="/img/logo_alcadia.svg" alt="Logo Alcaldía" className="h-8 md:h-10 w-auto object-contain" />
                </div>

                {/* CONTENIDO */}
                <div className="flex-1 flex flex-col items-center justify-center px-4">

                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center">
                        SIGO SISBÉN
                    </h1>

                    <p className="text-gray-600 dark:text-gray-300 mb-8 text-center text-sm md:text-base">
                        Sistema de Información para la Gestión Operativa del Sisbén
                    </p>

                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg w-full max-w-sm md:max-w-md">

                        <div className="bg-gray-400 dark:bg-gray-700 text-gray-900 text-lg md:text-xl text-center py-3 font-semibold rounded-t-lg">
                            Iniciar sesión
                        </div>

                        {sessionExpiredMsg && (
                            <div className="mx-4 mt-4 flex items-start justify-between rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                                <span>{sessionExpiredMsg}</span>
                                <button
                                    type="button"
                                    onClick={() => setSessionExpiredMsg('')}
                                    className="ml-3 flex-shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-200 text-lg leading-none"
                                    aria-label="Cerrar"
                                >
                                    ×
                                </button>
                            </div>
                        )}

                        <form onSubmit={submit} className="p-4 md:p-8 space-y-6">

                            {/* USUARIO */}
                            <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre de usuario
                                </label>

                                <input
                                    type="text"
                                    value={data.nombre_usuario}
                                    onChange={(e) => setData('nombre_usuario', e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 
                                    bg-white dark:bg-gray-700 
                                    text-gray-900 dark:text-gray-100 
                                    rounded px-3 py-2 
                                    focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    placeholder="nombre de usuario"
                                />

                                {errors.nombre_usuario && (
                                    <div className="text-red-500 text-sm">
                                        {errors.nombre_usuario}
                                    </div>
                                )}
                            </div>

                            {/* PASSWORD */}
                            <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                    Contraseña
                                </label>

                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="w-full border border-gray-300 dark:border-gray-600
                                        bg-white dark:bg-gray-700
                                        text-gray-900 dark:text-gray-100
                                        rounded px-3 py-2 pr-10
                                        focus:outline-none focus:ring-2 focus:ring-gray-400"
                                        placeholder="********"
                                    />
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                                aria-pressed={showPassword}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm text-gray-600 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                        </TooltipContent>
                                    </Tooltip>
                                </div>

                                {errors.password && (
                                    <div className="text-red-500 text-sm">
                                        {errors.password}
                                    </div>
                                )}
                            </div>

                            {/* FORGOT */}
                            <div className="text-center">
                                <Link
                                    href="/forgot-password"
                                    className="text-[#E85068] hover:text-[#d74359]"
                                >
                                    Olvidé mi contraseña
                                </Link>
                            </div>

                            {/* BOTON */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full bg-[#4171B1] hover:bg-[#365f96] text-white py-2 rounded font-semibold transition"
                            >
                                {processing ? 'Ingresando...' : 'Ingresar'}
                            </button>

                        </form>
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
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-900 dark:text-blue-300 hover:underline font-semibold whitespace-nowrap md:text-right"
                        >
                            Acerca de
                        </a>

                    </div>
                </footer>

                {modal && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow w-96">

                            <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">
                                Seleccione punto de atención o evento
                            </h2>

                            {flash?.error && (
                                <div className="mx-4 mt-4 rounded-md bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                                    {flash.error}
                                </div>
                            )}

                            <select
                                className="w-full border rounded p-2 
                                bg-white dark:bg-gray-700 
                                text-gray-900 dark:text-gray-100 
                                border-gray-300 dark:border-gray-600"
                                value={seleccion}
                                onChange={(e) => setSeleccion(e.target.value)}
                            >
                                <option value="">Seleccione</option>

                                {puntos.length > 0 && (
                                    <optgroup label="— Puntos de atención —">
                                        {puntos.map((p) => (
                                            <option key={`punto_${p.id}`} value={`punto_${p.id}`}>
                                                {p.nombre}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}

                                {eventos.length > 0 && (
                                    <optgroup label="— Eventos —">
                                        {eventos.map((e) => (
                                            <option key={`evento_${e.id}`} value={`evento_${e.id}`}>
                                                {e.nombre}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>

                            <button
                                onClick={guardarPunto}
                                disabled={loadingPunto}
                                className="mt-4 w-full bg-[#3F73B3] hover:bg-[#365f96] text-white py-2 rounded font-semibold transition disabled:opacity-70"
                            >
                                {loadingPunto ? 'Ingresando...' : 'Confirmar'}
                            </button>

                            <button
                                onClick={() => {
                                    setSeleccion('')
                                    setModal(false)
                                    router.post('/logout')
                                }}
                                type="button"
                                className="mt-2 w-full bg-[#E85068] hover:brightness-110 text-gray-900 py-2 rounded font-semibold transition"
                            >
                                Cancelar
                            </button>

                        </div>

                    </div>
                )}

            </div>
        </>
    )
}
