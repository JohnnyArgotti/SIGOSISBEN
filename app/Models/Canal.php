<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Canal extends Model
{
    protected $table = 'canal';

    protected $fillable = [
        'nombre',
        'estado'
    ];

    const CREATED_AT = 'creado_el';
    const UPDATED_AT = 'actualizado_el';

    public function Solicitud()
    {
        return $this->hasMany(Solicitud::class);
    }
}