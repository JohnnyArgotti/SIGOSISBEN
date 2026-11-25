<?php

namespace App\Http\Controllers;

use App\Exports\AuditoriaExport;
use App\Models\Auditoria;
use App\Support\FechaFiltro;
use App\Models\Encuestador;
use App\Models\Solicitud;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class GestionauditoriaController extends Controller
{
    /**
     * Catálogo legible de eventos auditables.
     */
    public const EVENTOS = [
        'creado'                => 'Creación',
        'actualizado'           => 'Actualización',
        'eliminado'             => 'Eliminación',
        'login_exitoso'         => 'Inicio de sesión',
        'login_fallido'         => 'Inicio de sesión fallido',
        'cuenta_bloqueada'      => 'Cuenta bloqueada',
        'envio_a_campo_masivo'  => 'Envío masivo a campo',
        'exporto'               => 'Exportación',
    ];

    public function index(Request $request)
    {
        $registros = $this->construirConsulta($request)
            ->with('usuario:id,nombres,apellidos,nombre_usuario')
            ->orderByDesc('creado_el')
            ->orderByDesc('id')
            ->paginate(20, ['*'], 'pagina', $request->get('pagina', 1))
            ->withQueryString()
            ->through(fn (Auditoria $a) => $this->transformar($a));

        return Inertia::render('gestion_auditoria/index', [
            'registros' => $registros,
            'eventos'   => self::EVENTOS,
            'usuarios'  => fn () => User::orderBy('nombres')
                ->get(['id', 'nombres', 'apellidos'])
                ->map(fn ($u) => [
                    'id'     => $u->id,
                    'nombre' => trim($u->nombres . ' ' . $u->apellidos),
                ]),
            'filters' => [
                'search'       => $request->get('search', ''),
                'evento'       => $request->get('evento', ''),
                'usuario_id'   => $request->get('usuario_id', ''),
                'entidad'      => $request->get('entidad', ''),
                'fecha_inicio' => $request->get('fecha_inicio', ''),
                'fecha_fin'    => $request->get('fecha_fin', ''),
            ],
        ]);
    }

    public function show(int $id)
    {
        $registro = Auditoria::with('usuario:id,nombres,apellidos,nombre_usuario')->findOrFail($id);

        return response()->json($this->transformar($registro, true));
    }

    public function exportar(Request $request)
    {
        $tipo = $request->get('tipo', 'xlsx');

        $export = new AuditoriaExport($request);

        if ($tipo === 'csv') {
            return Excel::download($export, 'auditoria.csv', \Maatwebsite\Excel\Excel::CSV);
        }

        return Excel::download($export, 'auditoria.xlsx');
    }

    /**
     * Construye la consulta base aplicando los filtros recibidos.
     * Reutilizada por el listado y la exportación.
     */
    public static function construirConsulta(Request $request)
    {
        $query = Auditoria::query();

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('descripcion', 'like', "%{$search}%")
                  ->orWhere('entidad', 'like', "%{$search}%")
                  ->orWhere('ip', 'like', "%{$search}%");
            });
        }

        if ($evento = $request->get('evento')) {
            $query->where('evento', $evento);
        }

        if ($usuarioId = $request->get('usuario_id')) {
            $query->where('usuario_id', $usuarioId);
        }

        if ($entidad = $request->get('entidad')) {
            $query->where('entidad', $entidad);
        }

        $fechaInicio = FechaFiltro::valida($request->get('fecha_inicio'));
        $fechaFin    = FechaFiltro::valida($request->get('fecha_fin'));

        if ($fechaInicio) {
            $query->where('creado_el', '>=', Carbon::parse($fechaInicio)->startOfDay());
        }

        if ($fechaFin) {
            $query->where('creado_el', '<=', Carbon::parse($fechaFin)->endOfDay());
        }

        return $query;
    }

    /**
     * Caché estático por request para evitar queries duplicadas al resolver
     * etiquetas de entidades dentro de la misma página.
     */
    private static array $etiquetaCache = [];

    protected function transformar(Auditoria $a, bool $detalle = false): array
    {
        $entidadLabel = null;

        if ($a->entidad && $a->entidad_id) {
            $cacheKey = "{$a->entidad}:{$a->entidad_id}";

            if (!array_key_exists($cacheKey, self::$etiquetaCache)) {
                $id = (int) $a->entidad_id;

                self::$etiquetaCache[$cacheKey] = match ($a->entidad) {
                    'Solicitud'   => Solicitud::find($id)?->id_SisbenApp    ?? "#{$id}",
                    'Usuario'     => User::find($id)?->nombre_usuario        ?? "#{$id}",
                    'Encuestador' => Encuestador::find($id)?->codigo         ?? "#{$id}",
                    default       => "#{$id}",
                };
            }

            $entidadLabel = self::$etiquetaCache[$cacheKey];
        }

        return [
            'id'            => $a->id,
            'evento'        => $a->evento,
            'evento_label'  => self::EVENTOS[$a->evento] ?? $a->evento,
            'entidad'       => $a->entidad,
            'entidad_id'    => $a->entidad_id,
            'entidad_label' => $entidadLabel,
            'descripcion'   => $a->descripcion,
            'usuario'       => $a->usuario
                ? trim($a->usuario->nombres . ' ' . $a->usuario->apellidos)
                : 'Sistema / Anónimo',
            'ip'            => $a->ip,
            'creado_el'     => $a->creado_el ? Carbon::parse($a->creado_el)->format('d/m/Y H:i:s') : null,
            'valores_anteriores' => $detalle ? $a->valores_anteriores : null,
            'valores_nuevos'     => $detalle ? $a->valores_nuevos     : null,
            'metodo_http'   => $detalle ? $a->metodo_http : null,
            'tiene_cambios' => !empty($a->valores_anteriores) || !empty($a->valores_nuevos),
        ];
    }
}
