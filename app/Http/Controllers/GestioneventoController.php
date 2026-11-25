<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Evento;
use App\Models\User;
use App\Models\Comuna;
use App\Models\Barrio;
use Carbon\Carbon;
use App\Exports\SolicitudesEventoExport;
use App\Exports\AtencionesEventoExport;
use App\Exports\EventosExport;
use Maatwebsite\Excel\Facades\Excel;

class GestioneventoController extends Controller
{
    public function index()
    {
        return Inertia::render('gestion_eventos/index', [
            'eventos' => Evento::with(['responsable:id,nombres,apellidos', 'comuna:id,nombre', 'barrio:id,nombre'])
                ->orderBy('fecha', 'desc')
                ->orderBy('hora_inicio', 'desc')
                ->get(),
        ]);
    }

    public function create()
    {
        return Inertia::render('gestion_eventos/create', [
            'usuarios' => User::where('estado', true)
                ->select('id', 'nombres', 'apellidos')
                ->orderBy('nombres')
                ->get(),
            'comunas' => Comuna::orderBy('id')->get(['id', 'nombre']),
            'barrios' => Barrio::orderBy('nombre')->get(['id', 'nombre', 'comuna_id']),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre'               => 'required|string|max:255|unique:evento,nombre',
            'responsable_id'       => 'required|exists:usuario,id',
            'fecha'                => 'required|date|after_or_equal:today',
            'hora_inicio'          => 'required|date_format:H:i',
            'hora_fin'             => 'required|date_format:H:i|after:hora_inicio',
            'entidad_organizadora' => 'required|string|max:255',
            'direccion'            => 'required|string|max:255',
            'comuna_id'            => 'required|exists:comuna,id',
            'barrio_id'            => 'required|exists:barrio,id',
        ], [
            'nombre.required'                => 'El nombre del evento es obligatorio.',
            'nombre.unique'                  => 'Ya existe un evento con este nombre.',
            'nombre.max'                     => 'El nombre no puede superar los 255 caracteres.',
            'responsable_id.required'        => 'El responsable es obligatorio.',
            'responsable_id.exists'          => 'El responsable seleccionado no es válido.',
            'fecha.required'                 => 'La fecha es obligatoria.',
            'fecha.date'                     => 'El formato de fecha no es válido.',
            'fecha.after_or_equal'           => 'No se puede registrar un evento con una fecha anterior al día de hoy.',
            'hora_inicio.required'           => 'La hora de inicio es obligatoria.',
            'hora_inicio.date_format'        => 'El formato de hora de inicio no es válido.',
            'hora_fin.required'              => 'La hora de fin es obligatoria.',
            'hora_fin.date_format'           => 'El formato de hora de fin no es válido.',
            'hora_fin.after'                 => 'La hora de fin debe ser posterior a la hora de inicio.',
            'entidad_organizadora.required'  => 'La entidad organizadora es obligatoria.',
            'entidad_organizadora.max'       => 'La entidad organizadora no puede superar los 255 caracteres.',
            'direccion.required'             => 'La dirección es obligatoria.',
            'direccion.max'                  => 'La dirección no puede superar los 255 caracteres.',
            'comuna_id.required'             => 'La comuna es obligatoria.',
            'comuna_id.exists'               => 'La comuna seleccionada no es válida.',
            'barrio_id.required'             => 'El barrio es obligatorio.',
            'barrio_id.exists'               => 'El barrio seleccionado no es válido.',
        ]);

        $ahora      = Carbon::now();
        $fechaEvento = Carbon::parse($request->fecha);
        $horaInicio  = $request->hora_inicio;
        $horaFin     = $request->hora_fin;
        $horaActual  = $ahora->format('H:i');

        $estadoEvento = 'programado';
        $activo = true;

        if ($fechaEvento->toDateString() < $ahora->toDateString() ||
            ($fechaEvento->isToday() && $horaFin <= $horaActual)) {
            $estadoEvento = 'realizado';
            $activo = false;
        } elseif ($fechaEvento->isToday() && $horaInicio <= $horaActual) {
            $estadoEvento = 'en_curso';
        }

        Evento::create([
            'nombre'               => $request->nombre,
            'responsable_id'       => $request->responsable_id,
            'fecha'                => $request->fecha,
            'hora_inicio'          => $request->hora_inicio,
            'hora_fin'             => $request->hora_fin,
            'entidad_organizadora' => $request->entidad_organizadora,
            'direccion'            => $request->direccion,
            'comuna_id'            => $request->comuna_id,
            'barrio_id'            => $request->barrio_id,
            'estado'               => $activo,
            'estado_evento'        => $estadoEvento,
        ]);

        return redirect()
            ->route('gestion_eventos.index')
            ->with('success', 'Evento creado exitosamente.');
    }

