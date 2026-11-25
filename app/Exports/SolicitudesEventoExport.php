<?php

namespace App\Exports;

use App\Models\Solicitud;
use App\Support\CeldaExcel;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class SolicitudesEventoExport implements FromCollection, WithHeadings
{
    protected int $eventoId;

    public function __construct(int $eventoId)
    {
        $this->eventoId = $eventoId;
    }

    public function collection()
    {
        return Solicitud::with([
            'usuario',
            'ciudadano.tipoDocumento',
            'comuna',
            'barrio',
            'tipoTramite',
            'canal',
            'puntoAtencion',
        ])
            ->where('evento_id', $this->eventoId)
            ->orderByDesc('id')
            ->get()
            ->map(function ($s) {
                return CeldaExcel::fila([
                    'Asistencial'    => (string) trim(($s->usuario->nombres ?? '') . ' ' . ($s->usuario->apellidos ?? '')),
                    'Id_Radicado'    => ' ' . (string) ($s->id_SisbenApp ?? ''),
                    'Radicado'       => ' ' . (string) ($s->num_radicado ?? ''),
                    'Tramite'        => (string) ($s->tipoTramite->nombre ?? ''),
                    'Fecha'          => (string) ($s->creado_el ?? ''),
                    'Evento'          => (string) ($s->evento->nombre ?? ''),
                    'Canal'          => (string) ($s->canal->nombre ?? ''),
                    'Tipo_Documento' => (string) ($s->ciudadano->tipoDocumento->nombre ?? ''),
                    'Documento'      => ' ' . (string) ($s->ciudadano->num_documento ?? ''),
                    'Ciudadano'      => (string) ($s->ciudadano->nombre_completo ?? ''),
                    'Comuna'         => (string) ($s->comuna->nombre ?? ''),
                    'Barrio'         => (string) ($s->barrio->nombre ?? ''),
                    'Direccion'      => (string) ($s->direccion ?? ''),
                    'Observacion'    => (string) ($s->observacion ?? ''),
                ]);
            });
    }

    public function headings(): array
    {
        return [
            'Asistencial',
            'Id_Radicado',
            'Radicado',
            'Tramite',
            'Fecha',
            'Evento',
            'Canal',
            'Tipo_Documento',
            'Documento',
            'Ciudadano',
            'Comuna',
            'Barrio',
            'Direccion',
            'Observacion',
        ];
    }
}
