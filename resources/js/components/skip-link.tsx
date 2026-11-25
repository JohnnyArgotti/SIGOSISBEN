/**
 * Enlace "Saltar al contenido principal" (WCAG 2.0 — 2.4.1 Evitar bloques).
 *
 * La barra lateral y la cabecera suman unas 30 paradas de tabulación y se
 * repiten idénticas en todas las páginas. Sin este enlace, quien navega con
 * teclado tiene que recorrerlas enteras en cada navegación para llegar al
 * contenido.
 *
 * Debe ser el primer elemento enfocable del documento: se monta al inicio del
 * layout, antes de la barra lateral.
 *
 * Es un <a> y no un <button> a propósito: lleva a un lugar del documento, que
 * es la función de un enlace, y se activa con Enter, que es lo que se espera.
 *
 * Permanece fuera de la pantalla mediante un desplazamiento (transform) en vez
 * de `sr-only` + `focus:not-sr-only`: esas dos utilidades compiten por la
 * propiedad `position` y cuál gana depende del orden del CSS generado, lo que
 * hace que el enlace aparezca a veces en un rincón inesperado.
 */
export function SkipLink() {
    return (
        <a
            href="#contenido-principal"
            className="fixed left-4 top-4 z-[100] -translate-y-[200%] rounded-md bg-[#4171B1] px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform focus:translate-y-0 motion-reduce:transition-none"
        >
            Saltar al contenido principal
        </a>
    );
}
