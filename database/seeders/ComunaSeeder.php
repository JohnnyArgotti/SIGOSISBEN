<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComunaSeeder extends Seeder
{
    /**
     * Inserta con consultas crudas (no Eloquent) para no disparar los
     * eventos de creación que audita Comuna: el seeder no es una acción
     * de un usuario y no debe dejar rastro en la auditoría.
     */
    public function run(): void
    {
        $comunas = [
            ['id'=>1,'nombre'=>'Comuna 0','latitud'=>3.4010,'longitud'=>-76.6150],
            ['id'=>2,'nombre'=>'Comuna 1','latitud'=>3.4705,'longitud'=>-76.5932],
            ['id'=>3,'nombre'=>'Comuna 2','latitud'=>3.4846,'longitud'=>-76.5602],
            ['id'=>4,'nombre'=>'Comuna 3','latitud'=>3.4627,'longitud'=>-76.5318],
            ['id'=>5,'nombre'=>'Comuna 4','latitud'=>3.4528,'longitud'=>-76.5260],
            ['id'=>6,'nombre'=>'Comuna 5','latitud'=>3.4704,'longitud'=>-76.5131],
            ['id'=>7,'nombre'=>'Comuna 6','latitud'=>3.4938,'longitud'=>-76.5104],
            ['id'=>8,'nombre'=>'Comuna 7','latitud'=>3.5057,'longitud'=>-76.5006],
            ['id'=>9,'nombre'=>'Comuna 8','latitud'=>3.4492,'longitud'=>-76.4942],
            ['id'=>10,'nombre'=>'Comuna 9','latitud'=>3.4420,'longitud'=>-76.5065],
            ['id'=>11,'nombre'=>'Comuna 10','latitud'=>3.4332,'longitud'=>-76.5315],
            ['id'=>12,'nombre'=>'Comuna 11','latitud'=>3.4200,'longitud'=>-76.5192],
            ['id'=>13,'nombre'=>'Comuna 12','latitud'=>3.4253,'longitud'=>-76.4951],
            ['id'=>14,'nombre'=>'Comuna 13','latitud'=>3.4327,'longitud'=>-76.4754],
            ['id'=>15,'nombre'=>'Comuna 14','latitud'=>3.4209,'longitud'=>-76.4681],
            ['id'=>16,'nombre'=>'Comuna 15','latitud'=>3.4107,'longitud'=>-76.4796],
            ['id'=>17,'nombre'=>'Comuna 16','latitud'=>3.3973,'longitud'=>-76.4895],
            ['id'=>18,'nombre'=>'Comuna 17','latitud'=>3.3870,'longitud'=>-76.5324],
            ['id'=>19,'nombre'=>'Comuna 18','latitud'=>3.3724,'longitud'=>-76.5458],
            ['id'=>20,'nombre'=>'Comuna 19','latitud'=>3.4016,'longitud'=>-76.5564],
            ['id'=>21,'nombre'=>'Comuna 20','latitud'=>3.4312,'longitud'=>-76.5537],
            ['id'=>22,'nombre'=>'Comuna 21','latitud'=>3.4241,'longitud'=>-76.5688],
            ['id'=>23,'nombre'=>'Comuna 22','latitud'=>3.4094,'longitud'=>-76.4393],
        ];

        DB::table('comuna')->upsert($comunas, ['id'], ['nombre', 'latitud', 'longitud']);
    }
}