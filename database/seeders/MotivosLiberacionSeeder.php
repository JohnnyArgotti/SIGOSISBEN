<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MotivosLiberacionSeeder extends Seeder
{
    /**
     * Inserta con consultas crudas (no Eloquent) para no disparar los
     * eventos de creación que audita MotivoLiberacion: el seeder no es
     * una acción de un usuario y no debe dejar rastro en la auditoría.
     */
    public function run(): void
    {
        $catalogo = [
            'SALE-ENC CAMBIO COMUNA' => [
                'CUANDO EL ENCUESTADOR CAMBIA DE COMUNA.',
            ],
            'SALE-CORREGIR' => [
                'USUARIO CAMBIA DE UV',
                'EQUIVOCACIÓN DE PUNTOS.',
                'CAMBIO DE SOLICITANTE O EDAD.',
                'USUARIO SE EQUIVOCO DE DIRECCIÓN.',
            ],
            'SALE-OFICINA' => [
                'CUANDO REQUIERAN DESDE OFICINA LA SOLICITUD QUE YA ESTÁ ENRUTADA.',
                'CUANDO LA SOLICITUD NO CARGA EN EL DMC.',
                'CUANDO EL ENCUESTADOR TIENE UNA FUNCIÓN PROGRAMADA AL DÍA SIGUIENTE.',
            ],
            'SALE CAMBIO DE SECTOR' => [
                'CUANDO EL ENCUESTADOR SIGUE EN LA MISMA COMUNA PERO EN DIFERENTE SECTOR Y QUEDA MUY LEJOS.',
            ],
            'SALE 2 VISITA' => [
                'CUANDO USUARIO INFORMA QUE PUEDE RECIBIR LA VISITA EN LA SIGUIENTE SEMANA.',
            ],
            'SALE 3 VISITA' => [
                'CUANDO YA TIENE LA 2 VISITA Y EL SUPERVISOR AUTORIZA EN CASOS ESPECIALES HACER LA 3 VISITA.',
            ],
            'PROGRAMADA' => [
                'CUANDO EL ENCUESTADOR SIGUE EN LA MISMA COMUNA Y SECTOR.',
            ],
            'JURÍDICA O PRIORITARIA' => [
                'CUANDO LE DAN UNA SOLICITUD DE MÁS QUE SEA ESPECIAL PARA ESTE TEMA.',
            ],
        ];

        $existentes = DB::table('motivo_liberacion')->pluck('id', 'abreviacion');

        foreach ($catalogo as $abreviacion => $explicaciones) {
            $motivoId = $existentes[$abreviacion] ?? null;

            if ($motivoId === null) {
                $motivoId = DB::table('motivo_liberacion')->insertGetId([
                    'abreviacion' => $abreviacion,
                    'estado'      => true,
                    'creado_el'   => now(),
                ]);
            }

            $explicacionesExistentes = DB::table('motivo_liberacion_explicacion')
                ->where('motivo_liberacion_id', $motivoId)
                ->pluck('explicacion')
                ->all();

            foreach (array_diff($explicaciones, $explicacionesExistentes) as $explicacion) {
                DB::table('motivo_liberacion_explicacion')->insert([
                    'motivo_liberacion_id' => $motivoId,
                    'explicacion'          => $explicacion,
                    'estado'               => true,
                    'creado_el'            => now(),
                ]);
            }
        }
    }
}
