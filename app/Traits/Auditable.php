<?php

namespace App\Traits;

use App\Services\AuditoriaService;

/**
 * Aplica auditoría automática a un modelo Eloquent.
 *
 * Los modelos que usen este trait registrarán automáticamente sus eventos
 * de creación, actualización y eliminación en la tabla `auditoria`.
 *
 * Personalización opcional por modelo:
 *  - protected array $auditExcluir = ['campo1', ...];  // campos a ignorar
 *  - protected string $auditEtiqueta = 'Solicitud';     // nombre legible
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function ($modelo) {
            app(AuditoriaService::class)->registrarModelo('creado', $modelo);
        });

        static::updated(function ($modelo) {
            app(AuditoriaService::class)->registrarModelo('actualizado', $modelo);
        });

        static::deleted(function ($modelo) {
            app(AuditoriaService::class)->registrarModelo('eliminado', $modelo);
        });
    }

    public function auditExcluidos(): array
    {
        return property_exists($this, 'auditExcluir') ? $this->auditExcluir : [];
    }

    public function auditEtiqueta(): string
    {
        return property_exists($this, 'auditEtiqueta')
            ? $this->auditEtiqueta
            : class_basename($this);
    }
}
