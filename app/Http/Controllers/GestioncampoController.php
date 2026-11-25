<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\Solicitud;
use App\Models\Encuestador;
use App\Models\MotivoLiberacion;
use App\Models\MotivoLiberacionExplicacion;
use App\Models\Paquete;
use App\Models\SolicitudPaquete;
use App\Models\User;
use App\Models\Visita;
use App\Models\Comuna;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\SolicitudesGestionCampoExport;
use App\Support\FechaFiltro;
use App\Exports\PaquetesExport;
use App\Exports\PaqueteSolicitudesExport;

class GestioncampoController extends Controller
{
    public function index(Request $request)
    {
        $search    = $request->get('search');
        $estado    = $request->get('estado');
        $fecha_inicio = FechaFiltro::valida($request->get('fecha_inicio'));
        $fecha_fin = FechaFiltro::valida($request->get('fecha_fin'));
        $pagina    = $request->get('pagina', 1);

        $query = Solicitud::query()
            ->with([
                'usuario:id,nombres,apellidos',
                'ciudadano:id,nombre_completo,num_documento',
                'tipoTramite:id,nombre',
                'puntoAtencion:id,nombre',
                'evento:id,nombre',
                'canal:id,nombre',
                'barrio:id,nombre',
                'comuna:id,nombre',
                'paquete:id,encuestador_id',
                'paquete.encuestador:id,codigo,nombres,apellidos',
                'visitas:id,solicitud_id,numero_visita,fecha,resultado,motivo,encuestador_id',
                'visitas.encuestador:id,codigo,nombres,apellidos',
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
                'barrio_id',
                'comuna_id',
                'paquete_id',
                'direccion',
                'fecha_ejecucion',
                'fecha_notificacion',
                'observacion',
                'creado_el',
                'estado_gestion',
            ])
            ->whereNotIn('estado_gestion', ['registrada']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('id_SisbenApp', 'like', "%{$search}%")
                    ->orWhere('num_radicado', 'like', "%{$search}%")
                    ->orWhereHas('ciudadano', function ($c) use ($search) {
                        $c->where('num_documento', 'like', "%{$search}%");
                    });
            });
        }

        if ($estado) {
            $query->where('estado_gestion', $estado);
        }

        if ($fecha_inicio && $fecha_fin) {
            $query->whereBetween('creado_el', [
                Carbon::parse($fecha_inicio)->startOfDay(),
                Carbon::parse($fecha_fin)->endOfDay(),
            ]);
        }

        $solicitudes = $query
            ->orderByDesc('id')
            ->paginate(20, ['*'], 'pagina', $pagina)
            ->through(function ($s) {
                $v1 = $s->visitas->firstWhere('numero_visita', 1);
                $v2 = $s->visitas->firstWhere('numero_visita', 2);

                return [
                    'id'             => $s->id,
                    'id_SisbenApp'   => $s->id_SisbenApp,
                    'num_radicado'   => $s->num_radicado,
                    'creado_el'      => $s->creado_el
                        ? Carbon::parse($s->creado_el)->format('d/m/Y H:i')
                        : null,
                    'fecha_respuesta' => ($s->fecha_ejecucion
                        ? Carbon::parse($s->fecha_ejecucion)->format('d/m/Y')
                        : ($s->fecha_notificacion
                            ? Carbon::parse($s->fecha_notificacion)->format('d/m/Y')
                            : null)),
                    'fecha_ejecucion'    => $s->fecha_ejecucion ? Carbon::parse($s->fecha_ejecucion)->format('d/m/Y') : null,
                    'fecha_notificacion' => $s->fecha_notificacion ? Carbon::parse($s->fecha_notificacion)->format('d/m/Y') : null,
                    'fecha_visita1'      => $v1?->fecha ? Carbon::parse($v1->fecha)->format('d/m/Y') : null,
                    'motivo_visita1'     => $v1?->motivo,
                    'fecha_visita2'      => $v2?->fecha ? Carbon::parse($v2->fecha)->format('d/m/Y') : null,
                    'motivo_visita2'     => $v2?->motivo,
                    'observacion'        => $s->observacion,
                    'direccion'          => $s->direccion,
                    'estado_gestion' => $s->estado_gestion,
                    'usuario' => $s->usuario ? [
                        'nombre_completo' => trim($s->usuario->nombres . ' ' . $s->usuario->apellidos),
                    ] : null,
                    'ciudadano' => $s->ciudadano ? [
                        'nombre_completo' => $s->ciudadano->nombre_completo,
                        'num_documento'   => $s->ciudadano->num_documento,
                    ] : null,
                    'tipo_tramite' => $s->tipoTramite ? [
                        'nombre' => $s->tipoTramite->nombre,
                    ] : null,
                    'barrio' => $s->barrio ? ['nombre' => $s->barrio->nombre] : null,
                    'comuna' => $s->comuna ? ['nombre' => $s->comuna->nombre] : null,
                    'paquete' => $s->paquete ? [
                        'id' => $s->paquete->id,
                        'encuestador' => $s->paquete->encuestador ? [
                            'codigo'          => $s->paquete->encuestador->codigo,
                            'nombre_completo' => trim($s->paquete->encuestador->nombres . ' ' . $s->paquete->encuestador->apellidos),
                        ] : null,
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
                ];
            });

        // Get available estados for filter
        $estados = [
            'enviada_a_campo' => 'Enviada a campo',
            'asignada' => 'Asignada',
            'entregada' => 'Entregada',
            'ejecutada' => 'Ejecutada',
            'notificada' => 'Notificada',
            'aprobada' => 'Aprobada',
            'cancelada' => 'Cancelada',
            'rechazada' => 'Rechazada',
            'pendiente' => 'Pendiente',
        ];

        return Inertia::render('gestion_campo/index', [
            'solicitudes' => $solicitudes,
            'estados' => $estados,
            'filters'     => [
                'search' => $search,
                'estado' => $estado,
                'fecha_inicio' => $fecha_inicio,
                'fecha_fin' => $fecha_fin,
            ],
        ]);
    }

    public function exportarExcel(Request $request)
    {
        $search = $request->get('search');
        $estado = $request->get('estado');
        $fecha_inicio = FechaFiltro::valida($request->get('fecha_inicio'));
        $fecha_fin = FechaFiltro::valida($request->get('fecha_fin'));

        return Excel::download(
            new SolicitudesGestionCampoExport($search, $estado, $fecha_inicio, $fecha_fin),
            'solicitudes_gestion_campo_' . now()->format('YmdHis') . '.xlsx'
        );
    }

    public function showSolicitud($id)
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
            'paquete.encuestador',
            'visitas.encuestador:id,codigo,nombres,apellidos',
            'visitas.paquete:id',
            'estanciasPaquete.encuestador:id,codigo,nombres,apellidos',
            'estanciasPaquete.asignadaPor:id,nombres,apellidos',
            'estanciasPaquete.liberadaPor:id,nombres,apellidos',
        ])->findOrFail($id);

        $solicitudesRelacionadas = Solicitud::with(['tipoTramite', 'canal', 'puntoAtencion', 'evento'])
            ->where('num_radicado', $solicitud->num_radicado)
            ->whereNotNull('num_radicado')
            ->where('id', '<>', $solicitud->id)
            ->orderByDesc('creado_el')
            ->get()
            ->map(function ($item) {
                return [
                    'id'             => $item->id,
                    'tipo_tramite'   => optional($item->tipoTramite)->nombre ?? '—',
                    'canal'          => optional($item->canal)->nombre ?? '—',
                    'punto'          => optional($item->puntoAtencion)->nombre ?? optional($item->evento)->nombre ?? '—',
                    'creado_el'      => Carbon::parse($item->creado_el)->format('d/m/Y H:i'),
                    'estado_gestion' => $item->estado_gestion ?? '—',
                ];
            });

        $visitas = $solicitud->visitas->map(function ($v) {
            return [
                'numero_visita'      => $v->numero_visita,
                'fecha'              => $v->fecha ? Carbon::parse($v->fecha)->format('d/m/Y') : null,
                'resultado'          => $v->resultado,
                'motivo'             => $v->motivo,
                'observacion'        => $v->observacion,
                'fecha_notificacion' => $v->fecha_notificacion
                    ? Carbon::parse($v->fecha_notificacion)->format('d/m/Y')
                    : null,
                'paquete_id'         => $v->paquete_id,
                'encuestador'        => $v->encuestador ? [
                    'codigo'          => $v->encuestador->codigo,
                    'nombre_completo' => trim($v->encuestador->nombres . ' ' . $v->encuestador->apellidos),
                ] : null,
            ];
        });

        // Las columnas fecha_visita1/2 de `solicitud` son heredadas: los datos
        // vigentes de cada visita viven en la tabla `visita`.
        $visita1 = $solicitud->visitas->firstWhere('numero_visita', 1);
        $visita2 = $solicitud->visitas->firstWhere('numero_visita', 2);

        $nombre = fn ($u) => $u ? trim(($u->nombres ?? '') . ' ' . ($u->apellidos ?? '')) : null;

        $historialPaquetes = $solicitud->estanciasPaquete->map(fn ($e) => [
            'paquete_id'   => $e->paquete_id,
            'encuestador'  => $e->encuestador
                ? trim($e->encuestador->nombres . ' ' . $e->encuestador->apellidos)
                  . ' (' . $e->encuestador->codigo . ')'
                : null,
            'asignada_en'  => $e->asignada_en?->format('d/m/Y H:i'),
            'asignada_por' => $nombre($e->asignadaPor),
            'liberada_en'  => $e->liberada_en?->format('d/m/Y H:i'),
            'liberada_por' => $nombre($e->liberadaPor),
            'salida_tipo'  => $e->salida_tipo,
            'salida_label' => $e->salida_tipo
                ? (SolicitudPaquete::ETIQUETAS_SALIDA[$e->salida_tipo] ?? $e->salida_tipo)
                : null,
            'motivo_abreviacion' => $e->motivo_abreviacion,
            'motivo_explicacion' => $e->motivo_explicacion,
            'activa'             => $e->liberada_en === null,
        ])->values();

        return Inertia::render('gestion_campo/show', [
            'historialPaquetes' => $historialPaquetes,
            'solicitud' => [
                'id'             => $solicitud->id,
                'ciudadano'      => optional($solicitud->ciudadano)->nombre_completo ?? '—',
                'tipo_documento' => optional(optional($solicitud->ciudadano)->tipoDocumento)->codigo ?? '—',
                'num_documento'  => optional($solicitud->ciudadano)->num_documento ?? '—',
                'telefono'       => optional($solicitud->ciudadano)->telefono ?? '—',
                'tipo_tramite'   => optional($solicitud->tipoTramite)->nombre ?? '—',
                'canal'          => optional($solicitud->canal)->nombre ?? '—',
                'punto'          => optional($solicitud->puntoAtencion)->nombre ?? optional($solicitud->evento)->nombre ?? '—',
                'asistencial'    => $solicitud->usuario
                    ? trim(($solicitud->usuario->nombres ?? '') . ' ' . ($solicitud->usuario->apellidos ?? ''))
                    : '—',
                'id_sisben_app'  => $solicitud->id_SisbenApp ?? '—',
                'num_radicado'   => $solicitud->num_radicado ?? '—',
                'observacion'    => $solicitud->observacion ?? '—',
                'direccion'      => $solicitud->direccion ?? '—',
                'estado_gestion' => $solicitud->estado_gestion ?? '—',
                'cancelacion'    => $solicitud->cancelacionVista(),
                'creado_el'      => $solicitud->creado_el
                    ? Carbon::parse($solicitud->creado_el)->format('d/m/Y H:i')
                    : '—',
                'comuna'         => optional($solicitud->comuna)->nombre ?? '—',
                'barrio'         => optional($solicitud->barrio)->nombre ?? '—',
                'paquete_id'     => $solicitud->paquete_id,
                'encuestador_codigo' => $solicitud->paquete?->encuestador?->codigo,
                'encuestador_nombre' => $solicitud->paquete?->encuestador
                    ? trim($solicitud->paquete->encuestador->nombres . ' ' . $solicitud->paquete->encuestador->apellidos)
                    : null,
                'fecha_visita1'      => $visita1?->fecha
                    ? Carbon::parse($visita1->fecha)->format('d/m/Y')
                    : null,
                'motivo_visita1'     => $visita1?->motivo,
                'fecha_visita2'      => $visita2?->fecha
                    ? Carbon::parse($visita2->fecha)->format('d/m/Y')
                    : null,
                'motivo_visita2'     => $visita2?->motivo,
                'fecha_ejecucion'    => $solicitud->fecha_ejecucion
                    ? Carbon::parse($solicitud->fecha_ejecucion)->format('d/m/Y')
                    : null,
                'fecha_notificacion' => $solicitud->fecha_notificacion
                    ? Carbon::parse($solicitud->fecha_notificacion)->format('d/m/Y')
                    : null,
                'visitas' => $visitas,
            ],
            'solicitudesRelacionadas' => $solicitudesRelacionadas,
        ]);
    }

    public function exportarCsv(Request $request)
    {
        $search = $request->get('search');
        $estado = $request->get('estado');
        $fecha_inicio = FechaFiltro::valida($request->get('fecha_inicio'));
        $fecha_fin = FechaFiltro::valida($request->get('fecha_fin'));

        return Excel::download(
            new SolicitudesGestionCampoExport($search, $estado, $fecha_inicio, $fecha_fin),
            'solicitudes_gestion_campo_' . now()->format('YmdHis') . '.csv',
            \Maatwebsite\Excel\Excel::CSV
        );
    }

    /**
     * Show the form for creating a new resource.
     */
    public function package(Request $request)
    {
        $search = $request->get('search');
        $encuestador_id = $request->get('encuestador_id');
        $fecha_inicio = FechaFiltro::valida($request->get('fecha_inicio'));
        $fecha_fin = FechaFiltro::valida($request->get('fecha_fin'));
        $pagina = $request->get('pagina', 1);

        $query = Paquete::query()
            ->with([
                'usuario:id,nombres,apellidos',
                'encuestador:id,nombres,apellidos',
            ])
            // El select debe ir antes del withCount: select() reemplaza las columnas
            // y descartaría las subconsultas de conteo.
            ->select(['id', 'usuario_id', 'encuestador_id', 'creado_el', 'estado'])
            ->withCount([
                'solicitudes as solicitudes_sin_resolver_count' => fn ($q) => $q
                    ->whereIn('estado_gestion', Paquete::ESTADOS_SIN_RESOLVER),
                'solicitudes as solicitudes_movidas_count' => fn ($q) => $q
                    ->where('estado_gestion', '!=', 'asignada'),
            ]);

        if ($search) {
            $query->where('id', 'like', "%{$search}%");
        }

        if ($encuestador_id) {
            $query->where('encuestador_id', $encuestador_id);
        }

        if ($fecha_inicio) {
            $query->whereDate('creado_el', '>=', $fecha_inicio);
        }

        if ($fecha_fin) {
            $query->whereDate('creado_el', '<=', $fecha_fin);
        }

        $paquetes = $query
            ->orderByDesc('id')
            ->paginate(20, ['*'], 'pagina', $pagina)
            ->through(function ($p) {
                $entregado = (int) $p->solicitudes_movidas_count > 0;

                // La habilitación la resuelve el servidor porque depende de
                // quién creó el paquete, no solo del permiso del usuario.
                $habilitado = $this->motivoBloqueoCancelarPaquete($p) === null;

                return [
                    'id' => $p->id,
                    'creado_por' => $p->usuario
                        ? trim($p->usuario->nombres . ' ' . $p->usuario->apellidos)
                        : '-',
                    'asignado_a' => $p->encuestador
                        ? trim($p->encuestador->nombres . ' ' . $p->encuestador->apellidos)
                        : '-',
                    'creado_el' => $p->creado_el
                        ? Carbon::parse($p->creado_el)->format('d/m/Y H:i')
                        : null,
                    'estado' => $this->estadoPaquete($p),
                    'entregado' => $entregado,
                    'puede_cancelar' => $habilitado && ! $entregado,
                    // Solo a quien podría cancelarlo se le explica por qué ya
                    // no puede; al resto no se le muestra el control siquiera.
                    'cancelar_bloqueado_por_entrega' => $habilitado && $entregado,
                ];
            });

        return Inertia::render('gestion_campo/package', [
            'paquetes' => $paquetes,
            'encuestadores' => fn () => Encuestador::where('estado', 1)
                ->select('id', 'codigo', 'nombres', 'apellidos')
                ->orderBy('nombres')
                ->get()
                ->map(function ($e) {
                    return [
                        'id' => $e->id,
                        'label' => $e->codigo . ' - ' . trim($e->nombres . ' ' . $e->apellidos),
                    ];
                }),
            'filters' => [
                'search' => $search,
                'encuestador_id' => $encuestador_id,
                'fecha_inicio' => $fecha_inicio,
                'fecha_fin' => $fecha_fin,
            ],
        ]);
    }

    /**
     * Estado del paquete para la lista, en orden de ciclo de vida:
     *
     *  - 'sin_entregar': ninguna de sus solicitudes salió de 'asignada', es decir
     *    el paquete todavía no se entregó al encuestador (también cubre el
     *    paquete que se quedó sin solicitudes).
     *  - 'sin_completar': ya se entregó, pero queda alguna solicitud en curso.
     *  - 'completado': todas sus solicitudes ya tienen desenlace.
     *  - 'cancelado': el paquete fue cancelado.
     *
     * Requiere los conteos cargados con withCount en la consulta.
     */
    private function estadoPaquete(Paquete $paquete): string
    {
        if (! $paquete->estado) {
            return 'cancelado';
        }

        // Mismo criterio que usa la lista para bloquear la cancelación: mover
        // una solicitud fuera de 'asignada' es la señal de que el paquete ya
        // está en manos del encuestador.
        if ((int) $paquete->solicitudes_movidas_count === 0) {
            return 'sin_entregar';
        }

        return (int) $paquete->solicitudes_sin_resolver_count === 0
            ? 'completado'
            : 'sin_completar';
    }

    public function exportarPaquetesExcel(Request $request)
    {
        $search         = $request->get('search');
        $encuestador_id = $request->get('encuestador_id');
        $fecha_inicio   = FechaFiltro::valida($request->get('fecha_inicio'));
        $fecha_fin      = FechaFiltro::valida($request->get('fecha_fin'));

        return Excel::download(
            new PaquetesExport($search, $encuestador_id, $fecha_inicio, $fecha_fin),
            'paquetes_' . now()->format('YmdHis') . '.xlsx'
        );
    }

    public function exportarPaquetesCsv(Request $request)
    {
        $search         = $request->get('search');
        $encuestador_id = $request->get('encuestador_id');
        $fecha_inicio   = FechaFiltro::valida($request->get('fecha_inicio'));
        $fecha_fin      = FechaFiltro::valida($request->get('fecha_fin'));

        return Excel::download(
            new PaquetesExport($search, $encuestador_id, $fecha_inicio, $fecha_fin),
            'paquetes_' . now()->format('YmdHis') . '.csv',
            \Maatwebsite\Excel\Excel::CSV
        );
    }

    public function showPackage($id)
    {
        $paquete = Paquete::with([
            'usuario:id,nombres,apellidos',
            'encuestador:id,codigo,nombres,apellidos',
        ])->findOrFail($id);

        $solicitudes = Solicitud::query()
            ->with([
                'ciudadano:id,nombre_completo,num_documento',
                'tipoTramite:id,nombre',
                'puntoAtencion:id,nombre',
                'evento:id,nombre',
                'canal:id,nombre',
                'comuna:id,nombre',
                'barrio:id,nombre',
                'visitas.encuestador:id,codigo,nombres,apellidos',
            ])
            ->where('paquete_id', $id)
            ->orderByDesc('id')
            ->get()
            ->map(function ($s) {
                $visitas = $s->visitas->map(function ($v) {
                    return [
                        'numero_visita'      => $v->numero_visita,
                        'fecha'              => $v->fecha ? Carbon::parse($v->fecha)->format('d/m/Y') : null,
                        // Formato ISO para usarlo como cota mínima del input de fecha
                        'fecha_iso'          => $v->fecha ? Carbon::parse($v->fecha)->format('Y-m-d') : null,
                        'resultado'          => $v->resultado,
                        'motivo'             => $v->motivo,
                        'observacion'        => $v->observacion,
                        'fecha_notificacion' => $v->fecha_notificacion
                            ? Carbon::parse($v->fecha_notificacion)->format('d/m/Y')
                            : null,
                        'encuestador' => $v->encuestador ? [
                            'codigo'          => $v->encuestador->codigo,
                            'nombre_completo' => trim($v->encuestador->nombres . ' ' . $v->encuestador->apellidos),
                        ] : null,
                    ];
                });

                return [
                    'id'             => $s->id,
                    'num_radicado'   => $s->num_radicado,
                    'id_SisbenApp'   => $s->id_SisbenApp,
                    'direccion'      => $s->direccion,
                    'estado_gestion' => $s->estado_gestion,
                    'creado_el'      => $s->creado_el
                        ? Carbon::parse($s->creado_el)->format('d/m/Y H:i')
                        : null,
                    'ciudadano' => $s->ciudadano ? [
                        'nombre_completo' => $s->ciudadano->nombre_completo,
                        'num_documento'   => $s->ciudadano->num_documento,
                    ] : null,
                    'tipo_tramite'   => $s->tipoTramite   ? ['nombre' => $s->tipoTramite->nombre]   : null,
                    'punto_atencion' => $s->puntoAtencion ? ['nombre' => $s->puntoAtencion->nombre] : null,
                    'evento'         => $s->evento        ? ['nombre' => $s->evento->nombre]        : null,
                    'canal'          => $s->canal         ? ['nombre' => $s->canal->nombre]         : null,
                    'comuna'         => $s->comuna        ? ['nombre' => $s->comuna->nombre]        : null,
                    'barrio'         => $s->barrio        ? ['nombre' => $s->barrio->nombre]        : null,
                    'fecha_ejecucion'    => $s->fecha_ejecucion
                        ? Carbon::parse($s->fecha_ejecucion)->format('d/m/Y')
                        : null,
                    'fecha_notificacion' => $s->fecha_notificacion
                        ? Carbon::parse($s->fecha_notificacion)->format('d/m/Y')
                        : null,
                    'visitas' => $visitas,
                ];
            });

        return Inertia::render('gestion_campo/show-package', [
            'motivosLiberacion' => $this->catalogoMotivosLiberacion(),
            'paquete' => [
                'id'         => $paquete->id,
                'creado_por' => $paquete->usuario
                    ? trim($paquete->usuario->nombres . ' ' . $paquete->usuario->apellidos)
                    : '-',
                'asignado_a' => $paquete->encuestador
                    ? trim($paquete->encuestador->nombres . ' ' . $paquete->encuestador->apellidos)
                    : '-',
                'codigo_encuestador' => $paquete->encuestador->codigo ?? '-',
                'creado_el'  => $paquete->creado_el
                    ? Carbon::parse($paquete->creado_el)->format('d/m/Y H:i')
                    : null,
                'estado'     => $paquete->estado,
            ],
            'solicitudes' => $solicitudes,
        ]);
    }

    /**
     * Abreviaciones activas con sus explicaciones, para los desplegables
     * encadenados del formulario de liberación.
     */
    private function catalogoMotivosLiberacion()
    {
        return MotivoLiberacion::query()
            ->with(['explicaciones' => fn ($q) => $q->where('estado', true)->orderBy('id')])
            ->where('estado', true)
            ->orderBy('id')
            ->get()
            ->map(fn ($m) => [
                'id'           => $m->id,
                'abreviacion'  => $m->abreviacion,
                'explicaciones' => $m->explicaciones->map(fn ($e) => [
                    'id'          => $e->id,
                    'explicacion' => $e->explicacion,
                ])->values(),
            ])
            ->values();
    }

    /**
     * Valida que la explicación pertenezca a la abreviación elegida y la
     * devuelve ya cargada con su motivo. Sin esta comprobación se podrían
     * combinar libremente desde el cliente.
     */
    private function resolverExplicacionMotivo($motivoLiberacionId, $motivoExplicacionId): ?MotivoLiberacionExplicacion
    {
        return MotivoLiberacionExplicacion::with('motivo')
            ->where('id', $motivoExplicacionId)
            ->where('motivo_liberacion_id', $motivoLiberacionId)
            ->first();
    }

    public function exportarSolicitudesPaqueteExcel($id)
    {
        Paquete::findOrFail($id);

        return Excel::download(
            new PaqueteSolicitudesExport((int) $id),
            'paquete_' . $id . '_solicitudes_' . now()->format('YmdHis') . '.xlsx'
        );
    }

    public function exportarSolicitudesPaqueteCsv($id)
    {
        Paquete::findOrFail($id);

        return Excel::download(
            new PaqueteSolicitudesExport((int) $id),
            'paquete_' . $id . '_solicitudes_' . now()->format('YmdHis') . '.csv',
            \Maatwebsite\Excel\Excel::CSV
        );
    }

    public function liberarSolicitudDePaquete(Request $request, $paqueteId, $solicitudId)
    {
        $request->validate([
            'motivo_liberacion_id'  => ['required', 'integer', 'exists:motivo_liberacion,id'],
            'motivo_explicacion_id' => ['required', 'integer', 'exists:motivo_liberacion_explicacion,id'],
        ]);

        $solicitud = Solicitud::where('id', $solicitudId)
            ->where('paquete_id', $paqueteId)
            ->firstOrFail();

        if ($solicitud->estado_gestion !== 'asignada') {
            return back()->withErrors(['error' => 'Solo se puede liberar una solicitud que esté en estado Asignada.']);
        }

        $explicacion = $this->resolverExplicacionMotivo($request->motivo_liberacion_id, $request->motivo_explicacion_id);

        if (!$explicacion) {
            return back()->withErrors([
                'motivo_explicacion_id' => 'La explicación seleccionada no corresponde a la abreviación elegida.',
            ]);
        }

        DB::transaction(function () use ($solicitud, $explicacion) {
            SolicitudPaquete::cerrar($solicitud, SolicitudPaquete::SALIDA_LIBERADA, $explicacion);

            $solicitud->update([
                'paquete_id'      => null,
                'estado_gestion'  => 'enviada_a_campo',
            ]);
        });

        return back()->with('flash', [
            'success' => "Solicitud liberada correctamente ({$explicacion->motivo->abreviacion}).",
        ]);
    }

    public function entregarPaquete($id)
    {
        $paquete = Paquete::findOrFail($id);

        $hayIncompatibles = Solicitud::where('paquete_id', $paquete->id)
            ->whereNotIn('estado_gestion', ['asignada', 'pendiente'])
            ->exists();

        if ($hayIncompatibles) {
            return back()->withErrors(['error' => 'Solo se puede entregar el paquete cuando todas las solicitudes están en estado Asignada o Pendiente.']);
        }

        // Solo cambian a 'entregada' las solicitudes en estado 'asignada';
        // las 'pendiente' permanecen pendientes (segunda visita aún no realizada).
        Solicitud::where('paquete_id', $paquete->id)
            ->where('estado_gestion', 'asignada')
            ->update(['estado_gestion' => 'entregada']);

        return back()->with('flash', ['success' => 'Paquete entregado. Las solicitudes asignadas pasaron a Entregada; las pendientes permanecen en espera de segunda visita.']);
    }

    /**
     * Motivo por el que el usuario actual NO puede cancelar el paquete, o null
     * cuando sí puede.
     *
     * Cancelar solo lo hace quien creó el paquete. A diferencia de las reglas
     * de edición de solicitudes, atenciones y hogares, aquí no hay plazo ni
     * permiso de excepción: el límite temporal ya lo pone la entrega del
     * paquete, que cierra la posibilidad de cancelarlo.
     *
     * No comprueba si el paquete ya fue entregado: eso exige consultar sus
     * solicitudes y lo resuelve quien llama.
     */
    private function motivoBloqueoCancelarPaquete(Paquete $paquete): ?string
    {
        $user = auth()->user();

        if (! $user || ! $user->can('Cancelar paquetes')) {
            return 'No tiene permisos para cancelar paquetes.';
        }

        if ($paquete->usuario_id !== $user->id) {
            return 'Solo puede cancelar el paquete el usuario que lo creó.';
        }

        if (! $paquete->estado) {
            return 'El paquete ya fue cancelado.';
        }

        return null;
    }

    public function cancelarPaquete($id)
    {
        $paquete = Paquete::findOrFail($id);

        if ($motivo = $this->motivoBloqueoCancelarPaquete($paquete)) {
            return back()->withErrors(['error' => $motivo]);
        }

        $yaEntregado = Solicitud::where('paquete_id', $paquete->id)
            ->where('estado_gestion', '!=', 'asignada')
            ->exists();

        if ($yaEntregado) {
            return back()->withErrors(['error' => 'No se puede cancelar un paquete que ya fue entregado.']);
        }

        DB::transaction(function () use ($paquete) {
            $liberadas = Solicitud::where('paquete_id', $paquete->id)
                ->where('estado_gestion', 'asignada')
                ->get();

            SolicitudPaquete::where('paquete_id', $paquete->id)
                ->whereIn('solicitud_id', $liberadas->pluck('id'))
                ->whereNull('liberada_en')
                ->update([
                    'liberada_en'  => now(),
                    'liberada_por' => auth()->id(),
                    'salida_tipo'  => SolicitudPaquete::SALIDA_PAQUETE_CANCELADO,
                ]);

            Solicitud::whereIn('id', $liberadas->pluck('id'))
                ->update([
                    'paquete_id'     => null,
                    'estado_gestion' => 'enviada_a_campo',
                ]);

            $paquete->update(['estado' => false]);
        });

        return back()->with('flash', ['success' => 'Paquete cancelado. Las solicitudes asociadas fueron liberadas.']);
    }

    public function showAgregarSolicitud($paqueteId, Request $request)
    {
        $paquete = Paquete::with([
            'usuario:id,nombres,apellidos',
            'encuestador:id,nombres,apellidos',
        ])->findOrFail($paqueteId);

        $hayIncompatibles = Solicitud::where('paquete_id', $paqueteId)
            ->whereNotIn('estado_gestion', ['asignada', 'pendiente'])
            ->exists();

        if ($hayIncompatibles) {
            return redirect()->route('gestion_campo.package.show', $paqueteId)
                ->with('flash', ['error' => 'No se pueden agregar solicitudes a este paquete en su estado actual.']);
        }

        $pagina   = $request->get('page', 1);
        $comunaId = $request->get('comuna_id');

        $query = Solicitud::query()
            ->with([
                'usuario:id,nombres,apellidos',
                'ciudadano:id,nombre_completo,num_documento',
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
                'creado_el',
                'estado_gestion',
                'fecha_visita1',
            ])
            // A propósito NO se excluyen aquí las reservadas por otros usuarios:
            // ver idsReservadasPorOtros(). Se envían aparte y las oculta el frontend.
            ->where('estado_gestion', 'enviada_a_campo')
            ->whereNull('paquete_id');

        if ($comunaId) {
            $query->where('comuna_id', $comunaId);
        }

        $mapSolicitud = function ($s) {
            return [
                'id'             => $s->id,
                'id_SisbenApp'   => $s->id_SisbenApp,
                'num_radicado'   => $s->num_radicado,
                'creado_el'      => $s->creado_el
                    ? Carbon::parse($s->creado_el)->format('d/m/Y H:i')
                    : null,
                'estado_gestion' => $s->estado_gestion,
                'fecha_visita1'  => $s->fecha_visita1
                    ? Carbon::parse($s->fecha_visita1)->format('d/m/Y')
                    : null,
                'usuario'        => $s->usuario ? [
                    'nombre_completo' => trim($s->usuario->nombres . ' ' . $s->usuario->apellidos),
                ] : null,
                'ciudadano'      => $s->ciudadano ? [
                    'nombre_completo' => $s->ciudadano->nombre_completo,
                    'num_documento'   => $s->ciudadano->num_documento,
                ] : null,
                'tipo_tramite'   => $s->tipoTramite  ? ['nombre' => $s->tipoTramite->nombre]  : null,
                'punto_atencion' => $s->puntoAtencion ? ['nombre' => $s->puntoAtencion->nombre] : null,
                'evento'         => $s->evento        ? ['nombre' => $s->evento->nombre]        : null,
                'canal'          => $s->canal         ? ['nombre' => $s->canal->nombre]         : null,
                'comuna'         => $s->comuna        ? ['id' => $s->comuna->id, 'nombre' => $s->comuna->nombre] : null,
                'barrio'         => $s->barrio        ? ['nombre' => $s->barrio->nombre]        : null,
                'direccion'      => $s->direccion,
            ];
        };

        $solicitudes = $query
            ->orderByDesc('id')
            ->paginate(20, ['*'], 'page', $pagina)
            ->through($mapSolicitud);

        $reservadasPropias = Solicitud::query()
            ->with([
                'usuario:id,nombres,apellidos',
                'ciudadano:id,nombre_completo,num_documento',
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
                'creado_el',
                'estado_gestion',
                'fecha_visita1',
            ])
            ->where('estado_gestion', 'enviada_a_campo')
            ->whereNull('paquete_id')
            ->where('reservada_por', auth()->id())
            ->where('reservada_en', '>=', now()->subMinutes(5))
            ->get()
            ->map($mapSolicitud);

        return Inertia::render('gestion_campo/add-solicitud', [
            'paquete' => [
                'id'         => $paquete->id,
                'creado_por' => $paquete->usuario
                    ? trim($paquete->usuario->nombres . ' ' . $paquete->usuario->apellidos)
                    : '-',
                'asignado_a' => $paquete->encuestador
                    ? trim($paquete->encuestador->nombres . ' ' . $paquete->encuestador->apellidos)
                    : '-',
            ],
            'solicitudes'         => $solicitudes,
            'selectedComuna'      => $comunaId,
            'reservadasPropias'   => $reservadasPropias,
            'reservadasPorOtros'  => $this->idsReservadasPorOtros(),
        ]);
    }

    public function agregarSolicitudAPaquete(Request $request, $paqueteId)
    {
        Paquete::findOrFail($paqueteId);

        $request->validate([
            'solicitudes'    => ['required', 'array', 'min:1'],
            'solicitudes.*'  => ['integer', 'exists:solicitud,id'],
        ]);

        $hayIncompatibles = Solicitud::where('paquete_id', $paqueteId)
            ->whereNotIn('estado_gestion', ['asignada', 'pendiente'])
            ->exists();

        if ($hayIncompatibles) {
            return back()->withErrors(['error' => 'No se pueden agregar solicitudes a este paquete en su estado actual.']);
        }

        $ids = $request->solicitudes;
        $conflicto = false;

        DB::transaction(function () use ($ids, $paqueteId, &$conflicto) {
            $disponibles = Solicitud::whereIn('id', $ids)
                ->where('estado_gestion', 'enviada_a_campo')
                ->whereNull('paquete_id')
                ->where(function ($q) {
                    $q->where('reservada_por', auth()->id())
                        ->orWhereNull('reservada_por')
                        ->orWhere('reservada_en', '<', now()->subMinutes(5));
                })
                ->lockForUpdate()
                ->get()
                ->count();

            if ($disponibles !== count($ids)) {
                $conflicto = true;
                return;
            }

            Solicitud::whereIn('id', $ids)
                ->where('estado_gestion', 'enviada_a_campo')
                ->whereNull('paquete_id')
                ->update([
                    'paquete_id'     => $paqueteId,
                    'estado_gestion' => 'asignada',
                    'reservada_por'  => null,
                    'reservada_en'   => null,
                ]);

            SolicitudPaquete::abrir($ids, Paquete::findOrFail($paqueteId));
        });

        if ($conflicto) {
            return back()->withErrors([
                'solicitudes' => 'Una o más solicitudes ya fueron asignadas por otro usuario. Regresa e intenta nuevamente.',
            ]);
        }

        return redirect()->route('gestion_campo.package.show', $paqueteId)
            ->with('flash', ['success' => 'Solicitudes agregadas al paquete correctamente.']);
    }

    /**
     * Devuelve los paquetes compatibles y encuestadores disponibles para reasignar
     * una solicitud en estado "pendiente" a otro encuestador.
     */
    public function opcionesReasignacion($solicitudId)
    {
        $solicitud = Solicitud::findOrFail($solicitudId);

        // Se aceptan también las 'entregada' porque el formulario unificado consulta
        // las opciones antes de guardar la primera visita (aún no es 'pendiente').
        if (!in_array($solicitud->estado_gestion, ['entregada', 'pendiente'], true)) {
            return response()->json(['error' => 'La solicitud no admite reasignación en su estado actual'], 422);
        }

        // Paquetes donde TODAS sus solicitudes están en asignada o pendiente (excluir el actual)
        $paquetes = Paquete::with(['encuestador:id,nombres,apellidos'])
            ->where('id', '!=', $solicitud->paquete_id)
            ->whereDoesntHave('solicitudes', function ($q) {
                $q->whereNotIn('estado_gestion', ['asignada', 'pendiente']);
            })
            ->whereHas('solicitudes')
            ->withCount('solicitudes')
            ->get()
            ->map(fn($p) => [
                'id'               => $p->id,
                'encuestador'      => $p->encuestador
                    ? trim($p->encuestador->nombres . ' ' . $p->encuestador->apellidos)
                    : 'Sin encuestador asignado',
                'solicitudes_count' => $p->solicitudes_count,
            ]);

        $encuestadores = Encuestador::select('id', 'nombres', 'apellidos')
            ->orderBy('nombres')
            ->get()
            ->map(fn($e) => [
                'id'             => $e->id,
                'nombre_completo' => trim($e->nombres . ' ' . $e->apellidos),
            ]);

        return response()->json([
            'paquetes'      => $paquetes,
            'encuestadores' => $encuestadores,
        ]);
    }

    /**
     * Reasigna una solicitud pendiente a otro paquete o crea un nuevo paquete.
     */
    public function reasignarSolicitud(Request $request, $solicitudId)
    {
        $request->validate([
            'tipo'                  => 'required|in:paquete_existente,nuevo_paquete',
            'paquete_id'            => 'required_if:tipo,paquete_existente|nullable|integer|exists:paquete,id',
            'encuestador_id'        => 'required_if:tipo,nuevo_paquete|nullable|integer|exists:encuestador,id',
            'motivo_liberacion_id'  => ['required', 'integer', 'exists:motivo_liberacion,id'],
            'motivo_explicacion_id' => ['required', 'integer', 'exists:motivo_liberacion_explicacion,id'],
        ]);

        $solicitud = Solicitud::findOrFail($solicitudId);

        if ($solicitud->estado_gestion !== 'pendiente') {
            return back()->withErrors(['error' => 'La solicitud no está en estado pendiente.']);
        }

        $explicacion = $this->resolverExplicacionMotivo($request->motivo_liberacion_id, $request->motivo_explicacion_id);

        if (!$explicacion) {
            return back()->withErrors([
                'motivo_explicacion_id' => 'La explicación seleccionada no corresponde a la abreviación elegida.',
            ]);
        }

        $resultado = DB::transaction(fn () => $this->aplicarReasignacion(
            $solicitud,
            $request->tipo,
            $request->paquete_id,
            $request->encuestador_id,
            $explicacion
        ));

        if (!$resultado['ok']) {
            return back()->withErrors(['error' => $resultado['mensaje']]);
        }

        return back()->with('flash', ['success' => $resultado['mensaje']]);
    }

    /**
     * Mueve una solicitud a otro paquete (existente o nuevo) manteniendo el estado
     * "pendiente": la segunda visita sigue sin realizarse, solo cambia el encuestador.
     * El motivo (abreviación + explicación) queda registrado en la estancia que se cierra.
     *
     * @return array{ok: bool, mensaje: string}
     */
    private function aplicarReasignacion(Solicitud $solicitud, string $tipo, $paqueteId, $encuestadorId, MotivoLiberacionExplicacion $explicacion): array
    {
        if ($tipo === 'paquete_existente') {
            $destino = Paquete::findOrFail($paqueteId);

            if ($destino->id === $solicitud->paquete_id) {
                return ['ok' => false, 'mensaje' => 'La solicitud ya pertenece al paquete seleccionado.'];
            }

            $incompatibles = Solicitud::where('paquete_id', $destino->id)
                ->whereNotIn('estado_gestion', ['asignada', 'pendiente'])
                ->exists();

            if ($incompatibles) {
                return ['ok' => false, 'mensaje' => 'El paquete seleccionado ya no está en estado compatible para recibir solicitudes.'];
            }

            SolicitudPaquete::cerrar($solicitud, SolicitudPaquete::SALIDA_REASIGNADA, $explicacion);

            $solicitud->update([
                'paquete_id'     => $destino->id,
                'estado_gestion' => 'pendiente',
            ]);

            SolicitudPaquete::abrir($solicitud->id, $destino);

            return ['ok' => true, 'mensaje' => "Solicitud reasignada al paquete #{$destino->id} correctamente."];
        }

        $nuevoPaquete = Paquete::create([
            'usuario_id'     => auth()->id(),
            'encuestador_id' => $encuestadorId,
            'estado'         => true,
        ]);

        SolicitudPaquete::cerrar($solicitud, SolicitudPaquete::SALIDA_REASIGNADA, $explicacion);

        $solicitud->update([
            'paquete_id'     => $nuevoPaquete->id,
            'estado_gestion' => 'pendiente',
        ]);

        SolicitudPaquete::abrir($solicitud->id, $nuevoPaquete);

        return ['ok' => true, 'mensaje' => "Paquete #{$nuevoPaquete->id} creado y solicitud reasignada correctamente."];
    }

    /**
     * Motivo que habilita una segunda visita. Cualquier otro motivo cierra la
     * solicitud de inmediato porque el impedimento no se resuelve volviendo.
     */
    private const MOTIVO_AUSENTE = 'AUSENTE';

    private const MOTIVOS_VISITA = [
        'AUSENTE', 'AUSENTE INDEFINIDO', 'NO VIVE', 'RECHAZA VISITA',
        'OTRO', 'DIRECCIÓN ERRADA', 'FALLECIDO', 'FALTAN DOCUMENTOS',
    ];

    /**
     * Registra en un solo paso toda la atención de una solicitud: primera visita y,
     * cuando corresponde, segunda visita o reasignación.
     *
     * Reglas:
     *  - Primera visita satisfactoria  → Ejecutada.
     *  - Primera visita fallida con motivo distinto de AUSENTE → Notificada (cierra).
     *  - Primera visita fallida con motivo AUSENTE → habilita la segunda visita, que
     *    puede registrarse aquí mismo (exitosa → Ejecutada / fallida → Notificada),
     *    reasignarse a otro encuestador, o quedar Pendiente en el paquete actual.
     *
     * Las solicitudes que ya tienen la primera visita registrada (estado Pendiente
     * previo a este cambio) entran directamente al tramo de segunda visita.
     */
    public function registrarRespuestaSolicitud(Request $request, $paqueteId, $solicitudId)
    {
        $solicitud = Solicitud::with('visitas')
            ->where('id', $solicitudId)
            ->where('paquete_id', $paqueteId)
            ->firstOrFail();

        $paquete = Paquete::findOrFail($paqueteId);

        if (!in_array($solicitud->estado_gestion, ['entregada', 'pendiente'], true)) {
            return back()->withErrors(['error' => 'La solicitud no admite registro de visitas en su estado actual.']);
        }

        if ($solicitud->visitas->firstWhere('numero_visita', 2)) {
            return back()->withErrors(['error' => 'Esta solicitud ya tiene registradas sus dos visitas.']);
        }

        $visita1Previa = $solicitud->visitas->firstWhere('numero_visita', 1);
        $registraVisita1 = $visita1Previa === null;

        // La segunda visita se habilita si la primera fue AUSENTE, o si la primera
        // ya estaba registrada de antes (solicitud en estado Pendiente).
        $habilitaSegunda = $registraVisita1
            ? ($request->input('visita1_resultado') === 'fallida'
                && $request->input('visita1_motivo') === self::MOTIVO_AUSENTE)
            : true;

        $reglas = [];

        if ($registraVisita1) {
            $reglas += [
                'visita1_resultado'   => ['required', 'in:exitosa,fallida'],
                'visita1_fecha'       => ['required', 'date', 'before_or_equal:today'],
                'visita1_motivo'      => ['nullable', 'required_if:visita1_resultado,fallida', 'in:' . implode(',', self::MOTIVOS_VISITA)],
                'visita1_observacion' => ['nullable', 'string', 'max:1000'],
            ];
        }

        if ($habilitaSegunda) {
            $reglas += [
                'segunda_accion'      => ['required', 'in:registrar,reasignar,pendiente'],
                'visita2_resultado'   => ['nullable', 'required_if:segunda_accion,registrar', 'in:exitosa,fallida'],
                'visita2_fecha'       => ['nullable', 'required_if:segunda_accion,registrar', 'date', 'before_or_equal:today'],
                'visita2_motivo'      => ['nullable', 'required_if:visita2_resultado,fallida', 'in:' . implode(',', self::MOTIVOS_VISITA)],
                'visita2_observacion' => ['nullable', 'string', 'max:1000'],
                'reasignacion_tipo'   => ['nullable', 'required_if:segunda_accion,reasignar', 'in:paquete_existente,nuevo_paquete'],
                'reasignacion_paquete_id'     => ['nullable', 'required_if:reasignacion_tipo,paquete_existente', 'integer', 'exists:paquete,id'],
                'reasignacion_encuestador_id' => ['nullable', 'required_if:reasignacion_tipo,nuevo_paquete', 'integer', 'exists:encuestador,id'],
                'reasignacion_motivo_liberacion_id'  => ['nullable', 'required_if:segunda_accion,reasignar', 'integer', 'exists:motivo_liberacion,id'],
                'reasignacion_motivo_explicacion_id' => ['nullable', 'required_if:segunda_accion,reasignar', 'integer', 'exists:motivo_liberacion_explicacion,id'],
            ];
        }

        $datos = $request->validate($reglas);

        // La segunda visita no puede ser anterior a la primera.
        $fecha1 = $registraVisita1
            ? ($datos['visita1_fecha'] ?? null)
            : optional($visita1Previa->fecha)->toDateString();

        if ($habilitaSegunda
            && ($datos['segunda_accion'] ?? null) === 'registrar'
            && $fecha1
            && $datos['visita2_fecha'] < $fecha1
        ) {
            return back()->withErrors([
                'visita2_fecha' => 'La fecha de la segunda visita no puede ser anterior a la de la primera.',
            ]);
        }

        $mensaje = '';
        $errorReasignacion = null;

        $ejecutar = function () use (
            $solicitud, $paquete, $datos, $registraVisita1,
            $habilitaSegunda, &$mensaje, &$errorReasignacion
        ) {
            $base = [
                'solicitud_id'   => $solicitud->id,
                'paquete_id'     => $paquete->id,
                'encuestador_id' => $paquete->encuestador_id,
                'registrada_por' => auth()->id(),
            ];

            // ── Primera visita ────────────────────────────────────────────────
            if ($registraVisita1) {
                $fecha1  = $datos['visita1_fecha'];
                $motivo1 = $datos['visita1_motivo'] ?? null;
                $obs1    = $datos['visita1_observacion'] ?? null;

                if ($datos['visita1_resultado'] === 'exitosa') {
                    Visita::create($base + [
                        'numero_visita' => 1,
                        'fecha'         => $fecha1,
                        'resultado'     => 'exitosa',
                    ]);
                    $solicitud->update([
                        'fecha_ejecucion' => $fecha1,
                        'estado_gestion'  => 'ejecutada',
                    ]);
                    $mensaje = 'Solicitud ejecutada exitosamente en la primera visita.';
                    return;
                }

                // Motivo distinto de AUSENTE: la solicitud se cierra como Notificada.
                if (!$habilitaSegunda) {
                    Visita::create($base + [
                        'numero_visita'      => 1,
                        'fecha'              => $fecha1,
                        'resultado'          => 'notificada',
                        'motivo'             => $motivo1,
                        'observacion'        => $obs1,
                        'fecha_notificacion' => $fecha1,
                    ]);
                    $solicitud->update([
                        'fecha_notificacion' => $fecha1,
                        'estado_gestion'     => 'notificada',
                    ]);
                    $mensaje = "Solicitud notificada por motivo «{$motivo1}» en la primera visita.";
                    return;
                }

                Visita::create($base + [
                    'numero_visita' => 1,
                    'fecha'         => $fecha1,
                    'resultado'     => 'fallida',
                    'motivo'        => $motivo1,
                    'observacion'   => $obs1,
                ]);
            }

            // ── Segunda visita / reasignación ─────────────────────────────────
            $accion = $datos['segunda_accion'];

            if ($accion === 'pendiente') {
                $solicitud->update(['estado_gestion' => 'pendiente']);
                $mensaje = 'Primera visita registrada. La solicitud queda pendiente para una segunda visita.';
                return;
            }

            if ($accion === 'reasignar') {
                $explicacion = $this->resolverExplicacionMotivo(
                    $datos['reasignacion_motivo_liberacion_id'],
                    $datos['reasignacion_motivo_explicacion_id']
                );

                if (!$explicacion) {
                    $errorReasignacion = 'La explicación seleccionada no corresponde a la abreviación elegida.';
                    throw new \RuntimeException('reasignacion_fallida');
                }

                // aplicarReasignacion deja la solicitud en estado Pendiente.
                $resultado = $this->aplicarReasignacion(
                    $solicitud,
                    $datos['reasignacion_tipo'],
                    $datos['reasignacion_paquete_id'] ?? null,
                    $datos['reasignacion_encuestador_id'] ?? null,
                    $explicacion
                );

                if (!$resultado['ok']) {
                    $errorReasignacion = $resultado['mensaje'];
                    throw new \RuntimeException('reasignacion_fallida');
                }

                $mensaje = $registraVisita1
                    ? 'Primera visita registrada. ' . $resultado['mensaje']
                    : $resultado['mensaje'];
                return;
            }

            // accion === 'registrar'
            $fecha2  = $datos['visita2_fecha'];
            $motivo2 = $datos['visita2_motivo'] ?? null;
            $obs2    = $datos['visita2_observacion'] ?? null;

            if ($datos['visita2_resultado'] === 'exitosa') {
                Visita::create($base + [
                    'numero_visita' => 2,
                    'fecha'         => $fecha2,
                    'resultado'     => 'exitosa',
                ]);
                $solicitud->update([
                    'fecha_ejecucion' => $fecha2,
                    'estado_gestion'  => 'ejecutada',
                ]);
                $mensaje = 'Solicitud ejecutada exitosamente en la segunda visita.';
                return;
            }

            Visita::create($base + [
                'numero_visita'      => 2,
                'fecha'              => $fecha2,
                'resultado'          => 'notificada',
                'motivo'             => $motivo2,
                'observacion'        => $obs2,
                'fecha_notificacion' => $fecha2,
            ]);
            $solicitud->update([
                'fecha_notificacion' => $fecha2,
                'estado_gestion'     => 'notificada',
            ]);
            $mensaje = 'Solicitud notificada tras dos visitas sin éxito.';
        };

        try {
            DB::transaction($ejecutar);
        } catch (\RuntimeException $e) {
            // Reasignación inválida: la transacción ya revirtió la visita registrada.
            if ($errorReasignacion === null) {
                throw $e;
            }
        }

        if ($errorReasignacion) {
            return back()->withErrors(['error' => $errorReasignacion]);
        }

        return back()->with('flash', ['success' => $mensaje]);
    }


    public function create()
    {
        $pagina = request()->get('page', 1);
        $search = request()->get('search', '');
        $comunaId = request()->get('comuna_id');
        $fechaInicio = request()->get('fecha_inicio');
        $fechaFin = request()->get('fecha_fin');

        $query = Solicitud::query()
            ->with([
                'usuario:id,nombres,apellidos',
                'ciudadano:id,nombre_completo,num_documento',
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
                'creado_el',
                'estado_gestion',
            ])
            // A propósito NO se excluyen aquí las reservadas por otros usuarios:
            // ver idsReservadasPorOtros(). Se envían aparte y las oculta el frontend.
            ->where('estado_gestion', 'enviada_a_campo');

        if ($comunaId) {
            $query->where('comuna_id', $comunaId);
        }

        if ($fechaInicio) {
            $query->where('creado_el', '>=', $fechaInicio);
        }

        if ($fechaFin) {
            $query->where('creado_el', '<=', $fechaFin);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('num_radicado', 'like', "%{$search}%")
                    ->orWhere('id_SisbenApp', 'like', "%{$search}%")
                    ->orWhereHas('ciudadano', function ($subQ) use ($search) {
                        $subQ->where('nombre_completo', 'like', "%{$search}%")
                            ->orWhere('num_documento', 'like', "%{$search}%");
                    });
            });
        }

        $mapSolicitud = function ($s) {
            return [
                'id'             => $s->id,
                'id_SisbenApp'   => $s->id_SisbenApp,
                'num_radicado'   => $s->num_radicado,
                'creado_el'      => $s->creado_el
                    ? Carbon::parse($s->creado_el)->format('d/m/Y H:i')
                    : null,
                'estado_gestion' => $s->estado_gestion,
                'usuario' => $s->usuario ? [
                    'nombre_completo' => trim($s->usuario->nombres . ' ' . $s->usuario->apellidos),
                ] : null,
                'ciudadano' => $s->ciudadano ? [
                    'nombre_completo' => $s->ciudadano->nombre_completo,
                    'num_documento'   => $s->ciudadano->num_documento,
                ] : null,
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
                'comuna' => $s->comuna ? [
                    'id' => $s->comuna->id,
                    'nombre' => $s->comuna->nombre,
                ] : null,
                'barrio' => $s->barrio ? [
                    'nombre' => $s->barrio->nombre,
                ] : null,
                'direccion' => $s->direccion,
            ];
        };

        $solicitudes = $query
            ->orderByDesc('id')
            ->paginate(20, ['*'], 'page', $pagina)
            ->through($mapSolicitud);

        // Solicitudes que este usuario tenía reservadas antes de un cierre abrupto
        $reservadasPropias = Solicitud::query()
            ->with([
                'usuario:id,nombres,apellidos',
                'ciudadano:id,nombre_completo,num_documento',
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
                'creado_el',
                'estado_gestion',
            ])
            ->where('estado_gestion', 'enviada_a_campo')
            ->where('reservada_por', auth()->id())
            ->where('reservada_en', '>=', now()->subMinutes(5))
            ->get()
            ->map($mapSolicitud);

        $encuestadores = Encuestador::query()
            ->select(
                'id',
                'nombres',
                'apellidos'
            )
            ->where('estado', true)
            ->orderBy('nombres')
            ->get()
            ->map(function ($e) {
                return [
                    'id' => $e->id,
                    'nombre_completo' => trim(
                        $e->nombres . ' ' . $e->apellidos
                    ),
                ];
            });

        $comunas = Comuna::query()
            ->select('id', 'nombre')
            ->orderBy('id')
            ->get()
            ->map(function ($c) {
                return [
                    'id' => $c->id,
                    'nombre' => $c->nombre
                ];
            });

        return Inertia::render('gestion_campo/create', [
            'solicitudes'         => $solicitudes,
            'encuestadores'       => $encuestadores,
            'comunas'             => $comunas,
            'selectedComuna'      => $comunaId,
            'reservadasPropias'   => $reservadasPropias,
            'reservadasPorOtros'  => $this->idsReservadasPorOtros(),
        ]);
    }

    /**
     * IDs de solicitudes reservadas activamente por OTROS usuarios.
     *
     * Los listados NO filtran esto en SQL a propósito. Si lo hicieran, una
     * solicitud reservada justo cuando se carga la página quedaría fuera del
     * payload, y al liberarla no habría fila que volver a mostrar: la pantalla
     * se quedaría vacía hasta recargar. Enviándolo como dato aparte, ocultar y
     * volver a mostrar son simétricos y ambos los resuelve el polling.
     */
    private function idsReservadasPorOtros(): array
    {
        return Solicitud::where('estado_gestion', 'enviada_a_campo')
            ->whereNotNull('reservada_por')
            ->where('reservada_en', '>=', now()->subMinutes(5))
            ->where('reservada_por', '!=', auth()->id())
            ->pluck('id')
            ->toArray();
    }

    /**
     * Devuelve los IDs de solicitudes que NO deben mostrarse al usuario actual:
     * - Reservadas activamente por otro usuario.
     * - IDs enviados por el frontend que ya cambiaron de estado (ej. asignadas en otro paquete).
     */
    public function reservadas(Request $request)
    {
        // 1. Reservadas activamente por otros usuarios
        $reservadas = $this->idsReservadasPorOtros();

        // 2. IDs que el frontend tiene en pantalla pero ya no están en enviada_a_campo
        $idsActuales = array_map('intval', $request->query('ids', []));
        $noDisponibles = [];
        if (!empty($idsActuales)) {
            $noDisponibles = Solicitud::whereIn('id', $idsActuales)
                ->where('estado_gestion', '!=', 'enviada_a_campo')
                ->pluck('id')
                ->toArray();
        }

        return response()->json(array_values(array_unique(array_merge($reservadas, $noDisponibles))));
    }

    /**
     * Reserva atómicamente una solicitud para el usuario autenticado.
     */
    public function reservar($id)
    {
        $afectadas = DB::table('solicitud')
            ->where('id', $id)
            ->where('estado_gestion', 'enviada_a_campo')
            ->where(function ($q) {
                $q->whereNull('reservada_por')
                    ->orWhere('reservada_en', '<', now()->subMinutes(5))
                    ->orWhere('reservada_por', auth()->id());
            })
            ->update([
                'reservada_por' => auth()->id(),
                'reservada_en'  => now(),
            ]);

        if ($afectadas === 0) {
            return response()->json(
                ['message' => 'Esta solicitud ya está siendo usada por otro usuario'],
                409
            );
        }

        return response()->json(['message' => 'Reservada'], 200);
    }

    /**
     * Libera la reserva de una solicitud del usuario autenticado.
     */
    public function liberar($id)
    {
        DB::table('solicitud')
            ->where('id', $id)
            ->where('reservada_por', auth()->id())
            ->update(['reservada_por' => null, 'reservada_en' => null]);

        return response()->json(['message' => 'Liberada'], 200);
    }

    /**
     * Renueva el timestamp de todas las reservas activas del usuario autenticado.
     * Llamado periódicamente desde el frontend como heartbeat.
     */
    public function heartbeat()
    {
        DB::table('solicitud')
            ->where('reservada_por', auth()->id())
            ->whereNotNull('reservada_en')
            ->update(['reservada_en' => now()]);

        return response()->json(['message' => 'OK'], 200);
    }

    /**
     * Libera todas las reservas activas del usuario autenticado.
     * Usado al abandonar la página (beforeunload / unmount).
     */
    public function liberarTodas()
    {
        DB::table('solicitud')
            ->where('reservada_por', auth()->id())
            ->update(['reservada_por' => null, 'reservada_en' => null]);

        return response()->json(['message' => 'Todas liberadas'], 200);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'encuestador_id' => ['required', 'integer', 'exists:encuestador,id'],
            'solicitudes'    => ['required', 'array', 'min:1'],
            'solicitudes.*'  => ['integer', 'exists:solicitud,id'],
        ]);

        $ids = $request->solicitudes;
        $conflicto = false;

        DB::transaction(function () use ($request, $ids, &$conflicto) {
            // Bloquear filas y verificar que todas sigan disponibles para este usuario
            // Se usa get()->count() en lugar de count() porque PostgreSQL no permite
            // FOR UPDATE con funciones de agregación.
            $disponibles = Solicitud::whereIn('id', $ids)
                ->where('estado_gestion', 'enviada_a_campo')
                ->where(function ($q) {
                    $q->where('reservada_por', auth()->id())
                        ->orWhereNull('reservada_por')
                        ->orWhere('reservada_en', '<', now()->subMinutes(5));
                })
                ->lockForUpdate()
                ->get()
                ->count();

            if ($disponibles !== count($ids)) {
                $conflicto = true;
                return;
            }

            $paquete = \App\Models\Paquete::create([
                'usuario_id'     => auth()->id(),
                'encuestador_id' => $request->encuestador_id,
                'estado'         => true,
            ]);

            Solicitud::whereIn('id', $ids)
                ->where('estado_gestion', 'enviada_a_campo')
                ->update([
                    'paquete_id'     => $paquete->id,
                    'estado_gestion' => 'asignada',
                    'reservada_por'  => null,
                    'reservada_en'   => null,
                ]);

            SolicitudPaquete::abrir($ids, $paquete);
        });

        if ($conflicto) {
            return back()->withErrors([
                'solicitudes' => 'Una o más solicitudes ya fueron asignadas por otro usuario. Regresa al listado e intenta nuevamente.',
            ]);
        }

        return redirect()->route('gestion_campo.package')
            ->with('success', 'Paquete registrado y solicitudes asignadas correctamente.');
    }

}
