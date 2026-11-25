<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auditoria', function (Blueprint $table) {
            $table->id();

            // Usuario que ejecutó la acción. Nullable para conservar el
            // historial aunque el usuario se elimine, y para eventos sin
            // sesión (ej. intento de login fallido).
            $table->foreignId('usuario_id')
                ->nullable()
                ->constrained('usuario')
                ->nullOnDelete();

            // Acción realizada: creado, actualizado, eliminado, login_exitoso,
            // login_fallido, cuenta_bloqueada, cancelo, envio_a_campo, exporto...
            $table->string('evento', 50);

            // Nombre legible de la entidad afectada (Solicitud, Usuario...).
            $table->string('entidad', 100)->nullable();

            // Identificador del registro afectado dentro de la entidad.
            $table->unsignedBigInteger('entidad_id')->nullable();

            // Estado anterior y nuevo (solo los campos modificados).
            $table->json('valores_anteriores')->nullable();
            $table->json('valores_nuevos')->nullable();

            // Texto legible para el auditor.
            $table->string('descripcion')->nullable();

            // Contexto técnico de la petición.
            $table->ipAddress('ip')->nullable();
            $table->string('metodo_http', 10)->nullable();

            // Solo fecha de creación: los registros de auditoría son inmutables.
            // Hora de Bogotá fija en la base de datos, sin depender de la zona
            // horaria de la sesión ni del servidor.
            $table->timestamp('creado_el')
                ->default(DB::raw("(CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')"));

            $table->index(['entidad', 'entidad_id']);
            $table->index('usuario_id');
            $table->index('evento');
            $table->index('creado_el');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auditoria');
    }
};
