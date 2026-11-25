<?php

namespace App\Exports;

use App\Models\Encuestador;
use App\Support\CeldaExcel;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class EncuestadoresExport implements FromCollection, WithHeadings
{
    protected $search;

    public function __construct($search = null)
    {
        $this->search = $search;
    }

    public function collection()
    {
        $query = Encuestador::with('tipoDocumento')
            ->orderByDesc('id');

        if (!empty($this->search)) {
            $search = $this->search;
            $query->where(function ($q) use ($search) {
                $q->where('codigo', 'like', "%{$search}%")
                  ->orWhere('num_documento', 'like', "%{$search}%");
            });
        }

        return $query->get()->map(function ($e) {
            return CeldaExcel::fila([
                'Código'           => (string)($e->codigo ?? ''),
                'Tipo de Documento' => (string)($e->tipoDocumento->codigo ?? '-'),
                'Nro Documento'    => " " . (string)($e->num_documento ?? ''),
                'Nombres'          => (string)($e->nombres ?? ''),
                'Apellidos'        => (string)($e->apellidos ?? ''),
                'Teléfono'         => (string)($e->telefono ?? '-'),
                'Estado'           => $e->estado ? 'Activo' : 'Inactivo',
                'Creado'           => $e->creado_el
                    ? Carbon::parse($e->creado_el)->format('d/m/Y')
                    : '-',
                'Actualizado'      => $e->actualizado_el
                    ? Carbon::parse($e->actualizado_el)->format('d/m/Y')
                    : '-',
            ]);
        });
    }

    public function headings(): array
    {
        return [
            'Código',
            'Tipo de Documento',
            'Nro Documento',
            'Nombres',
            'Apellidos',
            'Teléfono',
            'Estado',
            'Creado',
            'Actualizado',
        ];
    }
}
