<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;
use Carbon\Carbon;

class Solicitud extends Model
{
    use Auditable;

    protected $table = 'solicitud';

    protected $primaryKey = 'id';

    public $timestamps = false;

    protected string $auditEtiqueta = 'Solicitud';

    protected $fillable = [
        'usuario_id',
        'id_SisbenApp',
        'num_radicado',
        'tipo_tramite_id',
        'punto_atencion_id',
        'evento_id',
        'ciudadano_id',
        'comuna_id',
        'barrio_id',
        'canal_id',
        'observacion',
        'direccion',
        'paquete_id',
        'fecha_ejecucion',
        'fecha_notificacion',
        'estado',
        'estado_gestion',
        'reservada_por',
        'reservada_en',
        'cancelada_por',
        'cancelada_en',
        'motivo_cancelacion',
        'cancelada_desde',
    ];

    /**
     * Campos heredados que ya no se escriben desde código nuevo.
     * Los datos de visita viven en la tabla `visita` (modelo Visita).
     * Se excluyen de la auditoría para evitar ruido en el log de cambios.
     */
    protected array $auditExcluir = [
        'fecha_visita1',
        'motivo_visita1',
        'observacion_visita1',
        'fecha_visita2',
        'motivo_visita2',
        'observacion_visita2',
        'reservada_por',
        'reservada_en',
        'cancelada_por',
        'cancelada_en',
    ];

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function canceladaPor()
    {
        return $this->belongsTo(User::class, 'cancelada_por');
    }

    public function ciudadano()
    {
        return $this->belongsTo(Ciudadano::class, 'ciudadano_id');
    }

    public function comuna()
    {
        return $this->belongsTo(Comuna::class, 'comuna_id');
    }

    public function barrio()
    {
        return $this->belongsTo(Barrio::class, 'barrio_id');
    }

    public function puntoAtencion()
    {
        return $this->belongsTo(PuntoAtencion::class, 'punto_atencion_id');
    }

    public function evento()
    {
        return $this->belongsTo(Evento::class, 'evento_id');
    }

    public function tipoTramite()
    {
        return $this->belongsTo(TipoTramite::class, 'tipo_tramite_id');
    }

    public function canal()
    {
        return $this->belongsTo(Canal::class, 'canal_id');
    }

    public function paquete()
    {
        return $this->belongsTo(Paquete::class, 'paquete_id');
    }

    public function gestionSistema()
    {
        return $this->hasOne(GestionSistema::class, 'solicitud_id');
    }

    public function visitas()
    {
        return $this->hasMany(Visita::class)->orderBy('numero_visita');
    }

    /** Historial de paquetes por los que ha pasado la solicitud, del más antiguo al más reciente. */
    public function estanciasPaquete()
    {
        return $this->hasMany(SolicitudPaquete::class)->orderBy('asignada_en')->orderBy('id');
    }

    public function visita1()
    {
        return $this->hasOne(Visita::class)->where('numero_visita', 1);
    }

    public function visita2()
    {
        return $this->hasOne(Visita::class)->where('numero_visita', 2);
    }

    /** Datos de cancelación formateados para la vista (null si no está cancelada). */
    public function cancelacionVista(): ?array
    {
        if ($this->estado_gestion !== 'cancelada') {
            return null;
        }

        $modulos = [
            'puntos' => 'Gestión de solicitudes',
        ];

        return [
            'por'    => $this->canceladaPor
                ? trim(($this->canceladaPor->nombres ?? '') . ' ' . ($this->canceladaPor->apellidos ?? ''))
                : null,
            'en'     => $this->cancelada_en
                ? Carbon::parse($this->cancelada_en)->format('d/m/Y H:i')
                : null,
            'motivo' => $this->motivo_cancelacion,
            'desde'  => $modulos[$this->cancelada_desde] ?? $this->cancelada_desde,
        ];
    }
}