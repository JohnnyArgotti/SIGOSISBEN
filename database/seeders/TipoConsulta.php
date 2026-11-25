<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TipoConsulta extends Seeder
{
    public function run(): void
    {
        DB::table('tipo_consulta')->insert([
            [
                'nombre' => 'NUMERO FUERA DE SERVICIO',
                'estado' => true,
            ],
            [
                'nombre' => 'NUMERO INCOMPLETO',
                'estado' => true,
            ],
            [
                'nombre' => 'NUMERO ERRADO',
                'estado' => true,
            ],
            [
                'nombre' => 'NO CONTESTA',
                'estado' => true,
            ],
            [
                'nombre' => 'PENDIENTE DOCUMENTACIÓN',
                'estado' => true,
            ],
            [
                'nombre' => 'DOCUMENTACION VENCIDA',
                'estado' => true,
            ],
            [
                'nombre' => 'DOCUMENTACION INCOMPLETA',
                'estado' => true,
            ],
            [
                'nombre' => 'USUARIO FALLECIDO',
                'estado' => true,
            ],
            [
                'nombre' => 'SOLICITUD EN PROCESO',
                'estado' => true,
            ],
            [
                'nombre' => 'CONSULTA CATEGORIA',
                'estado' => true,
            ],
            [
                'nombre' => 'OTROS PROGRAMAS  DEL ESTADO',
                'estado' => true,
            ],
            [
                'nombre' => 'CONSULTA  EPS',
                'estado' => true,
            ],
            [
                'nombre' => 'OTRO MUNICIPIO',
                'estado' => true,
            ],
            [
                'nombre' => 'EXTRANJERO IREGULAR',
                'estado' => true,
            ],
            [
                'nombre' => 'FICHA EN VERIFICACIÓN - POR AUSENCIA DE JEFE DE HOGAR',
                'estado' => true,
            ],
            [
                'nombre' => 'ENCUESTA INFERIOR A 6 MESES',
                'estado' => true,
            ],
            [
                'nombre' => 'NO LE INTERESA',
                'estado' => true,
            ],
        ]);
    }
}
