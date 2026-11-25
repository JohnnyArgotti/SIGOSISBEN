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
        Schema::create('evento', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 255);
            $table->foreignId('responsable_id')
                ->constrained('usuario')
                ->cascadeOnUpdate()
                ->restrictOnDelete();
            $table->date('fecha');
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->string('entidad_organizadora', 255);
            $table->string('direccion', 255);
            $table->foreignId('comuna_id')
                ->constrained('comuna')
                ->restrictOnDelete();
            $table->foreignId('barrio_id')
                ->constrained('barrio')
                ->restrictOnDelete();
            $table->boolean('estado')->default(true);
            $table->enum('estado_evento', ['programado', 'en_curso', 'realizado', 'cancelado'])
                ->default('programado');
            $table->timestamp('creado_el')->useCurrent();
            $table->timestamp('actualizado_el')->useCurrent()->useCurrentOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evento');
    }
};
