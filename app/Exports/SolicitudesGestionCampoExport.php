<?php

namespace App\Exports;

use App\Models\Solicitud;
use App\Support\CeldaExcel;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class SolicitudesGestionCampoExport implements FromCollection, WithHeadings
{
    protected $search;
    protected $estado;
    protected $fechaInicio;
    protected $fechaFin;

    public function __construct($search = null, $estado = null, $fechaInicio = null, $fechaFin = null)
    {
        $this->search = $search;
        $this->estado = $estado;
        $this->fechaInicio = $fechaInicio;
        $this->fechaFin = $fechaFin;
    }

    
    private function calcularDiasLaborales($fechaInicio, $fechaFin)
    {
        if (empty($fechaInicio) || empty($fechaFin)) {
            return 0;
        }

        try {
            $inicio = Carbon::parse($fechaInicio);
            $fin = Carbon::parse($fechaFin);

            if ($fin->isBefore($inicio)) {
                return 0;
            }

            $diasLaborales = 0;
            $actual = $inicio->copy();

            while ($actual <= $fin) {

                if (!$actual->isWeekend()) {
                    $diasLaborales++;
                }
                $actual->addDay();
            }

            return $diasLaborales;
        } catch (\Exception $e) {
            return 0;
        }
    }

    public function collection()
    {
        $query = Solicitud::with([
            'paquete.encuestador',
            'ciudadano.tipoDocumento',
            'tipoTramite',
            'puntoAtencion',
            'evento',
            'canal',
            'comuna',
            'barrio',
        ])
        ->whereNotIn('estado_gestion', ['registrada']);

        if (!empty($this->search)) {
            $search = $this->search;
            $query->whereHas('ciudadano', function ($q) use ($search) {
                $q->where('nombre_completo', 'like', "%{$search}%")
                  ->orWhere('num_documento', 'like', "%{$search}%");
            });
        }

        if (!empty($this->estado)) {
            $query->where('estado_gestion', $this->estado);
        }

        if (!empty($this->fechaInicio) && !empty($this->fechaFin)) {
            $query->whereBetween('creado_el', [
                Carbon::parse($this->fechaInicio)->startOfDay(),
                Carbon::parse($this->fechaFin)->endOfDay(),
            ]);
        }

        return $query->orderByDesc('id')->get()->map(function ($s) {
            $fechaRespuesta = '';
            if (!empty($s->fecha_notificacion)) {
                $fechaRespuesta = (string)$s->fecha_notificacion;
            } elseif (!empty($s->fecha_ejecucion)) {
                $fechaRespuesta = (string)$s->fecha_ejecucion;
            }

            $codigoEncuestador = $s->paquete && $s->paquete->encuestador
                ? (string)($s->paquete->encuestador->codigo ?? '')
                : '';

            $nombreEncuestador = $s->paquete && $s->paquete->encuestador
                ? trim(($s->paquete->encuestador->nombres ?? '') . ' ' . ($s->paquete->encuestador->apellidos ?? ''))
                : '';

            $codigoPaquete = $s->paquete ? '#' . (string)($s->paquete->id ?? '') : '';

            return CeldaExcel::fila([
                'ID SisbenApp'           => " " . (string)($s->id_SisbenApp ?? ''),
                'Nro Radicado'           => " " . (string)($s->num_radicado ?? ''),
                'Tipo de trámite'        => (string)($s->tipoTramite->nombre ?? ''),
                'Fecha de registro'      => (string)($s->creado_el ?? ''),
                'Fecha de respuesta'     => $fechaRespuesta,
                'Nro Documento'          => " " . (string)($s->ciudadano->num_documento ?? ''),
                'Solicitante'            => (string)($s->ciudadano->nombre_completo ?? ''),
                'Dirección'              => (string)($s->direccion ?? ''),
                'Comuna'                 => (string)($s->comuna->nombre ?? ''),
                'Barrio'                 => (string)($s->barrio->nombre ?? ''),
                'Paquete'                => $codigoPaquete,
                'Código encuestador'     => $codigoEncuestador,
                'Nombre encuestador'     => $nombreEncuestador,
                'Fecha de ejecución'     => (string)($s->fecha_ejecucion ?? ''),
                'Fecha de notificación'  => (string)($s->fecha_notificacion ?? ''),
                'Fecha primera visita'   => (string)($s->fecha_visita1 ?? ''),
                'Motivo primera visita'  => (string)($s->motivo_visita1 ?? ''),
                'Fecha segunda visita'   => (string)($s->fecha_visita2 ?? ''),
                'Motivo segunda visita'  => (string)($s->motivo_visita2 ?? ''),
                'Observación'            => (string)($s->observacion ?? ''),
                'Estado'                 => (string)($s->estado_gestion ?? ''),
            ]);
        });
    }

    public function headings(): array
    {
        return [
            'ID SisbenApp',
            'Nro Radicado',
            'Tipo de trámite',
            'Fecha de registro',
            'Fecha de respuesta',
            'Nro Documento',
            'Solicitante',
            'Dirección',
            'Comuna',
            'Barrio',
            'Paquete',
            'Código encuestador',
            'Nombre encuestador',
            'Fecha de ejecución',
            'Fecha de notificación',
            'Fecha primera visita',
            'Motivo primera visita',
            'Fecha segunda visita',
            'Motivo segunda visita',
            'Observación',
            'Estado',
        ];
    }
}
