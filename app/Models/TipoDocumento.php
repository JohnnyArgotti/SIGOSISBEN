<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoDocumento extends Model
{
    protected $table = 'tipo_documento';
    public $timestamps = false;

    protected $fillable = ['nombre', 'codigo', 'estado'];

    public function usuarios()
    {
        return $this->hasMany(User::class);
    }

    public function ciudadanos()
    {
        return $this->hasMany(Ciudadano::class);
    }

    public function encuestadores()
    {
        return $this->hasMany(Encuestador::class);
    }
}
