<?php

namespace App\Exports;

use App\Models\Atencion;
use App\Support\CeldaExcel;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class AtencionesEventoExport implements FromCollection, WithHeadings
{
    protected int $eventoId;

    public function __construct(int $eventoId)
    {
        $this->eventoId = $eventoId;
    }

    public function collection()
    {
        return Atencion::with([
            'usuario',
            'ciudadano.tipoDocumento',
            'tipoConsulta',
            'canal',
            'puntoAtencion',
            'comuna',
            'barrio',
        ])
            ->where('evento_id', $this->eventoId)
            ->orderByDesc('id')
            ->get()
            ->map(function ($a) {
                return CeldaExcel::fila([
                    'Asistencial'    => (string) trim(($a->usuario->nombres ?? '') . ' ' . ($a->usuario->apellidos ?? '')),
                    'Consulta'       => (string) ($a->tipoConsulta->nombre ?? ''),
                    'Fecha'          => (string) ($a->creado_el ?? ''),
                    'Evento'          => (string) ($a->evento->nombre ?? ''),
                    'Canal'          => (string) ($a->canal->nombre ?? ''),
                    'Tipo_Documento' => (string) ($a->ciudadano->tipoDocumento->nombre ?? ''),
                    'Documento'      => "'" . (string) ($a->ciudadano->num_documento ?? ''),
                    'Ciudadano'      => (string) ($a->ciudadano->nombre_completo ?? ''),
                    'Comuna'         => (string) ($a->comuna->nombre ?? ''),
                    'Barrio'         => (string) ($a->barrio->nombre ?? ''),
                    'Observacion'    => (string) ($a->observacion ?? ''),
                ]);
            });
    }

    public function headings(): array
    {
        return [
            'Asistencial',
            'Consulta',
            'Fecha',
            'Evento',
            'Canal',
            'Tipo_Documento',
            'Documento',
            'Ciudadano',
            'Comuna',
            'Barrio',
            'Observacion',
        ];
    }
}
