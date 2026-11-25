<?php

namespace App\Services;

use App\Models\Auditoria;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditoriaService
{
    /**
     * Campos que nunca deben quedar registrados en la auditoría,
     * ya sea por ruido (timestamps, locks) o por seguridad (credenciales).
     */
    protected array $excluidosGlobales = [
        'creado_el',
        'actualizado_el',
        'created_at',
        'updated_at',
        'remember_token',
        'contrasena',
        'password',
        'reservada_por',
        'reservada_en',
    ];

    /**
     * Registra un evento de auditoría genérico (acciones de negocio,
     * login, exportaciones, etc.).
     */
    public function registrar(
        string $evento,
        ?string $entidad = null,
        ?int $entidadId = null,
        ?string $descripcion = null,
        ?array $anteriores = null,
        ?array $nuevos = null,
        ?int $usuarioId = null,
    ): void {
        $request = request();

        Auditoria::create([
            'usuario_id'         => $usuarioId ?? Auth::id(),
            'evento'             => $evento,
            'entidad'            => $entidad,
            'entidad_id'         => $entidadId,
            'valores_anteriores' => $anteriores,
            'valores_nuevos'     => $nuevos,
            'descripcion'        => $descripcion,
            'ip'                 => $request?->ip(),
            'metodo_http'        => $request?->method(),
        ]);
    }

    /**
     * Registra automáticamente un cambio sobre un modelo Eloquent.
     * Usado por el trait Auditable en los eventos created/updated/deleted.
     */
    public function registrarModelo(string $evento, Model $modelo): void
    {
        $entidad = method_exists($modelo, 'auditEtiqueta')
            ? $modelo->auditEtiqueta()
            : class_basename($modelo);

        $excluidos = array_merge(
            $this->excluidosGlobales,
            method_exists($modelo, 'auditExcluidos') ? $modelo->auditExcluidos() : [],
        );

        $anteriores = null;
        $nuevos = null;

        if ($evento === 'actualizado') {
            $cambios = $this->limpiar($modelo->getChanges(), $excluidos);

            // Si solo cambiaron campos excluidos (ej. intentos_fallidos),
            // no tiene sentido generar un registro de auditoría.
            if (empty($cambios)) {
                return;
            }

            $nuevos = $cambios;
            $anteriores = array_intersect_key(
                $this->limpiar($modelo->getOriginal(), $excluidos),
                $cambios,
            );
        } elseif ($evento === 'creado') {
            $nuevos = $this->limpiar($modelo->getAttributes(), $excluidos);
        } elseif ($evento === 'eliminado') {
            $anteriores = $this->limpiar($modelo->getOriginal(), $excluidos);
        }

        $this->registrar(
            evento: $evento,
            entidad: $entidad,
            entidadId: (int) $modelo->getKey(),
            descripcion: $this->describir($evento, $entidad, $modelo->getKey()),
            anteriores: $anteriores,
            nuevos: $nuevos,
        );
    }

    protected function limpiar(array $valores, array $excluidos): array
    {
        return array_diff_key($valores, array_flip($excluidos));
    }

    protected function describir(string $evento, string $entidad, $id): string
    {
        $verbos = [
            'creado'      => 'Creó',
            'actualizado' => 'Actualizó',
            'eliminado'   => 'Eliminó',
        ];

        $verbo = $verbos[$evento] ?? ucfirst($evento);

        return "{$verbo} {$entidad} #{$id}";
    }
}
