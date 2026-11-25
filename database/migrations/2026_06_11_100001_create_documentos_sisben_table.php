<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documentos_sisben', function (Blueprint $table) {
            $table->id();

            $table->foreignId('solicitud_id')
                ->constrained('solicitud')
                ->restrictOnDelete();

            // Metadatos calculados automáticamente en backend
            $table->string('nombre_original');
            $table->string('mime_type', 100);
            $table->bigInteger('tamano_bytes');
            $table->string('hash_sha256', 64);

            // Ruta del archivo dentro del disco 'local' (storage/app/private)
            $table->string('ruta_archivo');

            $table->timestamps();

            // PostgreSQL no indexa las llaves foráneas por sí solo.
            $table->index('solicitud_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documentos_sisben');
    }
};
