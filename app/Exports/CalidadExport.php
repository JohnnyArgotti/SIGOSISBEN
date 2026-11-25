<?php

namespace App\Exports;

use App\Http\Controllers\GestioncalidadController;
use App\Models\Solicitud;
use App\Support\CeldaExcel;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class CalidadExport implements FromCollection, WithHeadings
{
    protected $search;
    protected $estado;
    protected $fechaInicio;
    protected $fechaFin;
    protected $paqueteId;

    public function __construct($search = null, $estado = null, $fechaInicio = null, $fechaFin = null, $paqueteId = null)
    {
        $this->search      = $search;
        $this->estado      = $estado;
        $this->fechaInicio = $fechaInicio;
        $this->fechaFin    = $fechaFin;
        $this->paqueteId   = $paqueteId;
    }

    public function collection()
    {
        $query = Solicitud::query()
            ->with([
                'ciudadano:id,nombre_completo,num_documento',
                'barrio:id,nombre',
                'comuna:id,nombre',
                'gestionSistema.usuario:id,nombres,apellidos',
            ])
            ->select([
                'id',
                'id_SisbenApp',
                'num_radicado',
                'ciudadano_id',
                'barrio_id',
                'comuna_id',
                'estado_gestion',
                'paquete_id',
                'fecha_notificacion',
                'creado_el',
            ])
            ->whereIn('estado_gestion', GestioncalidadController::ESTADOS_VISIBLES);

        if (!empty($this->paqueteId)) {
            $query->where('paquete_id', $this->paqueteId);
        }

        if (!empty($this->search)) {
            $search = $this->search;
            $query->where(function ($q) use ($search) {
                $q->where('num_radicado', 'like', "%{$search}%")
                  ->orWhereHas('ciudadano', function ($c) use ($search) {
                      $c->where('num_documento', 'like', "%{$search}%")
                        ->orWhere('nombre_completo', 'like', "%{$search}%");
                  });
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

        return $query
            ->orderByRaw('COALESCE(fecha_ejecucion, fecha_notificacion) DESC NULLS LAST')
            ->orderByDesc('id')
            ->get()->map(function ($s) {
            $gs = $s->gestionSistema;
            return CeldaExcel::fila([
                'ID SisbenApp'       => (string)($s->id_SisbenApp ?? '-'),
                'N° Radicado'        => " " . (string)($s->num_radicado ?? ''),
                'Paquete'            => $s->paquete_id ?? '-',
                'N° Documento'       => " " . (string)($s->ciudadano->num_documento ?? ''),
                'Nombre Solicitante' => (string)($s->ciudadano->nombre_completo ?? ''),
                'Comuna'             => (string)($s->comuna->nombre ?? '-'),
                'Barrio'             => (string)($s->barrio->nombre ?? '-'),
                'Estado de Gestión'  => (string)($s->estado_gestion ?? '-'),
                'Cant. Hogares'      => $gs?->cantidad_hogares ?? '-',
                'Categoría SISBÉN'   => (string)($gs?->categoria_sisben ?? '-'),
                'Registrado por'     => $gs && $gs->usuario
                    ? trim($gs->usuario->nombres . ' ' . $gs->usuario->apellidos)
                    : '-',
                'Fecha Resolución'   => $gs?->fecha_resolucion
                    ? Carbon::parse($gs->fecha_resolucion)->format('d/m/Y')
                    : '-',
                'Observación DNP'    => (string)($gs?->observacion_dnp ?? '-'),
            ]);
        });
    }

    public function headings(): array
    {
        return [
            'ID SisbenApp',
            'N° Radicado',
            'Paquete',
            'N° Documento',
            'Nombre Solicitante',
            'Comuna',
            'Barrio',
            'Estado de Gestión',
            'Cant. Hogares',
            'Categoría SISBÉN',
            'Registrado por',
            'Fecha Resolución',
            'Observación DNP',
        ];
    }
}
