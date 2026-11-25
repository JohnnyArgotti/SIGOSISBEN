<?php

namespace App\Exports;

use App\Models\Paquete;
use App\Models\Solicitud;
use App\Support\CeldaExcel;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class PaqueteSolicitudesExport implements FromCollection, WithHeadings
{
    protected int $paqueteId;

    public function __construct(int $paqueteId)
    {
        $this->paqueteId = $paqueteId;
    }

    public function collection()
    {
        $paquete = Paquete::with('encuestador:id,codigo,nombres,apellidos')
            ->find($this->paqueteId);

        $codigoEncuestador = $paquete?->encuestador->codigo ?? '';
        $nombreEncuestador = $paquete?->encuestador
            ? trim($paquete->encuestador->nombres . ' ' . $paquete->encuestador->apellidos)
            : '';

        return Solicitud::with([
            'comuna:id,nombre',
            'barrio:id,nombre',
        ])
            ->where('paquete_id', $this->paqueteId)
            ->orderByDesc('id')
            ->get()
            ->values()
            ->map(function ($s, $index) use ($codigoEncuestador, $nombreEncuestador) {
                return CeldaExcel::fila([
                    '#'                  => $index + 1,
                    'Nro Radicado'       => ' ' . (string) ($s->num_radicado ?? ''),
                    'ID SisbenApp'       => ' ' . (string) ($s->id_SisbenApp ?? ''),
                    'Comuna'             => (string) ($s->comuna->nombre ?? ''),
                    'Barrio'             => (string) ($s->barrio->nombre ?? ''),
                    'Código encuestador' => $codigoEncuestador,
                    'Nombre encuestador' => $nombreEncuestador,
                    'Estado'             => (string) ($s->estado_gestion ?? ''),
                ]);
            });
    }

    public function headings(): array
    {
        return [
            ['Paquete #' . $this->paqueteId],
            [
                '#',
                'Nro Radicado',
                'ID SisbenApp',
                'Comuna',
                'Barrio',
                'Código encuestador',
                'Nombre encuestador',
                'Estado',
            ],
        ];
    }
}
