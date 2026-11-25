<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

/**
 * Abreviación del motivo por el que una solicitud se libera de un paquete.
 * Cada abreviación agrupa las explicaciones que puede tomar.
 */
class MotivoLiberacion extends Model
{
    use Auditable;

    protected $table = 'motivo_liberacion';

    public $timestamps = false;

    const CREATED_AT = 'creado_el';

    protected string $auditEtiqueta = 'Motivo de liberación';

    protected $fillable = [
        'abreviacion',
        'estado',
    ];

    protected $casts = [
        'estado'    => 'boolean',
        'creado_el' => 'datetime',
    ];

    public function explicaciones()
    {
        return $this->hasMany(MotivoLiberacionExplicacion::class, 'motivo_liberacion_id');
    }
}