    public function edit(Evento $gestion_evento)
    {
        if ($gestion_evento->estado_evento === 'realizado') {
            return redirect()
                ->route('gestion_eventos.index')
                ->with('error', 'El evento ya fue realizado y no puede ser modificado.');
        }

        return Inertia::render('gestion_eventos/edit', [
            'evento'   => $gestion_evento->load(['responsable:id,nombres,apellidos', 'comuna:id,nombre', 'barrio:id,nombre']),
            'usuarios' => User::where('estado', true)
                ->select('id', 'nombres', 'apellidos')
                ->orderBy('nombres')
                ->get(),
            'comunas' => Comuna::orderBy('id')->get(['id', 'nombre']),
            'barrios' => Barrio::orderBy('nombre')->get(['id', 'nombre', 'comuna_id']),
        ]);
    }

    public function update(Request $request, Evento $gestion_evento)
    {
        if ($gestion_evento->estado_evento === 'realizado') {
            return redirect()
                ->route('gestion_eventos.index')
                ->with('error', 'El evento ya fue realizado y no puede ser modificado.');
        }

        $request->validate([
            'nombre'               => 'required|string|max:255|unique:evento,nombre,' . $gestion_evento->id,
            'responsable_id'       => 'required|exists:usuario,id',
            'fecha'                => 'required|date|after_or_equal:today',
            'hora_inicio'          => 'required|date_format:H:i',
            'hora_fin'             => 'required|date_format:H:i|after:hora_inicio',
            'entidad_organizadora' => 'required|string|max:255',
            'direccion'            => 'required|string|max:255',
            'comuna_id'            => 'required|exists:comuna,id',
            'barrio_id'            => 'required|exists:barrio,id',
            'estado_evento'        => 'required|in:programado,en_curso,realizado,cancelado',
        ], [
            'nombre.required'                => 'El nombre del evento es obligatorio.',
            'nombre.unique'                  => 'Ya existe un evento con este nombre.',
            'nombre.max'                     => 'El nombre no puede superar los 255 caracteres.',
            'responsable_id.required'        => 'El responsable es obligatorio.',
            'responsable_id.exists'          => 'El responsable seleccionado no es válido.',
            'fecha.required'                 => 'La fecha es obligatoria.',
            'fecha.date'                     => 'El formato de fecha no es válido.',
            'fecha.after_or_equal'           => 'No se puede registrar un evento con una fecha anterior al día de hoy.',
            'hora_inicio.required'           => 'La hora de inicio es obligatoria.',
            'hora_inicio.date_format'        => 'El formato de hora de inicio no es válido.',
            'hora_fin.required'              => 'La hora de fin es obligatoria.',
            'hora_fin.date_format'           => 'El formato de hora de fin no es válido.',
            'hora_fin.after'                 => 'La hora de fin debe ser posterior a la hora de inicio.',
            'entidad_organizadora.required'  => 'La entidad organizadora es obligatoria.',
            'entidad_organizadora.max'       => 'La entidad organizadora no puede superar los 255 caracteres.',
            'direccion.required'             => 'La dirección es obligatoria.',
            'direccion.max'                  => 'La dirección no puede superar los 255 caracteres.',
            'comuna_id.required'             => 'La comuna es obligatoria.',
            'comuna_id.exists'               => 'La comuna seleccionada no es válida.',
            'barrio_id.required'             => 'El barrio es obligatorio.',
            'barrio_id.exists'               => 'El barrio seleccionado no es válido.',
            'estado_evento.required'         => 'El estado del evento es obligatorio.',
            'estado_evento.in'               => 'El estado del evento seleccionado no es válido.',
        ]);

        $ahora      = Carbon::now();
        $fechaEvento = Carbon::parse($request->fecha);
        $horaInicio  = $request->hora_inicio;
        $horaFin     = $request->hora_fin;
        $horaActual  = $ahora->format('H:i');

        // Si el usuario no marcó explícitamente un estado terminal, recalcular
        $estadoEvento = $request->estado_evento;
        $activo = !in_array($estadoEvento, ['realizado', 'cancelado']);

        // Auto-marcar como realizado si la fecha/hora ya pasó y no fue cancelado
        if ($estadoEvento === 'programado' &&
            ($fechaEvento->toDateString() < $ahora->toDateString() ||
             ($fechaEvento->isToday() && $horaFin <= $horaActual))) {
            $estadoEvento = 'realizado';
            $activo = false;
        } elseif ($estadoEvento === 'programado' && $fechaEvento->isToday() && $horaInicio <= $horaActual) {
            $estadoEvento = 'en_curso';
        }

        $gestion_evento->update([
            'nombre'               => $request->nombre,
            'responsable_id'       => $request->responsable_id,
            'fecha'                => $request->fecha,
            'hora_inicio'          => $request->hora_inicio,
            'hora_fin'             => $request->hora_fin,
            'entidad_organizadora' => $request->entidad_organizadora,
            'direccion'            => $request->direccion,
            'comuna_id'            => $request->comuna_id,
            'barrio_id'            => $request->barrio_id,
            'estado'               => $activo,
            'estado_evento'        => $estadoEvento,
        ]);

        return redirect()
            ->route('gestion_eventos.index')
            ->with('success', 'Evento actualizado correctamente.');
    }

