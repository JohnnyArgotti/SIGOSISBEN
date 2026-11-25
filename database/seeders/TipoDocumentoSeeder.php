<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TipoDocumentoSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('tipo_documento')->insert([
            [
                'nombre' => 'Cédula de Ciudadanía',
                'codigo' => 'CC',
                'estado' => true,
                'creado_el' => now(),
                'actualizado_el' => now(),
            ],
            [
                'nombre' => 'Cédula de Extranjería',
                'codigo' => 'CE',
                'estado' => true,
                'creado_el' => now(),
                'actualizado_el' => now(),
            ],
            [
                'nombre' => 'Pasaporte',
                'codigo' => 'PA',
                'estado' => true,
                'creado_el' => now(),
                'actualizado_el' => now(),
            ],
            [
                'nombre' => 'Tarjeta de Identidad',
                'codigo' => 'TI',
                'estado' => true,
                'creado_el' => now(),
                'actualizado_el' => now(),
            ],
            [
                'nombre' => 'Documento Nacional de Identidad',
                'codigo' => 'DNI',
                'estado' => true,
                'creado_el' => now(),
                'actualizado_el' => now(),
            ],
            [
                'nombre' => 'Registro Civil',
                'codigo' => 'RC',
                'estado' => true,
                'creado_el' => now(),
                'actualizado_el' => now(),
            ],
            [
                'nombre' => 'Salvoconducto',
                'codigo' => 'SC',
                'estado' => true,
                'creado_el' => now(),
                'actualizado_el' => now(),
            ],
            [
                'nombre' => 'Permiso de Protección Temporal',
                'codigo' => 'PPT',
                'estado' => true,
                'creado_el' => now(),
                'actualizado_el' => now(),
            ],
        ]);
    }
}
