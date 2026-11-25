<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

class GestionSistema extends Model
{
    use Auditable;

    protected $table = 'gestion_sistema';
    protected $primaryKey = 'id';

    // Eloquent gestiona las marcas de tiempo: el plazo de edición del hogar se
    // calcula sobre `creado_el`, que debe quedar en la zona horaria de la app
    // (PostgreSQL no aplica `useCurrentOnUpdate` sobre `actualizado_el`).
    public $timestamps = true;

    const CREATED_AT = 'creado_el';
    const UPDATED_AT = 'actualizado_el';

    protected string $auditEtiqueta = 'Gestión del Sistema';

    protected $fillable = [
        'solicitud_id',
        'usuario_id',
        'cantidad_hogares',
        'categoria_sisben',
        'estado',
        'observacion_dnp',
        'fecha_resolucion',
    ];

    protected $casts = [
        'fecha_resolucion' => 'datetime',
        'cantidad_hogares' => 'integer',
    ];

    public function solicitud()
    {
        return $this->belongsTo(Solicitud::class, 'solicitud_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function documento()
    {
        return $this->hasOne(DocumentoSisben::class, 'solicitud_id', 'solicitud_id');
    }
}
