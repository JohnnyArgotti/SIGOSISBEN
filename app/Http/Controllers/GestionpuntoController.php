<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\PuntoAtencion;
use App\Exports\PuntosAtencionExport;
use Maatwebsite\Excel\Facades\Excel;

class GestionpuntoController extends Controller
{
    public function index()
    {
        return Inertia::render('parametrizacion/gestion_puntos/index', [
            'puntos' => PuntoAtencion::orderBy('id')->get(),
        ]);
    }

    public function create()
    {
        return Inertia::render('parametrizacion/gestion_puntos/create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:255|unique:punto_atencion,nombre',
            'estado' => 'boolean',
        ]);

        PuntoAtencion::create([
            'nombre' => $request->nombre,
            'estado' => $request->boolean('estado', true),
        ]);

        return redirect()
            ->route('gestion_puntos.index')
            ->with('success', 'Punto creado exitosamente.');
    }

    public function edit(PuntoAtencion $gestion_punto)
    {
        return Inertia::render('parametrizacion/gestion_puntos/edit', [
            'punto' => $gestion_punto,
        ]);
    }

    public function update(Request $request, PuntoAtencion $gestion_punto)
    {
        $request->validate([
            'nombre' => 'required|string|max:255|unique:punto_atencion,nombre,' . $gestion_punto->id,
        ]);

        $gestion_punto->update([
            'nombre' => $request->nombre,
        ]);

        return redirect()
            ->route('gestion_puntos.index')
            ->with('success', 'Punto actualizado correctamente.');
    }

    public function exportar(Request $request)
    {
        $tipo = $request->get('tipo', 'xlsx');

        if ($tipo === 'csv') {
            return Excel::download(
                new PuntosAtencionExport(),
                'puntos_atencion_' . now()->format('YmdHis') . '.csv',
                \Maatwebsite\Excel\Excel::CSV
            );
        }

        return Excel::download(
            new PuntosAtencionExport(),
            'puntos_atencion_' . now()->format('YmdHis') . '.xlsx'
        );
    }

    /**
     * Activa o desactiva el punto de atención.
     *
     * Desactivar por aquí sustituye al antiguo destroy(), que hacía exactamente
     * lo mismo desde una ruta aparte y bajo el permiso de edición.
     */
    public function toggle(PuntoAtencion $gestion_punto)
    {
        $nuevoEstado = !$gestion_punto->estado;
        $gestion_punto->update(['estado' => $nuevoEstado]);

        $mensaje = $nuevoEstado ? 'activado' : 'desactivado';

        return redirect()
            ->route('gestion_puntos.index')
            ->with('success', "Punto {$mensaje} correctamente.");
    }
}
