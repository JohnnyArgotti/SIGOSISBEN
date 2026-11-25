<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gestion_sistema', function (Blueprint $table) {
            $table->id();

            $table->foreignId('solicitud_id')
                ->unique()
                ->constrained('solicitud')
                ->restrictOnDelete();

            $table->foreignId('usuario_id')
                ->constrained('usuario')
                ->restrictOnDelete();

            // Opcional: al registrar o editar el hogar puede no conocerse
            // todavía, y el dato se completa después.
            $table->integer('cantidad_hogares')->nullable();

            $table->string('categoria_sisben', 10);

            // Estado obtenido automáticamente desde el módulo de Gestión de Campo
            $table->string('estado', 50);

            // Fecha asignada automáticamente al momento del registro
            $table->timestamp('fecha_resolucion');

            // Observación con la que el DNP acompaña el estado de la solicitud.
            // Se guarda siempre en mayúsculas, igual que el resto de texto
            // libre capturado por los asistenciales.
            $table->text('observacion_dnp')->nullable();

            $table->timestamp('creado_el')->useCurrent();
            $table->timestamp('actualizado_el')->useCurrent()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gestion_sistema');
    }
};
