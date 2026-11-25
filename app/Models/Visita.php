<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

class Visita extends Model
{
    use Auditable;

    protected $table = 'visita';

    public $timestamps = false;

    const CREATED_AT = 'creado_el';

    protected string $auditEtiqueta = 'Visita';

    protected $fillable = [
        'solicitud_id',
        'paquete_id',
        'encuestador_id',
        'registrada_por',
        'numero_visita',
        'fecha',
        'resultado',
        'motivo',
        'observacion',
        'fecha_notificacion',
    ];

    protected $casts = [
        'fecha'              => 'date',
        'fecha_notificacion' => 'date',
        'creado_el'          => 'datetime',
        'numero_visita'      => 'integer',
    ];

    public function solicitud()
    {
        return $this->belongsTo(Solicitud::class);
    }

    public function paquete()
    {
        return $this->belongsTo(Paquete::class);
    }

    public function encuestador()
    {
        return $this->belongsTo(Encuestador::class);
    }

    public function registradaPor()
    {
        return $this->belongsTo(User::class, 'registrada_por');
    }
}
