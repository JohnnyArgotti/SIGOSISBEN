<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use App\Models\DocumentoPublico;

class GestiondocumentopublicoController extends Controller
{
    public function index()
    {
        return Inertia::render('parametrizacion/gestion_documentos_publicos/index', [
            'documentos' => DocumentoPublico::orderBy('id')->get(),
        ]);
    }

    public function create()
    {
        return Inertia::render('parametrizacion/gestion_documentos_publicos/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->reglas());

        DocumentoPublico::create([
            'nombre' => $validated['nombre'],
            'enlace' => $validated['enlace'],
            'estado' => true,
        ]);

        return redirect()
            ->route('gestion_documentos_publicos.index')
            ->with('success', 'Documento creado exitosamente.');
    }

    public function edit(DocumentoPublico $gestion_documento_publico)
    {
        return Inertia::render('parametrizacion/gestion_documentos_publicos/edit', [
            'documento' => $gestion_documento_publico,
        ]);
    }

    public function update(Request $request, DocumentoPublico $gestion_documento_publico)
    {
        $validated = $request->validate($this->reglas($gestion_documento_publico->id));

        $gestion_documento_publico->update([
            'nombre' => $validated['nombre'],
            'enlace' => $validated['enlace'],
        ]);

        return redirect()
            ->route('gestion_documentos_publicos.index')
            ->with('success', 'Documento actualizado correctamente.');
    }

    public function toggle(DocumentoPublico $gestion_documento_publico)
    {
        $nuevoEstado = !$gestion_documento_publico->estado;
        $gestion_documento_publico->update(['estado' => $nuevoEstado]);

        $mensaje = $nuevoEstado ? 'activado' : 'desactivado';

        return redirect()
            ->route('gestion_documentos_publicos.index')
            ->with('success', "Documento {$mensaje} correctamente.");
    }

    /**
     * El enlace se publica en "Acerca de", que no exige sesión: solo se
     * aceptan URL https para que no se pueda guardar un `javascript:` u otro
     * esquema que termine ejecutándose en el navegador de quien lo abra.
     */
    private function reglas(?int $ignorarId = null): array
    {
        return [
            'nombre' => [
                'required',
                'string',
                'max:150',
                Rule::unique('documento_publico', 'nombre')->ignore($ignorarId),
            ],
            'enlace' => [
                'required',
                'string',
                'max:2048',
                'url:https',
            ],
        ];
    }
}
