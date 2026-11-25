<?php

namespace App\Support;

/**
 * Validación de fechas recibidas como filtros de listados y reportes.
 *
 * Los filtros de fecha llegan por query string y se parsean con Carbon en
 * múltiples controladores y exports. Un valor malformado ("abc", "31-31-31")
 * haría lanzar una excepción a Carbon::parse() y responder un error 500.
 * Este helper acepta únicamente el formato Y-m-d que envían los inputs de
 * fecha del frontend y descarta cualquier otro valor en silencio, como si
 * el filtro no se hubiera aplicado.
 */
class FechaFiltro
{
    /**
     * Devuelve la fecha si es un Y-m-d válido de calendario; null en caso contrario.
     */
    public static function valida(mixed $valor): ?string
    {
        $valor = trim((string) ($valor ?? ''));

        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $valor, $m)) {
            return null;
        }

        return checkdate((int) $m[2], (int) $m[3], (int) $m[1]) ? $valor : null;
    }
}
