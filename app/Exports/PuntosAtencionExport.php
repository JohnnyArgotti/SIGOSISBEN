<?php

namespace App\Exports;

use App\Models\PuntoAtencion;
use App\Support\CeldaExcel;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class PuntosAtencionExport implements FromCollection, WithHeadings
{
    public function collection()
    {
        return PuntoAtencion::orderBy('id')->get()->map(function ($p) {
            return CeldaExcel::fila([
                'ID'          => (int)($p->id ?? 0),
                'Nombre'      => (string)($p->nombre ?? ''),
                'Estado'      => $p->estado ? 'Activo' : 'Inactivo',
                'Creado'      => $p->creado_el
                    ? Carbon::parse($p->creado_el)->format('d/m/Y')
                    : '-',
                'Actualizado' => $p->actualizado_el
                    ? Carbon::parse($p->actualizado_el)->format('d/m/Y')
                    : '-',
            ]);
        });
    }

    public function headings(): array
    {
        return [
            'ID',
            'Nombre',
            'Estado',
            'Creado',
            'Actualizado',
        ];
    }
}
