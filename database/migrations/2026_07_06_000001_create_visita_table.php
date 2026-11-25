<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Crea la tabla `visita` como entidad de primera clase del dominio.
 *
 * Problema que resuelve: los datos de visita estaban desnormalizados como
 * columnas en `solicitud` (fecha_visita1, motivo_visita1, fecha_visita2…),
 * lo que impedía registrar de forma trazable qué encuestador realizó cada
 * visita, especialmente cuando la solicitud era reasignada entre paquetes.
 *
 * Diseño:
 *  - paquete_id:    contexto operativo en el que se realizó la visita.
 *  - encuestador_id: registro inmutable de quién físicamente hizo la visita
 *                    (desnormalización intencional: si el encuestador del
 *                    paquete cambia en el futuro, el historial permanece fiel).
 *  - registrada_por: usuario del sistema que registró el resultado.
 *  - (solicitud_id, numero_visita): clave única — una solicitud no puede
 *                    tener dos visitas con el mismo número.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visita', function (Blueprint $table) {
            $table->id();

            $table->foreignId('solicitud_id')
                ->constrained('solicitud')
                ->cascadeOnDelete();

            $table->foreignId('paquete_id')
                ->constrained('paquete')
                ->restrictOnDelete();

            $table->foreignId('encuestador_id')
                ->constrained('encuestador')
                ->restrictOnDelete();

            $table->foreignId('registrada_por')
                ->constrained('usuario')
                ->restrictOnDelete();

            // 1 = primera visita, 2 = segunda visita
            $table->unsignedSmallInteger('numero_visita');

            $table->date('fecha');

            // 'exitosa' | 'fallida' | 'notificada'
            $table->string('resultado', 20);

            $table->string('motivo', 100)->nullable();
            $table->text('observacion')->nullable();

            // Solo se registra cuando resultado = 'notificada'
            $table->date('fecha_notificacion')->nullable();

            $table->timestamp('creado_el')->useCurrent();

            // Una solicitud solo puede tener una visita por número
            $table->unique(['solicitud_id', 'numero_visita']);

            // PostgreSQL no indexa las llaves foráneas por sí solo.
            $table->index('encuestador_id');
            $table->index('paquete_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visita');
    }
};
