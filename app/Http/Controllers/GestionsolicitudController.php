<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;
use App\Models\Atencion;
use App\Models\Barrio;
use App\Models\Ciudadano;
use App\Models\Solicitud;
use App\Models\TipoDocumento;
use App\Models\TipoTramite;
use App\Models\TipoConsulta;
use App\Models\Comuna;
use App\Models\Canal;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Carbon\Carbon;
use App\Exports\SolicitudesEfectivasExport;
use App\Exports\AtencionesNoEfectivasExport;
use App\Services\AuditoriaService;
use App\Support\FechaFiltro;
use App\Support\PlazoEdicion;
use Maatwebsite\Excel\Facades\Excel;

class GestionsolicitudController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $searchSolicitudes = $request->get('searchSolicitudes');
        $searchAtenciones = $request->get('searchAtenciones');
        $filtroAsistencial = $request->get('filtroAsistencial');
        $filtroAsistencialAtencion = $request->get('filtroAsistencialAtencion');
        $fechaInicio = FechaFiltro::valida($request->get('fechaInicio'));
        $fechaFin = FechaFiltro::valida($request->get('fechaFin'));
        $fechaInicioAtencion = FechaFiltro::valida($request->get('fechaInicioAtencion'));
        $fechaFinAtencion = FechaFiltro::valida($request->get('fechaFinAtencion'));
        $paginaSolicitudes = $request->get('paginaSolicitudes', 1);
        $paginaAtenciones = $request->get('paginaAtenciones', 1);

        $solicitudesQuery = $this->solicitudesFiltradas($searchSolicitudes, $filtroAsistencial, $fechaInicio, $fechaFin)
            ->with([
                'usuario:id,nombres,apellidos',
                'ciudadano:id,nombre_completo,num_documento,tipo_documento_id,telefono',
                'ciudadano.tipoDocumento:id,nombre',
                'tipoTramite:id,nombre',
                'puntoAtencion:id,nombre',
                'evento:id,nombre',
                'canal:id,nombre',
                'comuna:id,nombre',
                'barrio:id,nombre',
            ])
            ->select([
                'id',
                'id_SisbenApp',
                'num_radicado',
                'tipo_tramite_id',
                'punto_atencion_id',
                'evento_id',
                'canal_id',
                'usuario_id',
                'ciudadano_id',
                'comuna_id',
                'barrio_id',
                'direccion',
                'observacion',
                'creado_el',
                'estado_gestion',
            ]);

        $totalRegistradasQuery = (clone $solicitudesQuery)->where('estado_gestion', 'registrada');

        $solicitudes = $solicitudesQuery
            ->orderByDesc('id')
            ->paginate(10, ['*'], 'paginaSolicitudes', $paginaSolicitudes)
            ->through(function ($s) {
                return [
                    'id' => $s->id,
                    'id_SisbenApp' => $s->id_SisbenApp,
                    'num_radicado' => $s->num_radicado,
                    'creado_el' => $s->creado_el,
                    'usuario' => $s->usuario ? [
                        'nombre_completo' => trim($s->usuario->nombres . ' ' . $s->usuario->apellidos),
                    ] : null,
                    'ciudadano' => $s->ciudadano ? [
                        'nombre_completo' => $s->ciudadano->nombre_completo,
                        'num_documento' => $s->ciudadano->num_documento,
                        'tipo_documento' => optional($s->ciudadano->tipoDocumento)->nombre,
                        'telefono' => $s->ciudadano->telefono,
                    ] : null,
                    'direccion' => $s->direccion,
                    'observacion' => $s->observacion,
                    'comuna' => $s->comuna ? ['nombre' => $s->comuna->nombre] : null,
                    'barrio' => $s->barrio ? ['nombre' => $s->barrio->nombre] : null,
                    'tipo_tramite' => $s->tipoTramite ? [
                        'nombre' => $s->tipoTramite->nombre,
                    ] : null,
                    'punto_atencion' => $s->puntoAtencion ? [
                        'nombre' => $s->puntoAtencion->nombre,
                    ] : null,
                    'evento' => $s->evento ? [
                        'nombre' => $s->evento->nombre,
                    ] : null,
                    'canal' => $s->canal ? [
                        'nombre' => $s->canal->nombre,
                    ] : null,
                    'estado_gestion' => $s->estado_gestion,
                ];
            });

        $atencionesQuery = Atencion::query()
            ->with([
                'usuario:id,nombres,apellidos',
                'ciudadano:id,nombre_completo,num_documento,tipo_documento_id',
                'ciudadano.tipoDocumento:id,nombre',
                'tipoConsulta:id,nombre',
                'puntoAtencion:id,nombre',
                'evento:id,nombre',
                'canal:id,nombre',
                'comuna:id,nombre',
                'barrio:id,nombre',
            ])
            ->select([
                'id',
                'usuario_id',
                'ciudadano_id',
                'tipo_consulta_id',
                'punto_atencion_id',
                'evento_id',
                'canal_id',
                'comuna_id',
                'barrio_id',
                'creado_el',
            ]);

        if ($searchAtenciones) {
            $atencionesQuery->whereHas('ciudadano', function ($q) use ($searchAtenciones) {
                $q->where('num_documento', 'like', "%{$searchAtenciones}%");
            });
        }

        if ($filtroAsistencialAtencion) {
            $atencionesQuery->whereHas('usuario', function ($q) use ($filtroAsistencialAtencion) {
                $q->whereRaw("CONCAT(nombres, ' ', apellidos) = ?", [$filtroAsistencialAtencion]);
            });
        }

        if ($fechaInicioAtencion && $fechaFinAtencion) {
            $atencionesQuery->whereBetween('creado_el', [
                Carbon::parse($fechaInicioAtencion)->startOfDay(),
                Carbon::parse($fechaFinAtencion)->endOfDay(),
            ]);
        }

        $atenciones = $atencionesQuery
            ->orderByDesc('id')
            ->paginate(10, ['*'], 'paginaAtenciones', $paginaAtenciones)
            ->through(function ($a) {
                return [
                    'id' => $a->id,
                    'creado_el' => $a->creado_el ? Carbon::parse($a->creado_el)->format('d/m/Y') : null,
                    'usuario' => $a->usuario ? [
                        'nombre_completo' => trim($a->usuario->nombres . ' ' . $a->usuario->apellidos),
                    ] : null,
                    'ciudadano' => $a->ciudadano ? [
                        'nombre_completo' => $a->ciudadano->nombre_completo,
                        'num_documento' => $a->ciudadano->num_documento,
                        'tipo_documento' => optional($a->ciudadano->tipoDocumento)->nombre,
                    ] : null,
                    'tipo_consulta' => $a->tipoConsulta ? [
                        'nombre' => $a->tipoConsulta->nombre,
                    ] : null,
                    'punto_atencion' => $a->puntoAtencion ? [
                        'nombre' => $a->puntoAtencion->nombre,
                    ] : null,
                    'evento' => $a->evento ? [
                        'nombre' => $a->evento->nombre,
                    ] : null,
                    'canal' => $a->canal ? [
                        'nombre' => $a->canal->nombre,
                    ] : null,
                    'comuna' => $a->comuna ? ['nombre' => $a->comuna->nombre] : null,
                    'barrio' => $a->barrio ? ['nombre' => $a->barrio->nombre] : null,
                ];
            });

        return Inertia::render('gestion_solicitudes/index', [
            'solicitudes' => $solicitudes,
            'totalRegistradas' => fn () => $totalRegistradasQuery->count(),
            'atenciones' => $atenciones,
            'asistencialesSolicitudes' => fn () => User::whereHas('solicitudes')
                ->selectRaw("CONCAT(nombres, ' ', apellidos) as nombre_completo")
                ->orderBy('nombres')
                ->pluck('nombre_completo'),
            'asistencialesAtenciones' => fn () => User::whereHas('atenciones')
                ->selectRaw("CONCAT(nombres, ' ', apellidos) as nombre_completo")
                ->orderBy('nombres')
                ->pluck('nombre_completo'),
            'filters' => [
                'searchSolicitudes' => $searchSolicitudes,
                'searchAtenciones' => $searchAtenciones,
                'filtroAsistencial' => $filtroAsistencial,
                'filtroAsistencialAtencion' => $filtroAsistencialAtencion,
                'fechaInicio' => $fechaInicio,
                'fechaFin' => $fechaFin,
                'fechaInicioAtencion' => $fechaInicioAtencion,
                'fechaFinAtencion' => $fechaFinAtencion,
            ],
        ]);
    }

    private function solicitudesFiltradas(?string $search, ?string $filtroAsistencial, ?string $fechaInicio, ?string $fechaFin)
    {
        $query = Solicitud::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('id_SisbenApp', 'like', "%{$search}%")
                  ->orWhere('num_radicado', 'like', "%{$search}%")
                  ->orWhereHas('ciudadano', function ($c) use ($search) {
                      $c->where('num_documento', 'like', "%{$search}%");
                  });
            });
        }

        if ($filtroAsistencial) {
            $query->whereHas('usuario', function ($q) use ($filtroAsistencial) {
                $q->whereRaw("CONCAT(nombres, ' ', apellidos) = ?", [$filtroAsistencial]);
            });
        }

        if ($fechaInicio && $fechaFin) {
            $query->whereBetween('creado_el', [
                Carbon::parse($fechaInicio)->startOfDay(),
                Carbon::parse($fechaFin)->endOfDay(),
            ]);
        }

        return $query;
    }

    public function idsRegistradas(Request $request)
    {
        $ids = $this->solicitudesFiltradas(
                $request->get('searchSolicitudes'),
                $request->get('filtroAsistencial'),
                FechaFiltro::valida($request->get('fechaInicio')),
                FechaFiltro::valida($request->get('fechaFin')),
            )
            ->where('estado_gestion', 'registrada')
            ->orderByDesc('id')
            ->pluck('id');

        return response()->json(['ids' => $ids]);
    }

    public function enviarACampo(int $id)
    {
        $solicitud = Solicitud::findOrFail($id);

        if ($solicitud->estado_gestion !== 'registrada') {
            return back()->with('error', 'Solo se pueden enviar a campo solicitudes en estado "registrada".');
        }

        $solicitud->update(['estado_gestion' => 'enviada_a_campo']);

        return back()->with('success', 'Solicitud enviada a campo correctamente.');
    }

    public function cancelar(Request $request, int $id)
    {
        $request->validate([
            'motivo_cancelacion' => ['nullable', 'string', 'max:2000'],
        ]);

        $solicitud = Solicitud::findOrFail($id);

        if ($solicitud->estado_gestion === 'cancelada') {
            return back()->with('error', 'La solicitud ya está cancelada.');
        }

        $motivo = $request->input('motivo_cancelacion') ?: $request->input('observacion');

        $solicitud->update([
            'estado_gestion'      => 'cancelada',
            'cancelada_por'       => Auth::id(),
            'cancelada_en'        => now(),
            'cancelada_desde'     => 'puntos',
            'motivo_cancelacion'  => $motivo,
        ]);

        return back()->with('success', 'Solicitud cancelada correctamente.');
    }

    public function enviarACampoMasivo(Request $request, AuditoriaService $auditoria)
    {
        $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:solicitud,id'],
        ]);

        // El update masivo se ejecuta a nivel de query builder y NO dispara los
        // eventos de modelo, por lo que se audita explícitamente.
        $idsAfectados = Solicitud::whereIn('id', $request->ids)
            ->where('estado_gestion', 'registrada')
            ->pluck('id')
            ->all();

        $actualizadas = Solicitud::whereIn('id', $idsAfectados)
            ->update(['estado_gestion' => 'enviada_a_campo']);

        if ($actualizadas > 0) {
            $auditoria->registrar(
                evento: 'envio_a_campo_masivo',
                entidad: 'Solicitud',
                descripcion: "Envío masivo a campo de {$actualizadas} solicitud(es).",
                nuevos: ['ids' => $idsAfectados, 'estado_gestion' => 'enviada_a_campo'],
            );
        }

        return back()->with('success', "{$actualizadas} solicitud(es) enviada(s) a campo correctamente.");
    }

    public function exportarEfectivas(Request $request, AuditoriaService $auditoria)
    {
        $tipo = $request->get('tipo', 'xlsx');

        $export = new SolicitudesEfectivasExport(
            $request->searchSolicitudes,
            $request->filtroAsistencial,
            FechaFiltro::valida($request->fechaInicio),
            FechaFiltro::valida($request->fechaFin)
        );

        $auditoria->registrar(
            evento: 'exporto',
            entidad: 'Solicitud',
            descripcion: "Exportó solicitudes efectivas en formato {$tipo}.",
        );

        if ($tipo === 'csv') {
            return Excel::download($export, 'solicitudes.csv', \Maatwebsite\Excel\Excel::CSV);
        }

        return Excel::download($export, 'solicitudes.xlsx');
    }

    public function exportarNoEfectivas(Request $request, AuditoriaService $auditoria)
    {
        $tipo = $request->get('tipo', 'xlsx');

        $export = new AtencionesNoEfectivasExport(
            $request->searchAtenciones,
            $request->filtroAsistencialAtencion,
            FechaFiltro::valida($request->fechaInicioAtencion),
            FechaFiltro::valida($request->fechaFinAtencion)
        );

        $auditoria->registrar(
            evento: 'exporto',
            entidad: 'Atencion',
            descripcion: "Exportó atenciones no efectivas en formato {$tipo}.",
        );

        if ($tipo === 'csv') {
            return Excel::download($export, 'atenciones.csv', \Maatwebsite\Excel\Excel::CSV);
        }

        return Excel::download($export, 'atenciones.xlsx');
    }


    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $tiposDocumento = TipoDocumento::select('id', 'nombre', 'codigo')->get();
        $tiposTramite   = TipoTramite::select('id', 'nombre', 'codigo')->get();
        $tiposConsulta = TipoConsulta::select('id', 'nombre')->get();
        $comunas = Comuna::select('id', 'nombre')->orderBy('id')->get();
        $canales = Canal::select('id', 'nombre')->get();
        $barrios = Barrio::select('id', 'nombre', 'comuna_id')->orderBy('nombre')->get();

        return Inertia::render('gestion_solicitudes/create', [
            'tiposDocumento'  => $tiposDocumento,
            'tiposTramite'    => $tiposTramite,
            'tiposConsulta'   => $tiposConsulta,
            'comunas'         => $comunas,
            'barrios'         => $barrios,
            'canales'         => $canales,
            'puntoAtencionId' => session('punto_atencion_id'),
            'eventoId'        => session('evento_id'),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $tipoSolicitud = $request->input('tipo_solicitud', 'efectiva');

        // La ruta admite a quien pueda crear cualquiera de los dos tipos,
        // porque el formulario es uno solo. Cuál se está creando solo se sabe
        // aquí, así que el permiso concreto se comprueba en este punto: sin
        // esto, quien solo puede registrar atenciones podría crear una
        // solicitud efectiva cambiando el tipo en la petición.
        $permisoRequerido = $tipoSolicitud === 'efectiva'
            ? 'Crear solicitudes'
            : 'Crear atenciones';

        abort_unless(
            auth()->user()->can($permisoRequerido),
            403,
            'No tiene permisos para registrar este tipo de atención.',
        );

        $rulesComunes = [
            'nombre'            => 'required|string|max:255',
            'documento'         => 'required|string|max:50',
            'tipo_documento_id' => 'required|exists:tipo_documento,id',
            'telefono'          => 'nullable|string|max:20',
            'comuna_id'         => 'required|exists:comuna,id',
            'barrio_id'         => 'nullable|exists:barrio,id',
            'barrio'            => 'nullable|string|max:255',
            'canal_id'          => session('punto_atencion_id') == 1
                ? 'required|exists:canal,id'
                : 'nullable|exists:canal,id',
        ];

        $enEvento = (bool) session('evento_id');
        $puntoId  = $enEvento ? null : session('punto_atencion_id');
        $eventoId = $enEvento ? session('evento_id') : null;

        if ($tipoSolicitud === 'efectiva') {
            $rulesEfectiva = [
                'id_sisben_app'    => 'nullable|string|max:100|unique:solicitud,id_SisbenApp',
                'radicado'         => 'nullable|string|max:100',
                'tipo_tramite_id'  => 'required|exists:tipo_tramite,id',
                'direccion'        => 'nullable|string|max:255',
                'observacion'      => 'nullable|string',
            ];

            $validated = $request->validate(array_merge($rulesComunes, $rulesEfectiva));
        } else {
            $rulesNoEfectiva = [
                'tipo_consulta_id' => 'required|exists:tipo_consulta,id',
                'fecha'            => 'nullable|date',
            ];

            $validated = $request->validate(array_merge($rulesComunes, $rulesNoEfectiva));
        }

        $ciudadano = Ciudadano::firstOrCreate(
            ['num_documento' => $validated['documento']],
            [
                'nombre_completo'  => $validated['nombre'],
                'tipo_documento_id' => $validated['tipo_documento_id'],
                'telefono'         => $validated['telefono'] ?? null,
                'estado'           => 1,
            ]
        );
        $barrio_id = $validated['barrio_id'] ?? null;

        if (!$barrio_id && !empty($validated['barrio'])) {
            $barrio = Barrio::firstOrCreate(
                [
                    'nombre'    => $validated['barrio'],
                    'comuna_id' => $validated['comuna_id'],
                ],
                ['estado' => 1]
            );
            $barrio_id = $barrio->id;
        }

        if ($tipoSolicitud === 'efectiva') {
            Solicitud::create([
                'usuario_id'        => auth()->id(),
                'id_SisbenApp'      => $validated['id_sisben_app'] ?? null,
                'num_radicado'      => $validated['radicado'] ?? null,
                'tipo_tramite_id'   => $validated['tipo_tramite_id'],
                'punto_atencion_id' => $puntoId,
                'evento_id'         => $eventoId,
                'ciudadano_id'      => $ciudadano->id,
                'comuna_id'         => $validated['comuna_id'],
                'barrio_id'         => $barrio_id,
                'canal_id'          => $validated['canal_id'],
                'observacion'       => $validated['observacion'] ?? null,
                'direccion'         => $validated['direccion'] ?? null,
                'estado'            => 1,
            ]);

            return redirect()
                ->route('gestion_solicitudes.index')
                ->with('success', 'Solicitud efectiva registrada correctamente.');
        } else {
            Atencion::create([
                'usuario_id'        => auth()->id(),
                'tipo_consulta_id'  => $validated['tipo_consulta_id'],
                'fecha'             => $validated['fecha'] ?? now(),
                'punto_atencion_id' => $puntoId,
                'evento_id'         => $eventoId,
                'ciudadano_id'      => $ciudadano->id,
                'comuna_id'         => $validated['comuna_id'],
                'barrio_id'         => $barrio_id,
                'canal_id'          => $validated['canal_id'],
            ]);

            return redirect()
                ->route('gestion_solicitudes.index')
                ->with('success', 'Atención no efectiva registrada correctamente.');
        }
    }

    /**
     * Evalúa las reglas de edición de una solicitud para el usuario actual.
     *
     * Devuelve null cuando puede editarla, o el motivo del bloqueo:
     * 'permiso', 'propiedad' o 'plazo'. Las dos últimas restricciones se
     * levantan con los permisos de excepción correspondientes, que es lo que
     * antes resolvía el bypass fijo del rol Administrador.
     */
    private function bloqueoEdicionSolicitud(Solicitud $solicitud): ?string
    {
        $user = auth()->user();

        if (!$user || !$user->can('Editar solicitudes')) {
            return 'permiso';
        }

        if ($solicitud->usuario_id !== $user->id
            && !$user->can('Editar solicitudes de otros usuarios')) {
            return 'propiedad';
        }

        if (PlazoEdicion::vencido($solicitud->creado_el)
            && !$user->can('Editar solicitudes fuera de plazo')) {
            return 'plazo';
        }

        return null;
    }

    /**
     * Indica si el usuario actual puede editar la solicitud.
     */
    private function puedeEditarSolicitud(Solicitud $solicitud): bool
    {
        return $this->bloqueoEdicionSolicitud($solicitud) === null;
    }

    /**
     * Redirección con el mensaje que corresponde al motivo del bloqueo.
     */
    private function respuestaBloqueoSolicitud(Solicitud $solicitud, string $motivo, string $verbo)
    {
        if ($motivo === 'plazo') {
            return redirect()
                ->route('gestion_solicitudes.show', $solicitud->id)
                ->with('error', 'El plazo de ' . PlazoEdicion::HORAS
                    . " horas para {$verbo} la solicitud ya venció.");
        }

        return redirect()
            ->route('gestion_solicitudes.index')
            ->with('error', $motivo === 'propiedad'
                ? "No está autorizado para {$verbo} esta solicitud porque la registró otro usuario."
                : "No tiene permisos para {$verbo} esta solicitud.");
    }

    public function show($id)
    {
        $solicitud = Solicitud::with([
            'ciudadano.tipoDocumento',
            'tipoTramite',
            'canal',
            'puntoAtencion',
            'evento',
            'usuario',
            'canceladaPor',
            'comuna',
            'barrio',
        ])->findOrFail($id);

        $solicitudesRelacionadas = Solicitud::with(['tipoTramite', 'canal', 'puntoAtencion', 'evento'])
            ->where('num_radicado', $solicitud->num_radicado)
            ->whereNotNull('num_radicado')
            ->where('id', '<>', $solicitud->id)
            ->orderByDesc('creado_el')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'tipo_tramite' => optional($item->tipoTramite)->nombre ?? '—',
                    'canal' => optional($item->canal)->nombre ?? '—',
                    'punto' => optional($item->puntoAtencion)->nombre ?? optional($item->evento)->nombre ?? '—',
                    'creado_el' => Carbon::parse($item->creado_el)->format('d/m/Y H:i'),
                ];
            });

        return Inertia::render('gestion_solicitudes/show', [
            'solicitud' => [
                'id'            => $solicitud->id,
                'ciudadano'     => optional($solicitud->ciudadano)->nombre_completo ?? '—',
                'tipo_documento' => optional(optional($solicitud->ciudadano)->tipoDocumento)->codigo ?? '—',
                'num_documento' => optional($solicitud->ciudadano)->num_documento ?? '—',
                'telefono'      => optional($solicitud->ciudadano)->telefono ?? '—',
                'tipo_tramite'  => optional($solicitud->tipoTramite)->nombre ?? '—',
                'canal'         => optional($solicitud->canal)->nombre ?? '—',
                'punto'         => optional($solicitud->puntoAtencion)->nombre ?? optional($solicitud->evento)->nombre ?? '—',
                'asistencial'   => optional($solicitud->usuario)
                    ? trim(($solicitud->usuario->nombres ?? '') . ' ' . ($solicitud->usuario->apellidos ?? ''))
                    : '—',
                'id_sisben_app' => $solicitud->id_SisbenApp ?? '—',
                'num_radicado'  => $solicitud->num_radicado ?? '—',
                'observacion'   => $solicitud->observacion ?? '—',
                'direccion'     => $solicitud->direccion ?? '—',
                'estado_gestion'=> $solicitud->estado_gestion ?? '—',
                'cancelacion'   => $solicitud->cancelacionVista(),
                'creado_el'     => Carbon::parse($solicitud->creado_el)->format('d/m/Y H:i'),
                'creado_el_raw' => $solicitud->creado_el,
                // El plazo de edición lo resuelve el servidor para no depender
                // de la zona horaria del navegador.
                'puede_editar'         => $this->puedeEditarSolicitud($solicitud),
                'plazo_edicion_horas'  => PlazoEdicion::HORAS,
                'fecha_limite_edicion' => PlazoEdicion::limite($solicitud->creado_el)->format('d/m/Y H:i'),
                'plazo_edicion_vencido' => PlazoEdicion::vencido($solicitud->creado_el),
                'comuna'        => optional($solicitud->comuna)->nombre ?? '—',
                'barrio'        => optional($solicitud->barrio)->nombre ?? '—',
                'usuario'       => $solicitud->usuario,
                // Los datos de encuesta (paquete, encuestador, visitas y fechas de
                // ejecución/notificación) no se muestran en este módulo: se consultan
                // en el detalle de gestión de campo y de gestión de calidad.
            ],
            'solicitudesRelacionadas' => $solicitudesRelacionadas,
        ]);
    }


    public function edit($id)
    {
        $solicitud = Solicitud::with(['ciudadano', 'comuna', 'barrio', 'tipoTramite', 'canal'])
            ->findOrFail($id);

        if ($motivo = $this->bloqueoEdicionSolicitud($solicitud)) {
            return $this->respuestaBloqueoSolicitud($solicitud, $motivo, 'editar');
        }

        $tiposDocumento = TipoDocumento::select('id', 'nombre', 'codigo')->get();
        $tiposTramite   = TipoTramite::select('id', 'nombre', 'codigo')->get();
        $comunas = Comuna::select('id', 'nombre')->orderBy('id')->get();
        $canales = Canal::select('id', 'nombre')->get();
        $barrios = Barrio::select('id', 'nombre', 'comuna_id')->orderBy('nombre')->get();

        return Inertia::render('gestion_solicitudes/edit', [
            'tiposDocumento'  => $tiposDocumento,
            'tiposTramite'    => $tiposTramite,
            'comunas'         => $comunas,
            'barrios'         => $barrios,
            'canales'         => $canales,
            'puntoAtencionId' => session('punto_atencion_id'),
            'solicitud'      => [
                'id'             => $solicitud->id,
                'id_SisbenApp'   => $solicitud->id_SisbenApp,
                'num_radicado'   => $solicitud->num_radicado,
                'tipo_tramite_id' => $solicitud->tipo_tramite_id,
                'punto_atencion_id' => $solicitud->punto_atencion_id,
                'comuna_id'      => $solicitud->comuna_id,
                'barrio_id'      => $solicitud->barrio_id,
                'canal_id'       => $solicitud->canal_id,
                'direccion'      => $solicitud->direccion,
                'observacion'    => $solicitud->observacion,
                'ciudadano'      => [
                    'nombre_completo' => optional($solicitud->ciudadano)->nombre_completo ?? '',
                    'num_documento'   => optional($solicitud->ciudadano)->num_documento ?? '',
                    'telefono'        => optional($solicitud->ciudadano)->telefono ?? '',
                    'tipo_documento_id' => optional($solicitud->ciudadano)->tipo_documento_id ?? null,
                    'comuna_id'       => optional($solicitud->ciudadano)->comuna_id ?? null,
                    'barrio_id'       => optional($solicitud->ciudadano)->barrio_id ?? null,
                    'direccion'       => optional($solicitud->ciudadano)->direccion ?? '',
                ],
                'creado_el' => Carbon::parse($solicitud->creado_el)->format('Y-m-d'),
            ],
        ]);
    }

    public function update(Request $request, $id)
    {
        $solicitud = Solicitud::findOrFail($id);

        if ($motivo = $this->bloqueoEdicionSolicitud($solicitud)) {
            return $this->respuestaBloqueoSolicitud($solicitud, $motivo, 'actualizar');
        }

        $rules = [
            'nombre'            => 'required|string|max:255',
            'documento'         => 'required|string|max:50',
            'tipo_documento_id' => 'required|exists:tipo_documento,id',
            'telefono'          => 'nullable|string|max:20',
            'comuna_id'         => 'required|exists:comuna,id',
            'barrio_id'         => 'nullable|exists:barrio,id',
            'barrio'            => 'nullable|string|max:255',
            'canal_id'          => session('punto_atencion_id') == 1
                ? 'required|exists:canal,id'
                : 'nullable|exists:canal,id',
            'id_sisben_app'     => ['nullable', 'string', 'max:100', Rule::unique('solicitud', 'id_SisbenApp')->ignore($id)],
            'radicado'          => 'nullable|string|max:100',
            'tipo_tramite_id'  => 'required|exists:tipo_tramite,id',
            'direccion'        => 'nullable|string|max:255',
            'observacion'      => 'nullable|string',
        ];

        $validated = $request->validate($rules);

        $ciudadano = Ciudadano::where('num_documento', $validated['documento'])->first();

        if (!$ciudadano) {
            $ciudadano = Ciudadano::create([
                'nombre_completo'  => $validated['nombre'],
                'num_documento'    => $validated['documento'],
                'tipo_documento_id' => $validated['tipo_documento_id'],
                'telefono'         => $validated['telefono'] ?? null,
                'estado'           => 1,
            ]);
        } else {
            $ciudadano->update([
                'nombre_completo'   => $validated['nombre'],
                'tipo_documento_id' => $validated['tipo_documento_id'],
                'telefono'          => $validated['telefono'] ?? null,
            ]);
        }

        $barrio_id = $validated['barrio_id'] ?? null;

        if (!$barrio_id && !empty($validated['barrio'])) {
            $barrio = Barrio::firstOrCreate(
                [
                    'nombre'    => $validated['barrio'],
                    'comuna_id' => $validated['comuna_id'],
                ],
                ['estado' => 1]
            );
            $barrio_id = $barrio->id;
        }

        $solicitud->update([
            'id_SisbenApp'     => $validated['id_sisben_app'] ?? $solicitud->id_SisbenApp,
            'num_radicado'     => $validated['radicado'] ?? $solicitud->num_radicado,
            'tipo_tramite_id'  => $validated['tipo_tramite_id'],
            'ciudadano_id'     => $ciudadano->id,
            'comuna_id'        => $validated['comuna_id'],
            'barrio_id'        => $barrio_id,
            'canal_id'         => $validated['canal_id'],
            'observacion'      => $validated['observacion'] ?? null,
            'direccion'        => $validated['direccion'] ?? null,
        ]);

        return redirect()
            ->route('gestion_solicitudes.index')
            ->with('success', 'Solicitud actualizada correctamente.');
    }

    /**
     * Evalúa las reglas de edición de una atención para el usuario actual.
     *
     * Devuelve null cuando puede editarla, o el motivo del bloqueo:
     * 'permiso', 'propiedad' o 'plazo'. Las dos últimas restricciones se
     * levantan con los permisos de excepción correspondientes.
     */
    private function bloqueoEdicionAtencion(Atencion $atencion): ?string
    {
        $user = auth()->user();

        if (!$user || !$user->can('Editar atenciones')) {
            return 'permiso';
        }

        if ($atencion->usuario_id !== $user->id
            && !$user->can('Editar atenciones de otros usuarios')) {
            return 'propiedad';
        }

        if (PlazoEdicion::vencido($atencion->creado_el)
            && !$user->can('Editar atenciones fuera de plazo')) {
            return 'plazo';
        }

        return null;
    }

    /**
     * Indica si el usuario actual puede editar la atención.
     */
    private function puedeEditarAtencion(Atencion $atencion): bool
    {
        return $this->bloqueoEdicionAtencion($atencion) === null;
    }

    /**
     * Redirección con el mensaje que corresponde al motivo del bloqueo.
     */
    private function respuestaBloqueoAtencion(Atencion $atencion, string $motivo, string $verbo)
    {
        if ($motivo === 'plazo') {
            return redirect()
                ->route('gestion_atenciones.show', $atencion->id)
                ->with('error', 'El plazo de ' . PlazoEdicion::HORAS
                    . " horas para {$verbo} la atención ya venció.");
        }

        return redirect()
            ->route('gestion_solicitudes.index')
            ->with('error', $motivo === 'propiedad'
                ? "No está autorizado para {$verbo} esta atención porque la registró otro usuario."
                : "No tiene permisos para {$verbo} esta atención.");
    }

    public function showAtencion($id)
    {
        $atencion = Atencion::with([
            'ciudadano.tipoDocumento',
            'tipoConsulta',
            'puntoAtencion',
            'evento',
            'usuario',
            'comuna',
            'barrio',
        ])->findOrFail($id);

        return Inertia::render('gestion_solicitudes/show-atencion', [
            'atencion' => [
                'id'            => $atencion->id,
                'ciudadano'     => optional($atencion->ciudadano)->nombre_completo ?? '—',
                'tipo_documento' => optional(optional($atencion->ciudadano)->tipoDocumento)->codigo ?? '—',
                'num_documento' => optional($atencion->ciudadano)->num_documento ?? '—',
                'telefono'      => optional($atencion->ciudadano)->telefono ?? '—',
                'tipo_consulta' => optional($atencion->tipoConsulta)->nombre ?? '—',
                'fecha'         => $atencion->fecha ? Carbon::parse($atencion->fecha)->format('d/m/Y H:i') : '—',
                'punto'         => optional($atencion->puntoAtencion)->nombre ?? optional($atencion->evento)->nombre ?? '—',
                'asistencial'   => optional($atencion->usuario)
                    ? trim(($atencion->usuario->nombres ?? '') . ' ' . ($atencion->usuario->apellidos ?? ''))
                    : '—',
                'creado_el'     => Carbon::parse($atencion->creado_el)->format('d/m/Y H:i'),
                'creado_el_raw' => $atencion->creado_el,
                // El plazo de edición lo resuelve el servidor para no depender
                // de la zona horaria del navegador.
                'puede_editar'          => $this->puedeEditarAtencion($atencion),
                'plazo_edicion_horas'   => PlazoEdicion::HORAS,
                'fecha_limite_edicion'  => PlazoEdicion::limite($atencion->creado_el)->format('d/m/Y H:i'),
                'plazo_edicion_vencido' => PlazoEdicion::vencido($atencion->creado_el),
                'comuna'        => optional($atencion->comuna)->nombre ?? '—',
                'barrio'        => optional($atencion->barrio)->nombre ?? '—',
            ],
        ]);
    }

    public function editAtencion($id)
    {
        $atencion = Atencion::with([
            'ciudadano.tipoDocumento',
            'tipoConsulta',
            'puntoAtencion',
            'usuario',
            'comuna',
            'barrio',
        ])->findOrFail($id);

        if ($motivo = $this->bloqueoEdicionAtencion($atencion)) {
            return $this->respuestaBloqueoAtencion($atencion, $motivo, 'editar');
        }

        $tiposDocumento = TipoDocumento::select('id', 'nombre', 'codigo')->get();
        $tiposConsulta = TipoConsulta::select('id', 'nombre')->get();
        $comunas = Comuna::select('id', 'nombre')->orderBy('id')->get();
        $canales = Canal::select('id', 'nombre')->get();
        $barrios = Barrio::select('id', 'nombre', 'comuna_id')->orderBy('nombre')->get();

        return Inertia::render('gestion_solicitudes/edit-atencion', [
            'atencion' => [
                'id'                => $atencion->id,
                'ciudadano'         => [
                    'nombre_completo'   => optional($atencion->ciudadano)->nombre_completo ?? '',
                    'num_documento'     => optional($atencion->ciudadano)->num_documento ?? '',
                    'telefono'          => optional($atencion->ciudadano)->telefono ?? '',
                    'tipo_documento_id' => optional($atencion->ciudadano)->tipo_documento_id,
                ],
                'tipo_documento_id' => optional($atencion->ciudadano)->tipo_documento_id,
                'num_documento'     => optional($atencion->ciudadano)->num_documento ?? '',
                'telefono'          => optional($atencion->ciudadano)->telefono ?? '',
                'tipo_consulta_id'  => $atencion->tipo_consulta_id,
                'fecha'             => $atencion->fecha ? Carbon::parse($atencion->fecha)->format('Y-m-d\TH:i') : '',
                'punto_atencion_id' => $atencion->punto_atencion_id,
                'creado_el'         => Carbon::parse($atencion->creado_el)->format('d/m/Y H:i'),
                'creado_el_raw'     => $atencion->creado_el,
                'comuna_id'         => $atencion->comuna_id,
                'barrio_id'         => $atencion->barrio_id,
                'canal_id'          => $atencion->canal_id,
                'usuario'           => $atencion->usuario,
            ],
            'tiposDocumento'  => $tiposDocumento,
            'tiposConsulta'   => $tiposConsulta,
            'comunas'         => $comunas,
            'canales'         => $canales,
            'barrios'         => $barrios,
        ]);
    }

    public function updateAtencion(Request $request, $id)
    {
        $atencion = Atencion::findOrFail($id);

        if ($motivo = $this->bloqueoEdicionAtencion($atencion)) {
            return $this->respuestaBloqueoAtencion($atencion, $motivo, 'actualizar');
        }

        $validated = $request->validate([
            'nombre'            => 'required|string|max:255',
            'documento'         => 'required|string|max:50',
            'tipo_documento_id' => 'required|exists:tipo_documento,id',
            'telefono'          => 'nullable|string|max:20',
            'comuna_id'         => 'required|exists:comuna,id',
            'barrio_id'         => 'nullable|exists:barrio,id',
            'barrio'            => 'nullable|string|max:255',
            'tipo_consulta_id'  => 'required|exists:tipo_consulta,id',
            'fecha'             => 'nullable|date_format:Y-m-d\TH:i',
            'canal_id'          => 'nullable|exists:canal,id',
        ]);

        $ciudadano = Ciudadano::where('num_documento', $validated['documento'])->first();

        if (!$ciudadano) {
            $ciudadano = Ciudadano::create([
                'nombre_completo'   => $validated['nombre'],
                'num_documento'     => $validated['documento'],
                'tipo_documento_id' => $validated['tipo_documento_id'],
                'telefono'          => $validated['telefono'] ?? null,
                'estado'            => 1,
            ]);
        } else {
            $ciudadano->update([
                'nombre_completo'   => $validated['nombre'],
                'tipo_documento_id' => $validated['tipo_documento_id'],
                'telefono'          => $validated['telefono'] ?? null,
            ]);
        }

        $barrio_id = $validated['barrio_id'] ?? null;

        if (!$barrio_id && !empty($validated['barrio'])) {
            $barrio = Barrio::firstOrCreate(
                [
                    'nombre'    => $validated['barrio'],
                    'comuna_id' => $validated['comuna_id'],
                ],
                ['estado' => 1]
            );
            $barrio_id = $barrio->id;
        }

        $atencion->update([
            'ciudadano_id'     => $ciudadano->id,
            'tipo_consulta_id' => $validated['tipo_consulta_id'],
            'fecha'            => $validated['fecha'] ?? $atencion->fecha,
            'comuna_id'        => $validated['comuna_id'],
            'barrio_id'        => $barrio_id,
            'canal_id'         => $validated['canal_id'],
        ]);

        return redirect()
            ->route('gestion_solicitudes.index')
            ->with('success', 'Atención actualizada correctamente.');
    }

    public function buscarCiudadano(Request $request)
    {
        $documento       = $request->query('documento');
        $tipoDocumentoId = $request->query('tipo_documento_id');

        if (!$documento || strlen($documento) < 4 || !$tipoDocumentoId) {
            return response()->json(null);
        }

        $ciudadano = Ciudadano::with('tipoDocumento')
            ->where('num_documento', $documento)
            ->where('tipo_documento_id', $tipoDocumentoId)
            ->first();

        if (!$ciudadano) {
            return response()->json(null);
        }

        return response()->json([
            'id'               => $ciudadano->id,
            'nombre_completo'  => $ciudadano->nombre_completo,
            'tipo_documento_id' => $ciudadano->tipo_documento_id,
            'telefono'         => $ciudadano->telefono ?? '',
        ]);
    }
}
