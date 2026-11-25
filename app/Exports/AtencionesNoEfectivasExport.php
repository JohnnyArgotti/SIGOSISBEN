<?php

namespace App\Exports;

use App\Models\Atencion;
use App\Support\CeldaExcel;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class AtencionesNoEfectivasExport implements FromCollection, WithHeadings
{
    protected $searchAtenciones;
    protected $filtroAsistencialAtencion;
    protected $fechaInicioAtencion;
    protected $fechaFinAtencion;

    public function __construct($searchAtenciones = null, $filtroAsistencialAtencion = null, $fechaInicioAtencion = null, $fechaFinAtencion = null)
    {
        $this->searchAtenciones = $searchAtenciones;
        $this->filtroAsistencialAtencion = $filtroAsistencialAtencion;
        $this->fechaInicioAtencion = $fechaInicioAtencion;
        $this->fechaFinAtencion = $fechaFinAtencion;
    }

    public function collection()
    {
        $query = Atencion::with([
            'usuario',
            'ciudadano.tipoDocumento',
            'tipoConsulta',
            'canal',
            'puntoAtencion',
            'evento',
            'comuna',
            'barrio',
        ]);

        if (!empty($this->searchAtenciones)) {
            $search = $this->searchAtenciones;
            $query->whereHas('ciudadano', function ($q) use ($search) {
                $q->where('nombre_completo', 'like', "%{$search}%")
                  ->orWhere('num_documento', 'like', "%{$search}%");
            });
        }

        if (!empty($this->filtroAsistencialAtencion)) {
            $filtro = $this->filtroAsistencialAtencion;
            $query->whereHas('usuario', function ($q) use ($filtro) {
                $q->whereRaw("CONCAT(nombres, ' ', apellidos) = ?", [$filtro]);
            });
        }

        if (!empty($this->fechaInicioAtencion) && !empty($this->fechaFinAtencion)) {
            $query->whereBetween('creado_el', [
                Carbon::parse($this->fechaInicioAtencion)->startOfDay(),
                Carbon::parse($this->fechaFinAtencion)->endOfDay(),
            ]);
        }

        return $query->orderByDesc('id')->get()->map(function ($a) {
            return CeldaExcel::fila([
                'Asistencial'               => (string)trim(($a->usuario->nombres ?? '') . ' ' . ($a->usuario->apellidos ?? '')),
                'Fecha de registro'         => (string)($a->creado_el ?? ''),
                'Tipo de consulta'          => (string)($a->tipoConsulta->nombre ?? ''),
                'Punto de atención / Evento' => (string)($a->puntoAtencion->nombre ?? $a->evento->nombre ?? ''),
                'Canal'                     => (string)($a->canal->nombre ?? ''),
                'Tipo de documento'         => (string)($a->ciudadano->tipoDocumento->nombre ?? ''),
                'Nro Documento'             => " " . (string)($a->ciudadano->num_documento ?? ''),
                'Solicitante'               => (string)($a->ciudadano->nombre_completo ?? ''),
                'Comuna'                    => (string)($a->comuna->nombre ?? ''),
                'Barrio'                    => (string)($a->barrio->nombre ?? ''),
            ]);
        });
    }

    public function headings(): array
    {
        return [
            'Asistencial',
            'Fecha de registro',
            'Tipo de consulta',
            'Punto de atención / Evento',
            'Canal',
            'Tipo de documento',
            'Nro Documento',
            'Solicitante',
            'Comuna',
            'Barrio',
        ];
    }
}
