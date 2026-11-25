<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

class DocumentoPublico extends Model
{
    use Auditable;

    protected $table = 'documento_publico';

    protected $fillable = [
        'nombre',
        'enlace',
        'estado',
    ];

    protected $casts = [
        'estado' => 'boolean',
    ];

    public $timestamps = true;

    const CREATED_AT = 'creado_el';
    const UPDATED_AT = 'actualizado_el';

    protected string $auditEtiqueta = 'DocumentoPublico';
}
