<?php

namespace App\Exports;

use App\Support\CeldaExcel;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Spatie\Permission\Models\Role;

class RolesExport implements FromCollection, WithHeadings
{
    public function collection()
    {
        return Role::with('permissions')
            ->where('name', '!=', 'Administrador')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function ($r) {
                return CeldaExcel::fila([
                    'ID'          => (int)($r->id ?? 0),
                    'Nombre'      => (string)($r->name ?? ''),
                    'Permisos'    => $r->permissions->pluck('name')->implode(', ') ?: 'Sin permisos',
                    'Estado'      => $r->estado ? 'Activo' : 'Inactivo',
                    'Creado'      => $r->created_at
                        ? Carbon::parse($r->created_at)->format('d/m/Y')
                        : '-',
                    'Actualizado' => $r->updated_at
                        ? Carbon::parse($r->updated_at)->format('d/m/Y')
                        : '-',
                ]);
            });
    }

    public function headings(): array
    {
        return [
            'ID',
            'Nombre',
            'Permisos',
            'Estado',
            'Creado',
            'Actualizado',
        ];
    }
}
