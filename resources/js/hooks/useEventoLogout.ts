import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

interface EventoActivo {
    id: number;
    nombre: string;
    fecha?: string;      // "YYYY-MM-DD"
    hora_fin?: string;   // "HH:MM" o "HH:MM:SS"
}

/**
 * Cierra la sesión automáticamente cuando el evento activo alcanza su hora_fin.
 * Si la hora_fin ya pasó al montar el componente, cierra la sesión de inmediato.
 */
export function useEventoLogout(eventoActivo?: EventoActivo | null) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!eventoActivo?.fecha || !eventoActivo?.hora_fin) return;

        const performLogout = () => {
            // Usar el router de Inertia para que Axios gestione el token CSRF
            // automáticamente desde la cookie XSRF-TOKEN.
            router.post('/logout');
        };

        // Construir la fecha/hora de fin como hora LOCAL del navegador.
        // Nota: "YYYY-MM-DDTHH:MM:SS" (con T) se parsea como hora local,
        // mientras que "YYYY-MM-DD" solo (sin T) se parsea como UTC medianoche,
        // lo que causa que en zonas UTC- el evento siempre aparezca expirado.
        const fin = new Date(`${eventoActivo.fecha}T${eventoActivo.hora_fin}`);

        const msRestantes = fin.getTime() - Date.now();

        if (msRestantes <= 0) {
            // El evento ya terminó: cerrar sesión inmediatamente
            performLogout();
            return;
        }

        timerRef.current = setTimeout(performLogout, msRestantes);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [eventoActivo?.id, eventoActivo?.fecha, eventoActivo?.hora_fin]);
}
