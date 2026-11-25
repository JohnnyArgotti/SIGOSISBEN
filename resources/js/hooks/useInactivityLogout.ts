import { router } from '@inertiajs/react';
import { useEffect, useRef, useCallback } from 'react';

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutos (5 inactividad + 5 de espera con modal)
const WARNING_BEFORE_MS   =  5 * 60 * 1000; // advertir 5 min antes (mostrar modal a los 5 min)
const STORAGE_KEY         = 'last_activity_time';
const CHECK_INTERVAL_MS   = 1_000;          // revisar cada 1 segundo
const PING_THROTTLE_MS    = 4 * 60 * 1000;  // avisar al servidor máx. 1 vez cada 4 min

interface Options {
    onWarning?: (secondsLeft: number) => void;
    onLogout?: () => void;
}

/**
 * Cierra sesión automáticamente tras INACTIVITY_LIMIT_MS de inactividad.
 * Modal de advertencia aparece a los 5 minutos; cierre automático a los 10 minutos.
 *
 * El tiempo de última actividad se guarda en localStorage para que persista
 * cuando Inertia desmonta/monta el layout al navegar entre páginas.
 * Un setInterval revisa el estado cada CHECK_INTERVAL_MS en lugar de depender
 * de setTimeout que se cancelan al desmontar el componente.
 */
export function useInactivityLogout({ onWarning, onLogout }: Options = {}) {
    const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
    const warningFired = useRef(false);
    const onWarningRef = useRef(onWarning);
    const onLogoutRef  = useRef(onLogout);

    // Mantener refs actualizadas sin re-crear el efecto
    useEffect(() => { onWarningRef.current = onWarning; }, [onWarning]);
    useEffect(() => { onLogoutRef.current  = onLogout;  }, [onLogout]);

    /** Pide al servidor que renueve session('last_activity_time') */
    const pingServer = useCallback(() => {
        const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
        const token = meta?.content ?? '';
        fetch('/keep-alive', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).catch(() => { /* silenciar errores de red */ });
    }, []);

    /**
     * Actualiza el timestamp de actividad en localStorage y, como máximo una vez
     * cada PING_THROTTLE_MS, se lo informa al servidor.
     *
     * El ping es necesario porque mover el mouse o escribir no genera peticiones
     * por sí solo: sin él, el servidor cerraría la sesión a los 11 min aunque el
     * usuario esté trabajando. Antes esto quedaba tapado por peticiones
     * automáticas (el polling de reservas), que ya no renuevan el contador
     * (ver app/Http/Middleware/CheckSessionInactivity.php).
     *
     * Arranca en Date.now() porque la propia carga de la página ya renovó el
     * contador del servidor.
     */
    const lastPingRef = useRef(Date.now());

    const updateActivity = useCallback(() => {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
        warningFired.current = false;

        const ahora = Date.now();
        if (ahora - lastPingRef.current >= PING_THROTTLE_MS) {
            lastPingRef.current = ahora;
            pingServer();
        }
    }, [pingServer]);

    /**
     * Reseteo explícito: actualiza localStorage, limpia advertencia
     * y pide al servidor que renueve su propio timestamp de sesión.
     * Debe usarse cuando el usuario hace clic en "Continuar sesión".
     */
    const resetActivity = useCallback(() => {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
        warningFired.current = false;
        lastPingRef.current = Date.now();
        pingServer();
    }, [pingServer]);

    const performLogout = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        localStorage.setItem(STORAGE_KEY, String(Date.now()));

        onLogoutRef.current?.();
        localStorage.setItem('session_expired_inactivity', '1');

        // Usar el router de Inertia para que Axios gestione el token CSRF
        // automáticamente desde la cookie XSRF-TOKEN.
        router.post('/logout');
    }, []);

    useEffect(() => {
        // Si no existe marca (primera carga de sesión), inicializarla ahora
        if (!localStorage.getItem(STORAGE_KEY)) {
            localStorage.setItem(STORAGE_KEY, String(Date.now()));
        }

        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
        events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));

        intervalRef.current = setInterval(() => {
            const stored = localStorage.getItem(STORAGE_KEY);
            const lastActivity = stored ? Number(stored) : Date.now();
            const idle = Date.now() - lastActivity;

            if (idle >= INACTIVITY_LIMIT_MS) {
                performLogout();
            } else if (idle >= INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS) {
                warningFired.current = true;
                onWarningRef.current?.(Math.max(0, Math.ceil((INACTIVITY_LIMIT_MS - idle) / 1000)));
            } else {
                warningFired.current = false;
            }
        }, CHECK_INTERVAL_MS);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            events.forEach(e => window.removeEventListener(e, updateActivity));
        };
    }, [updateActivity, performLogout]);

    return { resetActivity };
}

