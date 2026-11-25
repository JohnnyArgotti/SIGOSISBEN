import { useState, useCallback, useEffect, useRef } from 'react';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';

/**
 * Muestra un diálogo de advertencia cuando el usuario lleva 5 minutos inactivo
 * y cierra sesión automáticamente al llegar a los 10 minutos.
 * Coloca este componente en el layout principal de la aplicación.
 */
export function InactivityGuard() {
    const [showWarning, setShowWarning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(300);

    const handleWarning = useCallback((secs: number) => {
        setSecondsLeft(secs);
        setShowWarning(true);
    }, []);

    const handleLogout = useCallback(() => {
        setShowWarning(false);
    }, []);

    const { resetActivity } = useInactivityLogout({
        onWarning: handleWarning,
        onLogout:  handleLogout,
    });

    const handleContinue = useCallback(() => {
        resetActivity();   // actualiza localStorage + pinga al servidor
        setShowWarning(false);
    }, [resetActivity]);

    const botonRef = useRef<HTMLButtonElement>(null);
    const focoPrevio = useRef<HTMLElement | null>(null);

    /*
     * Gestion del foco (WCAG 2.0 - 2.4.3 Orden del foco).
     *
     * Al aparecer el aviso el foco se quedaba donde estuviera, asi que quien
     * navega con teclado o lector de pantalla no se enteraba de que se habia
     * abierto. Aqui se lleva al boton al abrirse y se devuelve al cerrarse.
     *
     * No se atrapa el foco a proposito: `useInactivityLogout` reinicia la
     * actividad con cualquier tecla, de modo que pulsar Tab cierra el aviso.
     * Devolver el foco al elemento anterior es justo lo que hace falta para que
     * el usuario no acabe en el <body> cuando eso ocurre.
     */
    useEffect(() => {
        if (showWarning) {
            focoPrevio.current = document.activeElement as HTMLElement | null;
            botonRef.current?.focus();
            return;
        }
        focoPrevio.current?.focus?.();
        focoPrevio.current = null;
    }, [showWarning]);

    if (!showWarning) return null;

    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="inactivity-title"
            aria-describedby="inactivity-desc"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
                <h2
                    id="inactivity-title"
                    className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100"
                >
                    ¿Sigues ahí?
                </h2>
                <p
                    id="inactivity-desc"
                    className="mb-4 text-sm text-zinc-600 dark:text-zinc-400"
                >
                    Tu sesión se cerrará en <strong>{secondsLeft} segundo{secondsLeft !== 1 ? 's' : ''}</strong> por inactividad.
                    Mueve el mouse o presiona cualquier tecla para continuar.
                </p>
                <button
                    ref={botonRef}
                    type="button"
                    onClick={handleContinue}
                    className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Continuar sesión
                </button>
            </div>
        </div>
    );
}
