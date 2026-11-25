<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

class Comuna extends Model
{
    use Auditable;

    protected $table = 'comuna';
    public $timestamps = false;

    protected $fillable = ['nombre', 'estado'];

    public function barrios()
    {
        return $this->hasMany(Barrio::class);
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
