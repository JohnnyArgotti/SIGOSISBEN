<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CanalSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $canales = [
            'Presencial',
            'Virtual/WhatsApp',
            'Virtual correo',
            'Virtual/correcciones',
            'Virtual/BD',
            'Itinerantes/Emssanar',
            'Itinerantes/Adulto mayor',
            'Itinerantes/Hospital Carlos Holmes',
            'Itinerantes/Hospital Carlos Carmona',
        ];

        foreach ($canales as $nombre) {
            DB::table('canal')->insert([
                'nombre'            => $nombre,
                'estado'            => true,
            ]);
        }
    }
}