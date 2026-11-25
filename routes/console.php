<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Marca automáticamente los eventos pasados como realizados (cada minuto).
// Es la única fuente que sincroniza estado_evento: el controlador de la
// lista ya no lo hace en cada carga, para no repetir el UPDATE en cada
// poll de la pantalla.
Schedule::command('eventos:marcar-realizados')->everyMinute();
