<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

class Ciudadano extends Model
{
    use Auditable;

    protected $table = 'ciudadano';
    public $timestamps = false;

    protected string $auditEtiqueta = 'Ciudadano';

    protected $fillable = [
        'nombre_completo',
        'tipo_documento_id',
        'num_documento',
        'telefono',
        'estado'
    ];

    public function comuna()
    {
        return $this->belongsTo(Comuna::class);
    }

    public function barrio()
    {
        return $this->belongsTo(Barrio::class);
    }

    public function tipoDocumento()
    {
        return $this->belongsTo(TipoDocumento::class);
    }

    public function solicitudes()
    {
        return $this->hasMany(Solicitud::class);
    }

    public function atenciones()
    {
        return $this->hasMany(PuntoAtencion::class);
    }
}
