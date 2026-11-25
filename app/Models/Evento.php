<?php

namespace App\Models;

use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use App\Models\Barrio;
use App\Models\Comuna;

class Evento extends Model
{
    protected $table = 'evento';

    public $timestamps = false;

    protected $fillable = [
        'nombre',
        'responsable_id',
        'fecha',
        'hora_inicio',
        'hora_fin',
        'entidad_organizadora',
        'direccion',
        'comuna_id',
        'barrio_id',
        'estado',
        'estado_evento',
    ];

    protected $casts = [
        'fecha'         => 'date:Y-m-d',
        'estado'        => 'boolean',
        'estado_evento' => 'string',
    ];

    /**
     * Eventos que se están ejecutando en este momento: activos, ni cancelados ni
     * realizados, con fecha de hoy y la hora actual dentro de la franja
     * hora_inicio – hora_fin.
     *
     * Es el único criterio válido para trabajar sobre un evento (listado del
     * login, guardado de la ubicación y verificación de la sesión): un evento
     * programado para más adelante todavía no habilita la atención.
     */
    public function scopeEnCurso(Builder $query, ?DateTimeInterface $ahora = null): Builder
    {
        $ahora ??= now();

        return $query->where('estado', true)
            ->whereNotIn('estado_evento', ['realizado', 'cancelado'])
            ->whereDate('fecha', $ahora->format('Y-m-d'))
            ->whereTime('hora_inicio', '<=', $ahora->format('H:i:s'))
            ->whereTime('hora_fin', '>', $ahora->format('H:i:s'));
    }

    /** Versión en memoria de scopeEnCurso(), para un evento ya cargado. */
    public function estaEnCurso(?DateTimeInterface $ahora = null): bool
    {
        $ahora ??= now();

        if (! $this->estado || in_array($this->estado_evento, ['realizado', 'cancelado'], true)) {
            return false;
        }

        if ($this->fecha?->format('Y-m-d') !== $ahora->format('Y-m-d')) {
            return false;
        }

        $hora = $ahora->format('H:i:s');

        return substr((string) $this->hora_inicio, 0, 8) <= $hora
            && $hora < substr((string) $this->hora_fin, 0, 8);
    }

    /** True cuando la fecha y la hora de fin del evento ya pasaron. */
    public function yaFinalizo(?DateTimeInterface $ahora = null): bool
    {
        $ahora = $ahora ?? now();
        $fecha = $this->fecha?->format('Y-m-d');

        if ($fecha === null) {
            return false;
        }

        $hoy = $ahora->format('Y-m-d');

        return $fecha < $hoy
            || ($fecha === $hoy && substr((string) $this->hora_fin, 0, 8) <= $ahora->format('H:i:s'));
    }

    public function responsable()
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }

    public function comuna()
    {
        return $this->belongsTo(Comuna::class, 'comuna_id');
    }

    public function barrio()
    {
        return $this->belongsTo(Barrio::class, 'barrio_id');
    }
}
