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
        Schema::create('encuestador', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 10)->unique();
            $table->foreignId('tipo_documento_id')
                ->nullable()
                ->constrained('tipo_documento')
                ->cascadeOnUpdate()
                ->nullOnDelete();
            $table->string('num_documento', 20)->unique()->nullable();

            $table->string('nombres', 100);
            $table->string('apellidos', 100);
            $table->string('telefono', 20)->nullable();
            $table->boolean('estado')->default(true);

            $table->timestamp('creado_el')->useCurrent();
            $table->timestamp('actualizado_el')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('encuestador');
    }
};
