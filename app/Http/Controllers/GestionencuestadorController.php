<?php

namespace App\Http\Controllers;

use App\Models\Encuestador;
use App\Models\TipoDocumento;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Exports\EncuestadoresExport;
use Maatwebsite\Excel\Facades\Excel;

class GestionencuestadorController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->get('search');

        $query = Encuestador::with('tipoDocumento');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('codigo', 'like', "%{$search}%")
                  ->orWhere('num_documento', 'like', "%{$search}%");
            });
        }

        $encuestadores = $query
            ->orderByDesc('id')
            ->paginate(10)
            ->through(function ($e) {
                return [
                    'id' => $e->id,
                    'codigo' => $e->codigo,
                    'nombres' => $e->nombres,
                    'apellidos' => $e->apellidos,
                    'num_documento' => $e->num_documento,
                    'telefono' => $e->telefono,
                    'estado' => $e->estado,
                    'creado_el' => $e->creado_el,
                    'actualizado_el' => $e->actualizado_el,

                    'tipo_documento' => $e->tipoDocumento
                        ? [
                            'id' => $e->tipoDocumento->id,
                            'nombre' => $e->tipoDocumento->nombre,
                            'codigo' => $e->tipoDocumento->codigo,
                        ]
                        : null,
                ];
            });

        return Inertia::render('gestion_encuestadores/index', [
            'encuestadores' => $encuestadores,
            'filters' => [
                'search' => $search
            ]
        ]);
    }

    public function create()
    {
        return Inertia::render('gestion_encuestadores/create', [
            'tiposDocumento' => TipoDocumento::select('id', 'nombre', 'codigo')
                ->orderBy('nombre')
                ->get()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tipo_documento_id' => 'required|exists:tipo_documento,id',
            'nombres' => 'required|string|max:100',
            'apellidos' => 'required|string|max:100',
            'num_documento' => 'required|string|max:20|unique:encuestador,num_documento',
            'telefono' => 'nullable|string|max:20',
        ]);

        $validated['nombres'] = strtoupper(trim($validated['nombres']));
        $validated['apellidos'] = strtoupper(trim($validated['apellidos']));
        $validated['num_documento'] = $validated['num_documento']
            ? trim($validated['num_documento'])
            : null;
        $validated['telefono'] = $validated['telefono']
            ? trim($validated['telefono'])
            : null;

        Encuestador::create($validated);

        return redirect()
            ->route('gestion_encuestadores.index')
            ->with('success', 'Encuestador creado correctamente.');
    }

    public function edit($id)
    {
        $e = Encuestador::findOrFail($id);

        return Inertia::render('gestion_encuestadores/edit', [
            'encuestador' => [
                'id' => $e->id,
                'codigo' => $e->codigo,
                'nombres' => $e->nombres,
                'apellidos' => $e->apellidos,
                'num_documento' => $e->num_documento,
                'telefono' => $e->telefono,
                'tipo_documento_id' => $e->tipo_documento_id,
            ],
            'tiposDocumento' => TipoDocumento::select('id', 'nombre', 'codigo')->get()
        ]);
    }

    public function update(Request $request, $id)
    {
        $e = Encuestador::findOrFail($id);

        $validated = $request->validate([
            'tipo_documento_id' => 'required|exists:tipo_documento,id',
            'nombres' => 'required|string|max:100',
            'apellidos' => 'required|string|max:100',
            'num_documento' => 'required|string|max:20',
            'telefono' => 'nullable|string|max:20',
        ]);

        $validated['nombres'] = strtoupper(trim($validated['nombres']));
        $validated['apellidos'] = strtoupper(trim($validated['apellidos']));
        $validated['num_documento'] = $validated['num_documento']
            ? trim($validated['num_documento'])
            : null;

        $e->update($validated);

        return redirect()
            ->route('gestion_encuestadores.index')
            ->with('success', 'Encuestador actualizado.');
    }


    public function exportar(Request $request)
    {
        $search = $request->get('search');
        $tipo   = $request->get('tipo', 'xlsx');

        if ($tipo === 'csv') {
            return Excel::download(
                new EncuestadoresExport($search),
                'encuestadores_' . now()->format('YmdHis') . '.csv',
                \Maatwebsite\Excel\Excel::CSV
            );
        }

        return Excel::download(
            new EncuestadoresExport($search),
            'encuestadores_' . now()->format('YmdHis') . '.xlsx'
        );
    }

    public function toggle(Encuestador $gestion_encuestador)
    {
        $nuevoEstado = !$gestion_encuestador->estado;
        $gestion_encuestador->update(['estado' => $nuevoEstado]);

        $mensaje = $nuevoEstado ? 'activado' : 'desactivado';

        return redirect()
            ->route('gestion_encuestadores.index')
            ->with('success', "Encuestador {$mensaje} correctamente.");
    }
}
