<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentoSisben extends Model
{
    protected $table = 'documentos_sisben';

    protected $fillable = [
        'solicitud_id',
        'nombre_original',
        'mime_type',
        'tamano_bytes',
        'hash_sha256',
        'ruta_archivo',
    ];

    public function solicitud()
    {
        return $this->belongsTo(Solicitud::class, 'solicitud_id');
    }
}
