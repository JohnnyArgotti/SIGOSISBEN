<?php

namespace App\Exports;

use App\Models\Paquete;
use App\Support\CeldaExcel;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class PaquetesExport implements FromCollection, WithHeadings
{
    protected $search;
    protected $encuestadorId;
    protected $fechaInicio;
    protected $fechaFin;

    public function __construct($search = null, $encuestadorId = null, $fechaInicio = null, $fechaFin = null)
    {
        $this->search       = $search;
        $this->encuestadorId = $encuestadorId;
        $this->fechaInicio  = $fechaInicio;
        $this->fechaFin     = $fechaFin;
    }

    public function collection()
    {
        $query = Paquete::query()
            ->with([
                'usuario:id,nombres,apellidos',
                'encuestador:id,nombres,apellidos',
            ])
            ->select(['id', 'usuario_id', 'encuestador_id', 'creado_el', 'estado']);

        if (!empty($this->search)) {
            $query->where('id', 'like', "%{$this->search}%");
        }

        if (!empty($this->encuestadorId)) {
            $query->where('encuestador_id', $this->encuestadorId);
        }

        if (!empty($this->fechaInicio)) {
            $query->whereDate('creado_el', '>=', $this->fechaInicio);
        }

        if (!empty($this->fechaFin)) {
            $query->whereDate('creado_el', '<=', $this->fechaFin);
        }

        return $query->orderByDesc('id')->get()->map(function ($p) {
            return CeldaExcel::fila([
                'Código'         => '#' . (string)($p->id ?? ''),
                'Creado por'     => $p->usuario
                    ? trim($p->usuario->nombres . ' ' . $p->usuario->apellidos)
                    : '-',
                'Asignado a'     => $p->encuestador
                    ? trim($p->encuestador->nombres . ' ' . $p->encuestador->apellidos)
                    : '-',
                'Fecha de creación' => $p->creado_el
                    ? Carbon::parse($p->creado_el)->format('d/m/Y H:i')
                    : '-',
            ]);
        });
    }

    public function headings(): array
    {
        return [
            'Código',
            'Creado por',
            'Asignado a',
            'Fecha de creación',
        ];
    }
}
