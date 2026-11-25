<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

class Barrio extends Model
{
    use Auditable;

    protected $table = 'barrio';
    public $timestamps = false;

    protected $fillable = ['nombre', 'estado', 'comuna_id'];


    public function comuna()
    {
        return $this->belongsTo(Comuna::class, 'comuna_id');
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