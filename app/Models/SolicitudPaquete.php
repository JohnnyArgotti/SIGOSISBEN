<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Estancia de una solicitud dentro de un paquete.
 *
 * Se abre una fila cuando la solicitud entra al paquete y se cierra
 * (`liberada_en`) cuando sale, guardando el motivo si la salida fue una
 * liberación manual. Recorrer las filas de una solicitud ordenadas por
 * `asignada_en` reconstruye por qué paquetes pasó y por qué salió de cada uno.
 *
 * No usa el trait Auditable: la tabla ya es en sí misma un registro histórico
 * inmutable, auditarla duplicaría la información.
 */
class SolicitudPaquete extends Model
{
    protected $table = 'solicitud_paquete';

    public $timestamps = false;

    /** Liberación manual desde el detalle del paquete. Exige motivo. */
    public const SALIDA_LIBERADA = 'liberada';

    /** Movida a otro paquete para la segunda visita. */
    public const SALIDA_REASIGNADA = 'reasignada';

    /** El paquete completo se canceló y las solicitudes volvieron a campo. */
    public const SALIDA_PAQUETE_CANCELADO = 'paquete_cancelado';

    public const ETIQUETAS_SALIDA = [
        self::SALIDA_LIBERADA          => 'Liberada del paquete',
        self::SALIDA_REASIGNADA        => 'Reasignada a otro paquete',
        self::SALIDA_PAQUETE_CANCELADO => 'Paquete cancelado',
    ];

    protected $fillable = [
        'solicitud_id',
        'paquete_id',
        'encuestador_id',
        'asignada_en',
        'asignada_por',
        'liberada_en',
        'liberada_por',
        'salida_tipo',
        'motivo_liberacion_id',
        'motivo_explicacion_id',
        'motivo_abreviacion',
        'motivo_explicacion',
    ];

    protected $casts = [
        'asignada_en' => 'datetime',
        'liberada_en' => 'datetime',
    ];

    public function solicitud()
    {
        return $this->belongsTo(Solicitud::class);
    }

    public function paquete()
    {
        return $this->belongsTo(Paquete::class);
    }

    public function encuestador()
    {
        return $this->belongsTo(Encuestador::class);
    }

    public function asignadaPor()
    {
        return $this->belongsTo(User::class, 'asignada_por');
    }

    public function liberadaPor()
    {
        return $this->belongsTo(User::class, 'liberada_por');
    }

    /**
     * Abre la estancia de una solicitud en un paquete.
     *
     * @param  int|int[]  $solicitudIds  Una o varias solicitudes que entran al mismo paquete.
     */
    public static function abrir($solicitudIds, Paquete $paquete): void
    {
        $ids = array_values(array_unique((array) $solicitudIds));

        if ($ids === []) {
            return;
        }

        $ahora   = now();
        $usuario = auth()->id();

        self::insert(array_map(fn ($id) => [
            'solicitud_id'   => $id,
            'paquete_id'     => $paquete->id,
            'encuestador_id' => $paquete->encuestador_id,
            'asignada_en'    => $ahora,
            'asignada_por'   => $usuario,
        ], $ids));
    }

    /**
     * Cierra la estancia abierta de una solicitud.
     *
     * Si no hubiera estancia abierta (datos previos a la trazabilidad), se crea
     * una ya cerrada a partir del paquete actual para no perder el motivo.
     */
    public static function cerrar(Solicitud $solicitud, string $salidaTipo, ?MotivoLiberacionExplicacion $explicacion = null): void
    {
        $cierre = [
            'liberada_en'           => now(),
            'liberada_por'          => auth()->id(),
            'salida_tipo'           => $salidaTipo,
            'motivo_liberacion_id'  => $explicacion?->motivo_liberacion_id,
            'motivo_explicacion_id' => $explicacion?->id,
            'motivo_abreviacion'    => $explicacion?->motivo?->abreviacion,
            'motivo_explicacion'    => $explicacion?->explicacion,
        ];

        $afectadas = self::where('solicitud_id', $solicitud->id)
            ->whereNull('liberada_en')
            ->update($cierre);

        if ($afectadas === 0 && $solicitud->paquete_id) {
            self::create($cierre + [
                'solicitud_id'   => $solicitud->id,
                'paquete_id'     => $solicitud->paquete_id,
                'encuestador_id' => $solicitud->paquete?->encuestador_id,
                'asignada_en'    => now(),
                'asignada_por'   => null,
            ]);
        }
    }
}
