<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(TipoConsulta::class);
        $this->call(TipoDocumentoSeeder::class);
        $this->call(RolesAndPermissionsSeeder::class);
        $this->call(PuntoAtencionSeeder::class);
        $this->call(AdminSeeder::class);
        $this->call(ComunaSeeder::class);
        $this->call(BarrioSeeder::class);
        $this->call(TipoTramiteSeeder::class);
        $this->call(CanalSeeder::class);
        $this->call(MotivosLiberacionSeeder::class);
    }
}