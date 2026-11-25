<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Trazabilidad del paso de una solicitud por los paquetes, con el motivo de
 * cada liberación.
 *
 * Problema que resuelve: `solicitud.paquete_id` solo conserva el paquete
 * actual. Cuando una solicitud entra y sale de varios paquetes se pierde por
 * completo el rastro de dónde estuvo y por qué salió.
 *
 * Diseño:
 *  - motivo_liberacion / motivo_liberacion_explicacion: catálogo de dos
 *    niveles. La explicación depende de la abreviación elegida.
 *  - solicitud_paquete: una fila por estancia. Se abre al asignar y se cierra
 *    al salir (liberada_en). El motivo se exige únicamente cuando la salida es
 *    una liberación manual; reasignaciones y cancelaciones de paquete quedan
 *    registradas con su `salida_tipo`.
 *  - motivo_abreviacion / motivo_explicacion: copia del texto vigente al
 *    momento de liberar (desnormalización intencional, igual que
 *    `visita.encuestador_id`). Si mañana se corrige la redacción del catálogo,
 *    el historial sigue diciendo lo que el usuario realmente seleccionó.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('motivo_liberacion', function (Blueprint $table) {
            $table->id();
            $table->string('abreviacion', 100)->unique();
            $table->boolean('estado')->default(true);
            $table->timestamp('creado_el')->useCurrent();
        });

        Schema::create('motivo_liberacion_explicacion', function (Blueprint $table) {
            $table->id();

            $table->foreignId('motivo_liberacion_id')
                ->constrained('motivo_liberacion')
                ->cascadeOnDelete();

            $table->string('explicacion', 255);
            $table->boolean('estado')->default(true);
            $table->timestamp('creado_el')->useCurrent();

            $table->unique(['motivo_liberacion_id', 'explicacion'], 'motivo_explicacion_unica');
        });

        Schema::create('solicitud_paquete', function (Blueprint $table) {
            $table->id();

            $table->foreignId('solicitud_id')
                ->constrained('solicitud')
                ->cascadeOnDelete();

            $table->foreignId('paquete_id')
                ->constrained('paquete')
                ->restrictOnDelete();

            // Encuestador del paquete al momento de la asignación.
            $table->foreignId('encuestador_id')
                ->nullable()
                ->constrained('encuestador')
                ->nullOnDelete();

            $table->timestamp('asignada_en')->useCurrent();

            $table->foreignId('asignada_por')
                ->nullable()
                ->constrained('usuario')
                ->nullOnDelete();

            $table->timestamp('liberada_en')->nullable();

            $table->foreignId('liberada_por')
                ->nullable()
                ->constrained('usuario')
                ->nullOnDelete();

            // 'liberada' | 'reasignada' | 'paquete_cancelado'
            $table->string('salida_tipo', 30)->nullable();

            $table->foreignId('motivo_liberacion_id')
                ->nullable()
                ->constrained('motivo_liberacion')
                ->restrictOnDelete();

            $table->foreignId('motivo_explicacion_id')
                ->nullable()
                ->constrained('motivo_liberacion_explicacion')
                ->restrictOnDelete();

            $table->string('motivo_abreviacion', 100)->nullable();
            $table->string('motivo_explicacion', 255)->nullable();

            $table->index(['solicitud_id', 'asignada_en']);
            $table->index('paquete_id');
        });

        // Una solicitud no puede estar en dos paquetes a la vez: como máximo
        // una estancia abierta. Índice parcial (PostgreSQL).
        DB::statement('
            CREATE UNIQUE INDEX solicitud_paquete_estancia_abierta_unica
            ON solicitud_paquete (solicitud_id)
            WHERE liberada_en IS NULL
        ');
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitud_paquete');
        Schema::dropIfExists('motivo_liberacion_explicacion');
        Schema::dropIfExists('motivo_liberacion');
    }
};
