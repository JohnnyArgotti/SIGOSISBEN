<?php

namespace App\Exports;

use App\Models\Evento;
use App\Support\CeldaExcel;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class EventosExport implements FromCollection, WithHeadings
{
    protected $search;

    public function __construct($search = null)
    {
        $this->search = $search;
    }

    public function collection()
    {
        $query = Evento::with([
            'responsable:id,nombres,apellidos',
            'comuna:id,nombre',
            'barrio:id,nombre',
        ])->orderBy('fecha', 'desc')->orderBy('hora_inicio', 'desc');

        if (!empty($this->search)) {
            $search = $this->search;
            $query->where('nombre', 'like', "%{$search}%");
        }

        return $query->get()->map(function ($e) {
            $estadoLabels = [
                'programado' => 'Programado',
                'en_curso'   => 'En curso',
                'realizado'  => 'Realizado',
                'cancelado'  => 'Cancelado',
            ];

            return CeldaExcel::fila([
                'Nombre'       => (string)($e->nombre ?? ''),
                'Responsable'  => $e->responsable
                    ? trim($e->responsable->nombres . ' ' . $e->responsable->apellidos)
                    : '-',
                'Entidad'      => (string)($e->entidad_organizadora ?? '-'),
                'Fecha'        => $e->fecha
                    ? Carbon::parse($e->fecha)->format('d/m/Y')
                    : '-',
                'Horario'      => trim(($e->hora_inicio ? substr($e->hora_inicio, 0, 5) : '-') . ' – ' . ($e->hora_fin ? substr($e->hora_fin, 0, 5) : '-')),
                'Ubicación'    => trim(($e->comuna->nombre ?? '-') . ' / ' . ($e->barrio->nombre ?? '-') . ' — ' . ($e->direccion ?? '')),
                'Estado'       => $estadoLabels[$e->estado_evento] ?? ($e->estado_evento ?? '-'),
            ]);
        });
    }

    public function headings(): array
    {
        return [
            'Nombre',
            'Responsable',
            'Entidad',
            'Fecha',
            'Horario',
            'Ubicación',
            'Estado',
        ];
    }
}
