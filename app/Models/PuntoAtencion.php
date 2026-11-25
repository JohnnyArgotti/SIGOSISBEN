<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

class PuntoAtencion extends Model
{
    use Auditable;

    protected $table = 'punto_atencion';

    protected $fillable = [
        'nombre',
        'estado'
    ];

    // Eloquent gestiona las marcas de tiempo: PostgreSQL no actualiza
    // `actualizado_el` por sí solo y sin ellas una edición no deja rastro.
    public $timestamps = true;

    const CREATED_AT = 'creado_el';
    const UPDATED_AT = 'actualizado_el';

    protected string $auditEtiqueta = 'PuntoAtencion';
}