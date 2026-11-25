<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Auditoria extends Model
{
    protected $table = 'auditoria';
    protected $primaryKey = 'id';

    // Registro inmutable: solo se gestiona la fecha de creación.
    public $timestamps = false;

    const CREATED_AT = 'creado_el';

    protected $fillable = [
        'usuario_id',
        'evento',
        'entidad',
        'entidad_id',
        'valores_anteriores',
        'valores_nuevos',
        'descripcion',
        'ip',
        'metodo_http',
    ];

    protected $casts = [
        'valores_anteriores' => 'array',
        'valores_nuevos'     => 'array',
        'creado_el'          => 'datetime',
    ];

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
