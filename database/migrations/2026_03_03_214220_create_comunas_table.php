<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comuna', function (Blueprint $table) {
            $table->id();

            $table->string('nombre', 100)->unique();

            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();

            $table->boolean('estado')->default(true);

            $table->timestamp('creado_el')->useCurrent();
            $table->timestamp('actualizado_el')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comuna');
    }
};