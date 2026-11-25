<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

/**
 * Explicación concreta asociada a una abreviación de motivo de liberación.
 */
class MotivoLiberacionExplicacion extends Model
{
    use Auditable;

    protected $table = 'motivo_liberacion_explicacion';

    public $timestamps = false;

    const CREATED_AT = 'creado_el';

    protected string $auditEtiqueta = 'Explicación de motivo de liberación';

    protected $fillable = [
        'motivo_liberacion_id',
        'explicacion',
        'estado',
    ];

    protected $casts = [
        'estado'    => 'boolean',
        'creado_el' => 'datetime',
    ];

    public function motivo()
    {
        return $this->belongsTo(MotivoLiberacion::class, 'motivo_liberacion_id');
    }
}
