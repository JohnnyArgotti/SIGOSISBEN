<?php

namespace App\Exports;

use App\Models\Solicitud;
use App\Support\CeldaExcel;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class SolicitudesEfectivasExport implements FromCollection, WithHeadings
{
    protected $searchSolicitudes;
    protected $filtroAsistencial;
    protected $fechaInicio;
    protected $fechaFin;

    public function __construct($searchSolicitudes = null, $filtroAsistencial = null, $fechaInicio = null, $fechaFin = null)
    {
        $this->searchSolicitudes = $searchSolicitudes;
        $this->filtroAsistencial = $filtroAsistencial;
        $this->fechaInicio = $fechaInicio;
        $this->fechaFin = $fechaFin;
    }

    public function collection()
    {
        $query = Solicitud::with([
            'usuario',
            'ciudadano.tipoDocumento',
            'comuna',
            'barrio',
            'tipoTramite',
            'canal',
            'puntoAtencion',
            'evento',
        ]);

        if (!empty($this->searchSolicitudes)) {
            $search = $this->searchSolicitudes;
            $query->whereHas('ciudadano', function ($q) use ($search) {
                $q->where('nombre_completo', 'like', "%{$search}%")
                  ->orWhere('num_documento', 'like', "%{$search}%");
            });
        }

        if (!empty($this->filtroAsistencial)) {
            $filtro = $this->filtroAsistencial;
            $query->whereHas('usuario', function ($q) use ($filtro) {
                $q->whereRaw("CONCAT(nombres, ' ', apellidos) = ?", [$filtro]);
            });
        }

        if (!empty($this->fechaInicio) && !empty($this->fechaFin)) {
            $query->whereBetween('creado_el', [
                Carbon::parse($this->fechaInicio)->startOfDay(),
                Carbon::parse($this->fechaFin)->endOfDay(),
            ]);
        }

        return $query->orderByDesc('id')->get()->map(function ($s) {
            return CeldaExcel::fila([
                'Asistencial'               => (string)trim(($s->usuario->nombres ?? '') . ' ' . ($s->usuario->apellidos ?? '')),
                'ID SisbenApp'              => " " . (string)($s->id_SisbenApp ?? ''),
                'Nro Radicado'              => " " . (string)($s->num_radicado ?? ''),
                'Tipo de trámite'           => (string)($s->tipoTramite->nombre ?? ''),
                'Fecha de registro'         => (string)($s->creado_el ?? ''),
                'Punto de atención / Evento' => (string)($s->puntoAtencion->nombre ?? $s->evento->nombre ?? ''),
                'Canal'                     => (string)($s->canal->nombre ?? ''),
                'Tipo de documento'         => (string)($s->ciudadano->tipoDocumento->nombre ?? ''),
                'Nro Documento'             => " " . (string)($s->ciudadano->num_documento ?? ''),
                'Solicitante'               => (string)($s->ciudadano->nombre_completo ?? ''),
                'Teléfono'                  => (string)($s->ciudadano->telefono ?? ''),
                'Dirección'                 => (string)($s->direccion ?? ''),
                'Comuna'                    => (string)($s->comuna->nombre ?? ''),
                'Barrio'                    => (string)($s->barrio->nombre ?? ''),
                'Observación'               => (string)($s->observacion ?? ''),
                'Estado'                    => (string)($s->estado_gestion ?? ''),
            ]);
        });
    }

    public function headings(): array
    {
        return [
            'Asistencial',
            'ID SisbenApp',
            'Nro Radicado',
            'Tipo de trámite',
            'Fecha de registro',
            'Punto de atención / Evento',
            'Canal',
            'Tipo de documento',
            'Nro Documento',
            'Solicitante',
            'Teléfono',
            'Dirección',
            'Comuna',
            'Barrio',
            'Observación',
            'Estado',
        ];
    }
}
