<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barrio', function (Blueprint $table) {

            $table->id();

            $table->string('nombre');
            $table->boolean('estado')->default(true);

            $table->timestamp('creado_el')->useCurrent();
            $table->timestamp('actualizado_el')->useCurrent();
            $table->foreignId('comuna_id')
                ->constrained('comuna')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barrio');
    }
};
