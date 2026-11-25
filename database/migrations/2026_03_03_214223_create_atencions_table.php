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
        Schema::create('atencion', function (Blueprint $table) {
            $table->id();

            $table->foreignId('usuario_id')
                ->constrained('usuario')
                ->cascadeOnDelete();

            $table->timestamp('fecha')->nullable();
            
            $table->foreignId('tipo_consulta_id')
                ->constrained('tipo_consulta')
                ->restrictOnDelete();

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

            $table->foreignId('canal_id')->nullable()
                ->constrained('canal')
                ->restrictOnDelete();

            $table->foreignId('comuna_id')
                ->constrained('comuna')
                ->restrictOnDelete();

            $table->foreignId('barrio_id')
                ->constrained('barrio')
                ->restrictOnDelete();

            $table->text('observacion')->nullable();

            $table->timestamp('creado_el')->useCurrent();
            $table->timestamp('actualizado_el')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('atencion');
    }
};