    /**
     * Activa o cancela el evento.
     *
     * Cancelar por aquí sustituye al antiguo destroy(), que hacía lo mismo por
     * una ruta aparte y con un permiso que no existía en la base de datos.
     */
    public function toggle(Evento $gestion_evento)
    {
        if ($gestion_evento->estado_evento === 'realizado') {
            return redirect()
                ->route('gestion_eventos.index')
                ->with('error', 'El evento ya fue realizado y no puede ser reactivado.');
        }

        $nuevoEstado = !$gestion_evento->estado;
        $estadoEvento = $nuevoEstado ? 'programado' : 'cancelado';

        $gestion_evento->update([
            'estado'        => $nuevoEstado,
            'estado_evento' => $estadoEvento,
        ]);

        $mensaje = $nuevoEstado ? 'activado' : 'cancelado';

        return redirect()
            ->route('gestion_eventos.index')
            ->with('success', "Evento {$mensaje} correctamente.");
    }

    public function exportarListadoEventos(Request $request)
    {
        $search = $request->get('search');
        $tipo   = $request->get('tipo', 'xlsx');

        if ($tipo === 'csv') {
            return Excel::download(
                new EventosExport($search),
                'eventos_' . now()->format('YmdHis') . '.csv',
                \Maatwebsite\Excel\Excel::CSV
            );
        }

        return Excel::download(
            new EventosExport($search),
            'eventos_' . now()->format('YmdHis') . '.xlsx'
        );
    }

    public function exportarSolicitudes(Evento $gestion_evento)
    {
        $nombre = 'solicitudes_evento_' . $gestion_evento->id . '.xlsx';
        return Excel::download(new SolicitudesEventoExport($gestion_evento->id), $nombre);
    }

    public function exportarAtenciones(Evento $gestion_evento)
    {
        $nombre = 'atenciones_evento_' . $gestion_evento->id . '.xlsx';
        return Excel::download(new AtencionesEventoExport($gestion_evento->id), $nombre);
    }
}

