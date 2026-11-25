<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuario', function (Blueprint $table) {
            $table->id();

            // Documento y contraseña son opcionales: los usuarios provisionados
            // desde Active Directory no poseen contraseña local, ni
            // necesariamente documento o tipo de documento.
            $table->foreignId('tipo_documento_id')
                ->nullable()
                ->constrained('tipo_documento')
                ->cascadeOnUpdate()
                ->restrictOnDelete();
            $table->string('num_documento', 20)->unique()->nullable();
            $table->string('nombres', 100);
            $table->string('apellidos', 100);
            $table->string('correo', 150)->unique()->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('nombre_usuario', 50)->unique();
            $table->text('contrasena')->nullable();
            $table->boolean('estado')->default(true);

            $table->unsignedTinyInteger('intentos_fallidos')->default(0);

            // Marca del último intento fallido. Permite caducar el contador
            // `intentos_fallidos`: si transcurre la ventana configurada (por
            // defecto 30 minutos) sin ningún intento fallido nuevo, el contador
            // vuelve a cero y el usuario recupera sus intentos sin intervención
            // del administrador.
            $table->timestamp('ultimo_intento_fallido')->nullable();

            // Discrimina el origen de autenticación del usuario.
            // false = Local (PostgreSQL) | true = Active Directory (LDAP).
            $table->boolean('autenticacion_ad')->default(false);

            // objectGUID de Active Directory. Vínculo permanente e inmutable
            // entre el usuario del SIGO y la identidad institucional.
            $table->string('ad_guid')->nullable()->unique();

            $table->timestamp('creado_el')->useCurrent();
            $table->timestamp('actualizado_el')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuario');
    }
};
