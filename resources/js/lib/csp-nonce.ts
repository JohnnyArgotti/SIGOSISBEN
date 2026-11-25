/**
 * Nonce de la Content-Security-Policy para las etiquetas <style> que se
 * insertan desde JavaScript.
 *
 * La CSP (App\Http\Middleware\SecurityHeaders) no admite 'unsafe-inline' en
 * style-src: una etiqueta <style> creada en el navegador solo se aplica si
 * trae el nonce con que se sirvió la página. El servidor lo publica en
 * <meta name="csp-nonce"> (app.blade.php). Como Inertia navega sin recargar
 * el documento, ese nonce vale mientras la pestaña siga abierta.
 *
 * Los estilos aplicados con elemento.style (los `style={{...}}` de React) no
 * pasan por la CSP y no lo necesitan.
 */
import { setNonce } from 'get-nonce';

// La guarda de `document` es para el build de SSR, que importa los componentes en Node.
export const cspNonce: string | undefined =
    typeof document === 'undefined'
        ? undefined
        : document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content || undefined;

// Bloqueo de scroll de los diálogos, menús y selects de Radix
// (react-remove-scroll): inserta un <style> con el ancho de la barra de
// desplazamiento y toma el nonce de get-nonce.
if (cspNonce) {
    setNonce(cspNonce);
}
