<?php

namespace App\Exports;

use App\Http\Controllers\GestionauditoriaController;
use App\Support\CeldaExcel;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class AuditoriaExport implements FromCollection, WithHeadings
{
    protected Request $request;

    public function __construct(Request $request)
    {
        $this->request = $request;
    }

    public function collection()
    {
        return GestionauditoriaController::construirConsulta($this->request)
            ->with('usuario:id,nombres,apellidos')
            ->orderByDesc('creado_el')
            ->orderByDesc('id')
            ->get()
            ->map(function ($a) {
                return CeldaExcel::fila([
                    $a->creado_el ? Carbon::parse($a->creado_el)->format('d/m/Y H:i:s') : '',
                    $a->usuario ? trim($a->usuario->nombres . ' ' . $a->usuario->apellidos) : 'Sistema / Anónimo',
                    GestionauditoriaController::EVENTOS[$a->evento] ?? $a->evento,
                    $a->entidad ?? '',
                    $a->descripcion ?? '',
                    $a->ip ?? '',
                ]);
            });
    }

    public function headings(): array
    {
        return [
            'Fecha y hora',
            'Usuario',
            'Evento',
            'Entidad',
            'Descripción',
            'IP',
        ];
    }
}
