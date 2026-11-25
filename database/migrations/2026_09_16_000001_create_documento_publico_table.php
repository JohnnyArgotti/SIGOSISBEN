<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Documentos de consulta pública (p. ej. el Manual de Usuario) que se listan
 * en la vista "Acerca de".
 *
 * Solo se guarda el enlace externo: si el documento se mueve de ubicación
 * basta con actualizar el registro desde Parametrización, sin desplegar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documento_publico', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150)->unique();
            $table->string('enlace', 2048);
            $table->boolean('estado')->default(true);
            $table->timestamp('creado_el')->useCurrent();
            $table->timestamp('actualizado_el')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documento_publico');
    }
};
