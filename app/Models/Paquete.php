<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

class Paquete extends Model
{
    use Auditable;

    protected $table = 'paquete';
    public $timestamps = false;

    protected string $auditEtiqueta = 'Paquete';

    /**
     * Estados de gestión en los que una solicitud del paquete todavía sigue en curso.
     * Cualquier otro estado (ejecutada, notificada, aprobada, rechazada, cancelada)
     * ya es un desenlace y cuenta como resuelta.
     */
    public const ESTADOS_SIN_RESOLVER = ['asignada', 'entregada', 'pendiente'];

    protected $fillable = [
        'usuario_id',
        'encuestador_id',
        'estado',
    ];

    public function usuario()
    {
        return $this->belongsTo(User::class);
    }

    public function encuestador()
    {
        return $this->belongsTo(Encuestador::class);
    }

    public function solicitudes()
    {
        return $this->hasMany(Solicitud::class);
    }
}
