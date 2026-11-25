<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * Añade las cabeceras de seguridad a todas las respuestas que genera la
 * aplicación.
 *
 * Los archivos estáticos (el build de Vite, el favicon, robots.txt) no pasan
 * por aquí porque los entrega Apache sin ejecutar PHP: sus cabeceras se
 * declaran en public/.htaccess y deben mantenerse alineadas con estas.
 *
 * Ninguna cabecera se sobrescribe si la respuesta ya la trae. Eso es
 * deliberado: la descarga de soportes en PDF define su propia CSP con
 * "sandbox" para aislar el archivo del usuario, y esa política, más estricta
 * que la general, debe prevalecer.
 */
class SecurityHeaders
{
    /**
     * Política de contenido del aplicativo. La directiva style-src se completa
     * con el nonce de cada petición (ver politicaDeContenido()).
     *
     * - frame-ancestors 'self' y no 'none' porque el visor muestra los PDF en
     *   un iframe del mismo origen.
     * - data: en img-src cubre las imágenes que se generan en el navegador al
     *   exportar (canvas de las gráficas).
     */
    private const CSP = "default-src 'self'; base-uri 'self'; object-src 'none'; "
        ."frame-ancestors 'self'; form-action 'self'; script-src 'self'; "
        ."img-src 'self' data:; font-src 'self'; connect-src 'self'";

    /**
     * Funciones del navegador que el aplicativo no usa. Las que sí se usan
     * —el portapapeles de los botones de copiar— no se listan, para que
     * conserven su permiso por defecto ('self').
     */
    private const PERMISSIONS_POLICY = 'accelerometer=(), autoplay=(), camera=(), '
        .'display-capture=(), encrypted-media=(), geolocation=(), gyroscope=(), '
        .'magnetometer=(), microphone=(), midi=(), payment=(), usb=()';

    public function handle(Request $request, Closure $next): Response
    {
        // El nonce se genera antes de atender la petición porque las vistas lo
        // necesitan al renderizarse: Vite lo agrega a sus etiquetas y las
        // plantillas lo leen con Vite::cspNonce().
        Vite::useCspNonce();

        $response = $next($request);

        foreach ($this->cabeceras() as $nombre => $valor) {
            if (! $response->headers->has($nombre)) {
                $response->headers->set($nombre, $valor);
            }
        }

        return $response;
    }

    /**
     * @return array<string, string>
     */
    private function cabeceras(): array
    {
        $cabeceras = [
            // Evita que el navegador reinterprete el tipo declarado del
            // contenido, que es como un archivo subido termina ejecutándose.
            'X-Content-Type-Options' => 'nosniff',

            // Clickjacking. SAMEORIGIN, no DENY: el visor de PDF enmarca
            // documentos del propio origen.
            'X-Frame-Options' => 'SAMEORIGIN',

            // Hacia otros sitios solo viaja el origen, nunca la ruta: las URL
            // del SIGO llevan identificadores de solicitudes y de ciudadanos.
            'Referrer-Policy' => 'strict-origin-when-cross-origin',

            // Aísla la ventana de las que la abran o abra, para que no puedan
            // manipularse entre sí por window.opener.
            'Cross-Origin-Opener-Policy' => 'same-origin',

            // Impide que otro sitio incruste recursos del SIGO como imagen o
            // script para inferir su contenido.
            'Cross-Origin-Resource-Policy' => 'same-origin',

            'Permissions-Policy' => self::PERMISSIONS_POLICY,
        ];

        // En desarrollo los assets y el websocket de recarga en caliente los
        // sirve Vite desde otro origen (localhost), que estas dos políticas
        // bloquearían. Rigen sobre el build, que es lo que se despliega.
        if (! Vite::isRunningHot()) {
            $cabeceras['Content-Security-Policy'] = $this->politicaDeContenido();

            // Solo se cargan recursos de otro origen si ese origen lo
            // autoriza (CORP o CORS); junto con COOP deja la página aislada
            // de otros orígenes (Spectre). No cambia nada en la práctica: la
            // CSP ya limita todo a 'self'. Un iframe también tiene que traer
            // esta cabecera, y la trae: el PDF del visor pasa por aquí.
            $cabeceras['Cross-Origin-Embedder-Policy'] = 'require-corp';
        }

        return $cabeceras;
    }

    /**
     * Sin 'unsafe-inline' en style-src: solo se aceptan las hojas del propio
     * origen y las etiquetas <style> que traigan el nonce de la petición, y se
     * rechaza todo atributo style="..." escrito en el HTML. Los estilos que
     * React y las librerías aplican desde JavaScript (elemento.style) no pasan
     * por la CSP y siguen funcionando.
     *
     * Quienes insertan <style> por su cuenta y por eso llevan el nonce: la
     * plantilla app.blade.php, las páginas de error (resources/views/errors),
     * el bloqueo de scroll de los diálogos y el Select de Radix
     * (resources/js/lib/csp-nonce.ts) y la impresión de reportes, cuyo iframe
     * hereda esta política.
     */
    private function politicaDeContenido(): string
    {
        return self::CSP."; style-src 'self' 'nonce-".Vite::cspNonce()."'";
    }
}
