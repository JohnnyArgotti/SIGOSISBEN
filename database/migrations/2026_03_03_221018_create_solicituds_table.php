<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('solicitud', function (Blueprint $table) {
            $table->id();

            $table->foreignId('usuario_id')
                ->constrained('usuario')
                ->cascadeOnDelete();

            $table->foreignId('tipo_tramite_id')
                ->constrained('tipo_tramite')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->string('id_SisbenApp', 100);
            $table->string('num_radicado', 100);

            $table->foreignId('punto_atencion_id')
                ->nullable()
                ->constrained('punto_atencion')
                ->restrictOnDelete();

            $table->foreignId('evento_id')
                ->nullable()
                ->constrained('evento')
                ->nullOnDelete();

            $table->foreignId('ciudadano_id')
                ->constrained('ciudadano')
                ->restrictOnDelete();

            $table->foreignId('comuna_id')
                ->constrained('comuna')
                ->restrictOnDelete();

            $table->foreignId('barrio_id')
                ->constrained('barrio')
                ->restrictOnDelete();

            $table->foreignId('paquete_id')
                ->nullable()
                ->constrained('paquete')
                ->nullOnDelete();

            $table->foreignId('canal_id')
                ->nullable()
                ->constrained('canal')
                ->restrictOnDelete();

            $table->text('observacion')->nullable();
            $table->text('direccion')->nullable();
            $table->timestamp('fecha_ejecucion')->nullable();

            $table->date('fecha_visita1')->nullable();
            $table->string('motivo_visita1')->nullable();
            $table->text('observacion_visita1')->nullable();
            $table->date('fecha_visita2')->nullable();
            $table->string('motivo_visita2')->nullable();
            $table->text('observacion_visita2')->nullable();
            $table->date('fecha_notificacion')->nullable();

            $table->boolean('estado');

            // Los estados que devuelve el DNP (sincronizada, realizada,
            // cancelada_dnp, pendiente_dnp) viven en esta misma columna porque
            // son el desenlace final del trámite. "Cancelada" y "Pendiente" del
            // DNP llevan el sufijo _dnp para no confundirse con la cancelación
            // de Gestión de Solicitudes ni con el pendiente de segunda visita
            // de Gestión de Campo, que disparan flujos distintos.
            $table->enum('estado_gestion', [
                'registrada',
                'enviada_a_campo',
                'asignada',
                'entregada',
                'ejecutada',
                'notificada',
                'aprobada',
                'cancelada',
                'rechazada',
                'pendiente',
                'sincronizada',
                'realizada',
                'cancelada_dnp',
                'pendiente_dnp',
            ])->default('registrada');

            $table->foreignId('reservada_por')
                ->nullable()
                ->constrained('usuario')
                ->nullOnDelete();
            $table->timestamp('reservada_en')->nullable();

            $table->foreignId('cancelada_por')
                ->nullable()
                ->constrained('usuario')
                ->nullOnDelete();
            $table->timestamp('cancelada_en')->nullable();
            $table->text('motivo_cancelacion')->nullable();
            $table->string('cancelada_desde', 20)->nullable();

            $table->timestamp('creado_el')->useCurrent();
            $table->timestamp('actualizado_el')->useCurrent();

            // PostgreSQL, a diferencia de MySQL, no crea un índice al declarar
            // una llave foránea. Sin estos índices, contar las solicitudes de
            // cada paquete recorría la tabla completa una vez por paquete.
            $table->index('estado_gestion');
            $table->index('paquete_id');
            $table->index('ciudadano_id');
            $table->index('usuario_id');
            $table->index('reservada_por');
            $table->index('cancelada_por');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('solicitud');
    }
};
