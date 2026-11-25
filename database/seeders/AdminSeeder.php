<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            [
                'tipo_documento_id' => 1,
                'num_documento'     => '',
                'nombres'           => 'EUVAR',
                'apellidos'         => 'DIUZA',
                'correo'            => 'sisben-coordinacionsistemas@admon.uniajc.edu.co',
                'telefono'          => '3154659041',
                'nombre_usuario' => 'ediuza',
                'contrasena'        => Hash::make('password123'),
                'estado'            => true,
            ]
        );

        $admin->syncRoles('Administrador');
    }
}