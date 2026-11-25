<?php

namespace App\Support;

use Carbon\Carbon;

/**
 * Plazos de edición del sistema: un registro solo puede modificarlo quien lo
 * creó, dentro de las horas siguientes a su creación.
 *
 * El plazo general (HORAS) rige la edición de solicitudes y atenciones. El
 * registro de hogares en Gestión de Calidad usa uno más amplio (HORAS_HOGARES)
 * porque su verificación depende de trámites que tardan más en resolverse.
 *
 * Las excepciones "fuera de plazo" por módulo levantan estos límites.
 */
class PlazoEdicion
{
    /**
     * Horas de plazo para solicitudes y atenciones.
     */
    public const HORAS = 24;

    /**
     * Horas de plazo para el registro de hogares.
     */
    public const HORAS_HOGARES = 96;

    /**
     * Fecha y hora hasta la que se puede editar el registro.
     */
    public static function limite($creadoEl, int $horas = self::HORAS): Carbon
    {
        return Carbon::parse($creadoEl)->addHours($horas);
    }

    /**
     * Indica si el plazo de edición ya venció.
     */
    public static function vencido($creadoEl, int $horas = self::HORAS): bool
    {
        return self::limite($creadoEl, $horas)->isPast();
    }
}
