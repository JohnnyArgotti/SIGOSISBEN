<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoTramite extends Model
{
    protected $table = 'tipo_tramite';

    protected $fillable = [
        'nombre',
        'codigo',
        'estado'
    ];

    const CREATED_AT = 'creado_el';
    const UPDATED_AT = 'actualizado_el';

    // Relación con solicitudes o tramites
    public function Solicitud()
    {
        return $this->hasMany(Solicitud::class);
    }
}