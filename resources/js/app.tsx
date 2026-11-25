import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
// Registra el nonce de la CSP antes de que cualquier componente inserte estilos.
import './lib/csp-nonce';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <StrictMode>
                <App {...props} />
            </StrictMode>,
        );
    },
    // Los estilos de la barra (color incluido) están en app.css: los que
    // Inertia inyecta por su cuenta van en un <style> sin nonce que la CSP
    // bloquearía.
    progress: {
        includeCSS: false,
    },
});
