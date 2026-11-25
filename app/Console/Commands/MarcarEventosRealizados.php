<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Evento;
use Carbon\Carbon;

class MarcarEventosRealizados extends Command
{
    protected $signature   = 'eventos:marcar-realizados';
    protected $description = 'Marca como realizados los eventos cuya fecha y hora de fin ya pasaron.';

    public function handle(): void
    {
        $ahora      = Carbon::now();
        $hoy        = $ahora->toDateString();
        $horaActual = $ahora->format('H:i');

        $realizados = Evento::whereIn('estado_evento', ['programado', 'en_curso'])
            ->where(function ($q) use ($hoy, $horaActual) {
                $q->where('fecha', '<', $hoy)
                  ->orWhere(function ($q2) use ($hoy, $horaActual) {
                      $q2->where('fecha', $hoy)
                         ->where('hora_fin', '<=', $horaActual);
                  });
            })
            ->update(['estado_evento' => 'realizado', 'estado' => false]);

        $enCurso = Evento::where('estado_evento', 'programado')
            ->where('fecha', $hoy)
            ->where('hora_inicio', '<=', $horaActual)
            ->where('hora_fin', '>', $horaActual)
            ->update(['estado_evento' => 'en_curso']);

        $this->info("Eventos marcados como realizados: {$realizados}");
        $this->info("Eventos marcados como en curso: {$enCurso}");
    }
}
