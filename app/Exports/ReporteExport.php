<?php

namespace App\Exports;

use App\Support\CeldaExcel;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithCustomCsvSettings;
use Maatwebsite\Excel\Concerns\WithHeadings;

/**
 * Export genérico del módulo de reportes: recibe las filas ya calculadas
 * (cualquier combinación de dimensiones y métricas) y sus encabezados.
 */
class ReporteExport implements FromArray, WithHeadings, WithCustomCsvSettings
{
    public function __construct(
        protected array $rows,
        protected array $headings,
    ) {}

    public function array(): array
    {
        // Las filas llegan armadas por el controlador con cualquier combinación
        // de dimensiones, así que el saneamiento se hace aquí: es el único punto
        // por el que pasan todas.
        return CeldaExcel::filas($this->rows);
    }

    public function headings(): array
    {
        return $this->headings;
    }

    public function getCsvSettings(): array
    {
        // BOM para que Excel abra correctamente los acentos del CSV
        return ['use_bom' => true];
    }
}
