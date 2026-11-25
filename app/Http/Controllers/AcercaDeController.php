<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\DocumentoPublico;

class AcercaDeController extends Controller
{
    public function index()
    {
        return Inertia::render('acerca_de/index', [
            'documentos' => DocumentoPublico::where('estado', true)
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'enlace']),
        ]);
    }
}
