<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoConsulta extends Model
{
    protected $table = 'tipo_consulta';

    protected $fillable = [
        'nombre',
        'estado'
    ];

    const CREATED_AT = 'creado_el';
    const UPDATED_AT = 'actualizado_el';

    // Relación con solicitudes o tramites
    public function Atencion()
    {
        return $this->hasMany(Atencion::class);
    }
}