<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

class Atencion extends Model
{
    use Auditable;

    protected $table = 'atencion';

    // Eloquent gestiona las marcas de tiempo: PostgreSQL no actualiza
    // `actualizado_el` por sí solo y sin ellas una edición no deja rastro.
    public $timestamps = true;

    const CREATED_AT = 'creado_el';
    const UPDATED_AT = 'actualizado_el';

    protected string $auditEtiqueta = 'Atención';

    protected $fillable = [
        'usuario_id',
        'fecha',
        'tipo_consulta_id',
        'punto_atencion_id',
        'evento_id',
        'ciudadano_id',
        'comuna_id',
        'barrio_id',
        'canal_id',
    ];

    public function usuario()
    {
        return $this->belongsTo(User::class);
    }

    public function ciudadano()
    {
        return $this->belongsTo(Ciudadano::class);
    }

    public function puntoAtencion()
    {
        return $this->belongsTo(PuntoAtencion::class);
    }

    public function evento()
    {
        return $this->belongsTo(Evento::class, 'evento_id');
    }

    public function comuna()
    {
        return $this->belongsTo(Comuna::class);
    }

    public function barrio()
    {
        return $this->belongsTo(Barrio::class);
    }

    public function tipoConsulta()
    {
        return $this->belongsTo(TipoConsulta::class, 'tipo_consulta_id');
    }

    public function canal()
    {
        return $this->belongsTo(Canal::class, 'canal_id');
    }
}