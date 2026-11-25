<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TipoTramiteSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('tipo_tramite')->insert([
            [
                'nombre' => 'Formato Encuesta Nueva',
                'codigo' => 'FEN',
                'estado' => true,
            ],
            [
                'nombre' => 'Formato Inclusión de Persona',
                'codigo' => 'FIP',
                'estado' => true,
            ],
            [
                'nombre' => 'Formato Modificación de Ficha',
                'codigo' => 'FMF',
                'estado' => true,
            ],
            [
                'nombre' => 'Formato Retiro de Ficha',
                'codigo' => 'FRF',
                'estado' => true,
            ],
            [
                'nombre' => 'Formato Retiro de Hogar',
                'codigo' => 'FRH',
                'estado' => true,
            ],
            [
                'nombre' => 'Formato Retiro de Persona',
                'codigo' => 'FRP',
                'estado' => true,
            ],
        ]);
    }
}
