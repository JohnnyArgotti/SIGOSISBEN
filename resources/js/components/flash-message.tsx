import { Transition } from '@headlessui/react';
import { useEffect, useState } from 'react';

interface Props {
    success?: string | null;
    error?: string | null;
    /** Milisegundos antes de ocultarse automáticamente. Por defecto 10 segundos. */
    duration?: number;
}

/**
 * Muestra mensajes flash de éxito y/o error con auto-dismiss.
 * Al cambiar `success` o `error` el temporizador se reinicia.
 */
export function FlashMessage({ success, error, duration = 10_000 }: Props) {
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);

    useEffect(() => {
        if (!success) { setShowSuccess(false); return; }
        setShowSuccess(true);
        const t = setTimeout(() => setShowSuccess(false), duration);
        return () => clearTimeout(t);
    }, [success, duration]);

    useEffect(() => {
        if (!error) { setShowError(false); return; }
        setShowError(true);
        const t = setTimeout(() => setShowError(false), duration);
        return () => clearTimeout(t);
    }, [error, duration]);

    return (
        <>
            <Transition
                show={showSuccess}
                enter="transition ease-out duration-300"
                enterFrom="opacity-0 -translate-y-2"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-300"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 -translate-y-2"
            >
                <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <svg className="h-5 w-5 text-green-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>{success}</span>
                    </div>
                    <button type="button" onClick={() => setShowSuccess(false)} className="text-green-500 hover:text-green-700 dark:hover:text-green-200 leading-none text-lg">×</button>
                </div>
            </Transition>

            <Transition
                show={showError}
                enter="transition ease-out duration-300"
                enterFrom="opacity-0 -translate-y-2"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-300"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 -translate-y-2"
            >
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300 flex items-center justify-between gap-3">
                    <span>{error}</span>
                    <button type="button" onClick={() => setShowError(false)} className="text-red-400 hover:text-red-600 dark:hover:text-red-200 leading-none text-lg">×</button>
                </div>
            </Transition>
        </>
    );
}
