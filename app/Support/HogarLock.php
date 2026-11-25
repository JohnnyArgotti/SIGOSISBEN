<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Bloqueo temporal de "registro de hogar" en Gestión de Calidad.
 *
 * Cuando un usuario abre el formulario de una solicitud, esta reserva el
 * derecho a diligenciarla por unos minutos: mientras esté vigente, ningún
 * otro usuario puede abrir el mismo formulario ni guardarlo, aunque entre
 * por URL directa. Es una reserva de UI/flujo, no el candado que garantiza
 * la integridad del dato — eso lo sigue dando la comprobación de que
 * `GestionSistema` no exista todavía para esa solicitud.
 *
 * Se apoya en el cache de base de datos (compartido entre workers), así que
 * no necesita tabla ni migración propia. Si el usuario cierra la pestaña sin
 * cancelar, el bloqueo simplemente expira solo con el TTL.
 */
class HogarLock
{
    /**
     * Minutos que dura la reserva antes de expirar sola. Calculado para
     * cubrir el tiempo normal de diligenciar el formulario (categoría,
     * cantidad, observación) y adjuntar el PDF soporte.
     */
    public const MINUTOS = 15;

    /**
     * Intenta reservar la solicitud para el usuario indicado.
     *
     * Si nadie la tiene, la toma. Si ya era del mismo usuario, renueva el
     * plazo (por ejemplo, al reintentar tras un error de validación). Si es
     * de otro usuario y sigue vigente, no hace nada y devuelve false.
     */
    public static function adquirir(int $solicitudId, int $usuarioId, string $usuarioNombre): bool
    {
        $clave      = self::clave($solicitudId);
        $propietario = Cache::get($clave);

        if ($propietario && (int) $propietario['usuario_id'] !== $usuarioId) {
            return false;
        }

        if (!$propietario) {
            // Cache::add es atómico: si otro usuario se adelantó justo entre
            // el get de arriba y esta línea, aquí es donde se detecta.
            return Cache::add($clave, self::payload($usuarioId, $usuarioNombre), self::ttl());
        }

        Cache::put($clave, self::payload($usuarioId, $usuarioNombre), self::ttl());

        return true;
    }

    /**
     * Libera la reserva, solo si sigue siendo del usuario indicado.
     */
    public static function liberar(int $solicitudId, ?int $usuarioId): void
    {
        $clave       = self::clave($solicitudId);
        $propietario = Cache::get($clave);

        if ($propietario && (int) $propietario['usuario_id'] === $usuarioId) {
            Cache::forget($clave);
        }
    }

    /**
     * Datos de quien tiene la reserva vigente, o null si está libre.
     * No renueva el plazo: es solo lectura, para mostrar el estado.
     */
    public static function propietario(int $solicitudId): ?array
    {
        return Cache::get(self::clave($solicitudId));
    }

    /**
     * Igual que propietario(), pero para varias solicitudes a la vez
     * (una sola vuelta al cache en vez de una por fila del listado).
     *
     * @param  int[]  $solicitudIds
     * @return array<int, array|null>
     */
    public static function propietarios(array $solicitudIds): array
    {
        if (empty($solicitudIds)) {
            return [];
        }

        $claves  = array_map(fn (int $id) => self::clave($id), $solicitudIds);
        $valores = Cache::many($claves);

        $resultado = [];
        foreach ($solicitudIds as $id) {
            $resultado[$id] = $valores[self::clave($id)] ?? null;
        }

        return $resultado;
    }

    /**
     * Mensaje listo para mostrar cuando la reserva pertenece a otro usuario.
     */
    public static function mensajeBloqueo(int $solicitudId): string
    {
        $propietario = self::propietario($solicitudId);

        return $propietario
            ? "El usuario {$propietario['usuario_nombre']} está registrando el hogar de esta solicitud en este momento. Intente de nuevo en unos minutos."
            : 'Otro usuario está registrando el hogar de esta solicitud en este momento. Intente de nuevo en unos minutos.';
    }

    private static function clave(int $solicitudId): string
    {
        return "hogar_registro_lock:{$solicitudId}";
    }

    private static function payload(int $usuarioId, string $usuarioNombre): array
    {
        return [
            'usuario_id'     => $usuarioId,
            'usuario_nombre' => $usuarioNombre,
            'desde'          => now()->toIso8601String(),
        ];
    }

    /**
     * La aplicación usa fechas inmutables (Date::use(CarbonImmutable::class)
     * en AppServiceProvider), así que now() no devuelve Illuminate\Support\Carbon.
     * El tipo declarado es DateTimeInterface: es lo que espera el cache y lo
     * único común a ambas implementaciones de Carbon.
     */
    private static function ttl(): \DateTimeInterface
    {
        return now()->addMinutes(self::MINUTOS);
    }
}
