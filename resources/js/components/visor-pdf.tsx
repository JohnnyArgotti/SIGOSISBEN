import { FileText } from 'lucide-react';
import { useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface VisorPdfProps {
    abierto: boolean;
    onOpenChange: (abierto: boolean) => void;
    /** URL que devuelve el PDF con Content-Disposition: inline */
    urlVer: string;
    /**
     * URL que devuelve el PDF con Content-Disposition: attachment. Solo se usa
     * en el respaldo para móviles: donde el PDF sí se embebe, la barra del
     * visor nativo ya trae su propio botón de descarga.
     */
    urlDescargar: string;
    nombreArchivo?: string | null;
    tamanoArchivo?: string | null;
}

/**
 * iOS Safari y varios navegadores móviles ignoran el PDF embebido en un iframe
 * y muestran un marco en blanco. En esos casos se ofrece la descarga directa.
 */
const soportaPdfEmbebido = () => {
    if (typeof navigator === 'undefined') return true;
    return !/iPad|iPhone|iPod|Android/i.test(navigator.userAgent);
};

export default function VisorPdf({
    abierto,
    onOpenChange,
    urlVer,
    urlDescargar,
    nombreArchivo,
    tamanoArchivo,
}: VisorPdfProps) {
    // El contenido del diálogo solo se monta tras un clic del usuario, así que
    // esta detección siempre corre en el cliente: no hay desajuste de hidratación.
    const [puedeEmbeber] = useState(soportaPdfEmbebido);

    return (
        <Dialog open={abierto} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-5xl h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
                {/* Encabezado: deja espacio a la derecha para la X del Dialog */}
                <div className="border-b dark:border-gray-700 px-4 py-3 pr-12 shrink-0">
                    <DialogTitle className="text-sm font-semibold text-[#4171B1] truncate">
                        {nombreArchivo ?? 'Soporte PDF'}
                    </DialogTitle>
                    {tamanoArchivo && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tamanoArchivo}</p>
                    )}
                </div>

                <div className="flex-1 min-h-0 bg-gray-100 dark:bg-gray-950">
                    {puedeEmbeber ? (
                        <iframe
                            src={urlVer}
                            title={nombreArchivo ?? 'Soporte PDF'}
                            className="w-full h-full border-0"
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
                            <FileText className="w-10 h-10 text-gray-600" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Este navegador no permite ver el PDF dentro de la página.
                            </p>
                            <a
                                href={urlVer}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4171B1] hover:bg-[#365f96] text-white text-xs font-medium transition-colors"
                            >
                                Abrir en una pestaña nueva
                            </a>
                            <a
                                href={urlDescargar}
                                className="text-xs text-gray-500 dark:text-gray-400 underline hover:text-[#4171B1] transition-colors"
                            >
                                Descargar el archivo
                            </a>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
