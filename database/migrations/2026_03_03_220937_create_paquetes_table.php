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
        Schema::create('paquete', function (Blueprint $table) {
            $table->id();

            $table->foreignId('usuario_id')
                ->constrained('usuario')
                ->cascadeOnDelete();

            $table->foreignId('encuestador_id')
                ->nullable()
                ->constrained('encuestador')
                ->nullOnDelete();

            $table->boolean('estado');
            $table->timestamp('creado_el')->useCurrent();
            $table->timestamp('actualizado_el')->useCurrent();

            // PostgreSQL no indexa las llaves foráneas por sí solo.
            $table->index('encuestador_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('paquete');
    }
};
