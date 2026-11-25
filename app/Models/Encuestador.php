<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

class Encuestador extends Model
{
    use Auditable;

    protected $table = 'encuestador';

    // Eloquent gestiona las marcas de tiempo: PostgreSQL no actualiza
    // `actualizado_el` por sí solo y sin ellas una edición no deja rastro.
    public $timestamps = true;

    const CREATED_AT = 'creado_el';
    const UPDATED_AT = 'actualizado_el';

    protected string $auditEtiqueta = 'Encuestador';

    protected $fillable = [
        'tipo_documento_id',
        'num_documento',
        'nombres',
        'apellidos',
        'telefono',
        'estado'
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($encuestador) {
            $num = (static::max('id') ?? 0) + 1;
            $encuestador->codigo = 'ENC-' . str_pad($num, 3, '0', STR_PAD_LEFT);
        });
    }

    public function tipoDocumento()
    {
        return $this->belongsTo(TipoDocumento::class);
    }

    public function paquetes()
    {
        return $this->hasMany(Paquete::class);
    }
}
