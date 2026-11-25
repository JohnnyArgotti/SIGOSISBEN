import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    lastPage: number;
    total: number;
    perPage?: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({
    currentPage,
    lastPage,
    total,
    perPage = 20,
    onPageChange,
}: PaginationProps) {
    if (lastPage <= 1) return null;

    const startItem = Math.max(1, (currentPage - 1) * perPage + 1);
    const endItem = Math.min(total, currentPage * perPage);

    const generatePageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(lastPage, start + maxVisible - 1);

        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        // Primera página
        if (start > 1) {
            pages.push(1);
            if (start > 2) {
                pages.push('...');
            }
        }

        // Páginas intermedias
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        // Última página
        if (end < lastPage) {
            if (end < lastPage - 1) {
                pages.push('...');
            }
            pages.push(lastPage);
        }

        return pages;
    };

    const pageNumbers = generatePageNumbers();

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4  px-2 py-4">
            {/* Información de registros */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
                Página{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-200">
                    {currentPage}
                </span>
                {' '}de{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-200">
                    {lastPage}
                </span>
            </div>

            {/* Botones de paginación */}
            <div className="flex items-center gap-1 sm:gap-2">
                {/* Botón Anterior */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Página anterior"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 transition-colors duration-200 text-sm font-medium"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Anterior</span>
                </button>

                {/* Números de página */}
                <div className="flex items-center gap-1 sm:gap-2">
                    {pageNumbers.map((page, index) => (
                        <div key={index}>
                            {page === '...' ? (
                                <span className="px-2 py-2 text-gray-500 dark:text-gray-400">
                                    {page}
                                </span>
                            ) : (
                                <button
                                    onClick={() => onPageChange(page as number)}
                                    aria-label={`Página ${page}`}
                                    aria-current={
                                        page === currentPage ? 'page' : undefined
                                    }
                                    className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors duration-200 ${
                                        page === currentPage
                                            ? 'bg-gradient-to-br from-[#4171B1] to-[#365f96] text-white shadow-md hover:shadow-lg'
                                            : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {page}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Botón Siguiente */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === lastPage}
                    aria-label="Siguiente página"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 transition-colors duration-200 text-sm font-medium"
                >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
