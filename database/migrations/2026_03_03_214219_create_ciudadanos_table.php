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
        Schema::create('ciudadano', function (Blueprint $table) {
            $table->id();

            $table->foreignId('tipo_documento_id')
                ->constrained('tipo_documento')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->string('nombre_completo', 200);
            $table->string('num_documento', 20)->unique();
            $table->string('telefono', 20)->nullable();
            $table->boolean('estado')->default(true);

            $table->timestamp('creado_el')->useCurrent();
            $table->timestamp('actualizado_el')->useCurrent();

            // Sirve al buscador de solicitante de Reportes: recorre los nombres
            // ya ordenados y se detiene en el límite, en vez de ordenar todas
            // las coincidencias.
            $table->index('nombre_completo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ciudadano');
    }
};
