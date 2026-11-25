<?php

namespace App\Exports;

use App\Models\User;
use App\Support\CeldaExcel;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class UsuariosExport implements FromCollection, WithHeadings
{
    protected $search;

    public function __construct($search = null)
    {
        $this->search = $search;
    }

    public function collection()
    {
        $query = User::query()
            ->leftJoin('tipo_documento as td', 'usuario.tipo_documento_id', '=', 'td.id')
            ->select(
                'usuario.id',
                'usuario.num_documento',
                'usuario.nombres',
                'usuario.apellidos',
                'usuario.correo',
                'usuario.telefono',
                'usuario.nombre_usuario',
                'usuario.autenticacion_ad',
                'usuario.estado',
                'usuario.creado_el',
                'usuario.actualizado_el',
                'td.nombre as tipo_documento',
            )
            ->orderByDesc('usuario.id');

        if (!empty($this->search)) {
            $search = $this->search;
            $query->where(function ($q) use ($search) {
                $q->where('usuario.num_documento', 'like', "%{$search}%")
                  ->orWhere('usuario.nombre_usuario', 'like', "%{$search}%");
            });
        }

        return $query->get()->map(function ($u) {
            $roles = User::find($u->id)->getRoleNames()->implode(', ');
            return CeldaExcel::fila([
                $u->tipo_documento ?? '-',
                $u->num_documento ?? '',
                $u->nombres,
                $u->apellidos,
                $u->correo ?? '',
                $u->telefono ?? '',
                $u->nombre_usuario,
                $u->autenticacion_ad ? 'Directorio Activo' : 'Local',
                $u->creado_el ? \Carbon\Carbon::parse($u->creado_el)->format('d/m/Y') : '',
                $u->actualizado_el ? \Carbon\Carbon::parse($u->actualizado_el)->format('d/m/Y') : '',
                $u->estado ? 'Activo' : 'Inactivo',
                $roles ?: 'Sin roles asignados',
            ]);
        });
    }

    public function headings(): array
    {
        return [
            'Tipo de documento',
            'Documento',
            'Nombres',
            'Apellidos',
            'Correo',
            'Teléfono',
            'Usuario',
            'Tipo de autenticación',
            'Creado',
            'Actualizado',
            'Estado',
            'Roles',
        ];
    }
}
