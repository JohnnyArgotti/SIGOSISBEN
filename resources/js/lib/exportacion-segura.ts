/**
 * Saneamiento de las exportaciones que se arman en el navegador.
 *
 * Los reportes que se generan del lado del cliente (impresión a PDF, CSV y
 * XLSX del módulo de reportes) construyen su salida a partir de texto escrito
 * por los usuarios: observaciones, direcciones, motivos, nombres de barrio.
 * Ese texto no es seguro por sí mismo y necesita tratarse distinto según el
 * destino:
 *
 *  - En HTML, un valor puede cerrar la etiqueta que lo contiene e inyectar
 *    script. La plantilla `html` de este módulo escapa toda interpolación.
 *  - En una hoja de cálculo, un valor que abre con «=», «+», «-» o «@» deja de
 *    ser dato y se ejecuta como fórmula. `sanearCelda` lo neutraliza.
 *
 * El backend ya resuelve el segundo caso en App\Support\CeldaExcel. Las reglas
 * de `sanearCelda` son deliberadamente las mismas, para que un archivo
 * descargado desde el navegador y el mismo archivo generado en el servidor
 * traten los datos de forma idéntica.
 */

/**
 * Fragmento que ya es HTML válido y no debe volver a escaparse.
 *
 * Sirve para distinguir el marcado que escribe el desarrollador del dato que
 * escribió un usuario. Todo lo que no esté envuelto aquí se considera dato.
 */
export class HtmlSeguro {
    constructor(private readonly contenido: string) {}

    toString(): string {
        return this.contenido;
    }
}

/** Marca una cadena como marcado ya seguro (estilos, etiquetas, fragmentos armados). */
export function crudo(fragmento: string): HtmlSeguro {
    return new HtmlSeguro(fragmento);
}

/** Escapa los caracteres con significado en HTML. El «&» va primero, o se escaparía dos veces. */
export function escaparHtml(valor: unknown): string {
    if (valor == null) return '';

    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Plantilla etiquetada que escapa por omisión.
 *
 * Se escribe igual que un template literal normal:
 *
 *     html`<td>${valorDelUsuario}</td>`
 *
 * y cada interpolación queda escapada salvo que sea un HtmlSeguro. Los arreglos
 * se recorren y se concatenan, de modo que una lista de celdas se puede
 * interpolar directamente sin `join`.
 *
 * La ventaja frente a llamar `escaparHtml` en cada punto es que lo seguro pasa
 * a ser lo que ocurre por omisión: una columna que se agregue más adelante
 * queda protegida sin que nadie tenga que acordarse de escaparla.
 */
export function html(partes: TemplateStringsArray, ...valores: unknown[]): HtmlSeguro {
    const salida: string[] = [partes[0]];

    valores.forEach((valor, i) => {
        salida.push(interpolar(valor), partes[i + 1]);
    });

    return new HtmlSeguro(salida.join(''));
}

function interpolar(valor: unknown): string {
    if (valor instanceof HtmlSeguro) return valor.toString();
    if (Array.isArray(valor)) return valor.map(interpolar).join('');

    return escaparHtml(valor);
}

/** Caracteres con los que una hoja de cálculo pasa a interpretar la celda como fórmula. */
const DISPARADORES_FORMULA = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Devuelve el valor listo para escribirse en una celda de CSV o XLSX.
 *
 * Antepone un apóstrofo a los valores que abrirían una fórmula, que es lo que
 * obliga a Excel, LibreOffice y Google Sheets a tratar la celda como texto.
 * Replica las excepciones de App\Support\CeldaExcel: un solo carácter no
 * alcanza a formar fórmula (y «-» es el marcador de dato ausente que usan los
 * reportes), y un número con signo es un dato legítimo.
 */
export function sanearCelda(valor: string): string {
    if (valor === '') return valor;

    if (!DISPARADORES_FORMULA.includes(valor[0])) return valor;

    if (valor.length === 1) return valor;

    if (/^[+-][\d.,]+$/.test(valor)) return valor;

    return `'${valor}`;
}
