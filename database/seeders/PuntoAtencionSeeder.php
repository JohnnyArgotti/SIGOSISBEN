<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PuntoAtencionSeeder extends Seeder
{
    public function run(): void
    {
        $puntos = [
            'Oficina principal',
            'Cali 1',
            'Cali 6',
            'Cali 7',
            'Cali 13',
            'Cali 15',
            'Cali 16',
            'Cali 18',
            'Cali 20',
            'Cali 21',
            'Casa de justicia',
            'Comfenalco',
        ];

        foreach ($puntos as $punto) {
            DB::table('punto_atencion')->updateOrInsert(
                ['nombre' => $punto],
                ['estado' => true]
            );
        }
    }
}