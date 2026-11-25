<?php

namespace App\Support;

/**
 * Saneamiento de celdas contra inyección de fórmulas (CSV/formula injection).
 *
 * Excel, LibreOffice y Google Sheets evalúan como fórmula toda celda cuyo
 * texto empieza por «=», «+», «-», «@», tabulador o retorno de carro. Como el
 * contenido de los reportes sale de texto escrito por los usuarios
 * (observaciones, direcciones, motivos, nombres), un valor que abra con uno de
 * esos caracteres deja de ser un dato y pasa a ejecutarse en el equipo de quien
 * descarga el archivo.
 *
 * PhpSpreadsheet agrava el caso del «=»: su DefaultValueBinder convierte esas
 * cadenas en fórmulas reales dentro del .xlsx, así que el saneamiento tiene que
 * ocurrir antes de construir la hoja, no al abrirla.
 *
 * La mitigación es anteponer un apóstrofo, que obliga a la hoja de cálculo a
 * tratar la celda como texto.
 */
final class CeldaExcel
{
    /** Caracteres con los que una celda pasa a interpretarse como fórmula. */
    private const DISPARADORES = "=+-@\t\r";

    /**
     * Devuelve el valor listo para escribirse en una celda. Los valores que no
     * son cadenas (enteros, nulos) se dejan intactos: no pueden formar fórmula.
     */
    public static function texto(mixed $valor): mixed
    {
        if (!is_string($valor) || $valor === '') {
            return $valor;
        }

        if (!str_contains(self::DISPARADORES, $valor[0])) {
            return $valor;
        }

        // Un solo carácter no alcanza a formar una fórmula, y «-» es el
        // marcador de dato ausente que usan todos los reportes.
        if (mb_strlen($valor) === 1) {
            return $valor;
        }

        // Un número con signo («-5», «+3,5») es un dato legítimo.
        if (preg_match('/^[+-][\d.,]+$/', $valor) === 1) {
            return $valor;
        }

        return "'" . $valor;
    }

    /**
     * Aplica el saneamiento a todos los valores de una fila del reporte.
     * Se usa sobre la fila completa y no columna por columna para que ninguna
     * columna nueva quede fuera por olvido.
     */
    public static function fila(array $fila): array
    {
        return array_map([self::class, 'texto'], $fila);
    }

    /** Aplica el saneamiento a un conjunto de filas ya construido. */
    public static function filas(array $filas): array
    {
        return array_map([self::class, 'fila'], $filas);
    }
}
