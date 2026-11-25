<?php

namespace App\Http\Controllers;

use App\Models\Solicitud;
use App\Models\Comuna;
use App\Models\Barrio;
use App\Models\PuntoAtencion;
use App\Models\TipoTramite;
use App\Models\Canal;
use App\Models\User;
use App\Models\Evento;
use App\Models\Ciudadano;
use App\Models\Paquete;
use App\Models\Encuestador;
use App\Models\GestionSistema;
use App\Http\Controllers\GestioncalidadController;
use App\Exports\ReporteExport;
use App\Support\FechaFiltro;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class GestionreportesController extends Controller
{
    /** Granularidad activa (día/mes/año) para las dimensiones de periodo de la petición actual */
    private string $granularity = 'month';

    /** Filtros activos de la petición actual; usados por getDimConfig() para decidir si periodo_* agrupa o consolida en "Histórico" */
    private array $filters = [];

    public function index(Request $request)
    {
        $this->granularity = $this->getGranularity($request);

        $filters       = $this->getFilters($request);
        $this->filters = $filters;
        $query      = $this->buildQuery($filters);
        $dimensions = $this->ensureArray($request->input('dimensions'));
        $metrics    = $this->ensureArray($request->input('metrics'));
        $page       = max(1, (int) $request->input('page', 1));
        $sortBy     = (string) $request->input('sort_by', '');
        $sortOrder  = (string) $request->input('sort_order', 'desc');

        // Las columnas de marca "X" participan de la consulta como dimensiones
        // adicionales (el frontend las presenta como columnas por valor).
        $marks      = $this->getMarks($request);
        $dimensions = array_values(array_unique(array_merge($dimensions, array_keys($marks))));

        // Las props se envuelven en closures para que las recargas parciales de
        // Inertia (generar, paginar u ordenar con `only`) no ejecuten las
        // consultas de los catálogos.
        //
        // Los catálogos no dependen de los filtros: se cargan una sola vez con
        // la página. Los que crecen con cada solicitud (ID SisbenApp, radicado,
        // solicitante) no se envían; el filtro los busca en opciones().
        return Inertia::render('gestion_reportes/index', [
            'tableData'         => fn() => $this->getMultiDimTableData($query, $dimensions, $metrics, $sortBy, $sortOrder, $page),
            'chartTableData'    => fn() => $this->getChartTableData($query, $dimensions, $metrics),
            'reportDimensions'  => array_values(array_intersect($dimensions, array_keys($this->getDimConfig()))),
            'totalSolicitudes'  => fn() => (clone $query)->count(),
            'comunas' => fn() => Comuna::orderBy('nombre')->get(['id','nombre']),
            'barrios' => fn() => Barrio::orderBy('nombre')->get(['id','nombre','comuna_id']),
            'puntosAtencion' => fn() => PuntoAtencion::orderBy('nombre')->get(['id','nombre']),
            'tiposTramite' => fn() => TipoTramite::orderBy('nombre')->get(['id','nombre']),
            'canales' => fn() => Canal::orderBy('nombre')->get(['id','nombre']),
            'asistenciales' => fn() => User::whereHas('solicitudes')
                ->select('id', DB::raw("CONCAT(nombres,' ',apellidos) as nombre"), 'estado')
                ->orderBy('nombres')
                ->get(),
            'eventos' => fn() => Evento::orderBy('nombre')->get(['id','nombre']),
            // Texto del solicitante elegido cuando la página se abre con el
            // filtro ya puesto en la URL (el combobox solo conoce el id)
            'solicitanteSeleccionado' => fn() => $this->filterIsSet($filters['ciudadano_id'])
                ? $this->etiquetaSolicitante(Ciudadano::find((int) $filters['ciudadano_id']))
                : null,
            'encuestadores' => fn() => Encuestador::orderBy('nombres')
                ->select('id', DB::raw("CONCAT(nombres,' ',apellidos) as nombre"))
                ->get(),
            'registradores' => fn() => User::whereIn('id', GestionSistema::distinct()->pluck('usuario_id'))
                ->select('id', DB::raw("CONCAT(nombres,' ',apellidos) as nombre"))
                ->orderBy('nombres')
                ->get(),
            'categoriasSisben' => GestioncalidadController::categoriasSisben(),
            'motivosVisita1' => fn() => DB::table('visita')
                ->where('numero_visita', 1)
                ->whereNotNull('motivo')
                ->where('motivo', '!=', '')
                ->distinct()
                ->orderBy('motivo')
                ->pluck('motivo'),
            'motivosVisita2' => fn() => DB::table('visita')
                ->where('numero_visita', 2)
                ->whereNotNull('motivo')
                ->where('motivo', '!=', '')
                ->distinct()
                ->orderBy('motivo')
                ->pluck('motivo'),
            'estadosDisponibles' => $this->estadoLabels(),
            'filtros' => $filters
        ]);
    }

    private function getFilters(Request $request): array
    {
        return [
            'asistencial_estado'       => $this->filterSelect($request->input('asistencial_estado'), ['todos', 'activo', 'inactivo']),
            'usuario_id'               => $this->filterSelect($request->input('usuario_id')),
            'tipo_tramite_id'          => $this->filterSelect($request->input('tipo_tramite_id')),
            'fecha_inicio'             => $this->filterDate($request->input('fecha_inicio')),
            'fecha_fin'                => $this->filterDate($request->input('fecha_fin')),
            'punto_atencion_id'        => $this->filterSelect($request->input('punto_atencion_id')),
            'evento_id'                => $this->filterSelect($request->input('evento_id')),
            'canal_id'                 => $this->filterSelect($request->input('canal_id')),
            'ciudadano_id'             => $this->filterSelect($request->input('ciudadano_id')),
            'comuna_id'                => $this->filterSelect($request->input('comuna_id')),
            'barrio_id'                => $this->filterSelect($request->input('barrio_id')),
            'estado_gestion'           => $this->filterSelect($request->input('estado_gestion')),
            'id_sisbenapp'             => $this->filterSelect($request->input('id_sisbenapp')),
            'radicado'                 => $this->filterSelect($request->input('radicado')),
            'fecha_respuesta_inicio'   => $this->filterDate($request->input('fecha_respuesta_inicio')),
            'fecha_respuesta_fin'      => $this->filterDate($request->input('fecha_respuesta_fin')),
            'paquete_id'               => $this->filterSelect($request->input('paquete_id')),
            'encuestador_id'           => $this->filterSelect($request->input('encuestador_id')),
            'fecha_ejecucion_inicio'   => $this->filterDate($request->input('fecha_ejecucion_inicio')),
            'fecha_ejecucion_fin'      => $this->filterDate($request->input('fecha_ejecucion_fin')),
            'fecha_notificacion_inicio'=> $this->filterDate($request->input('fecha_notificacion_inicio')),
            'fecha_notificacion_fin'   => $this->filterDate($request->input('fecha_notificacion_fin')),
            'fecha_visita1_inicio'     => $this->filterDate($request->input('fecha_visita1_inicio')),
            'fecha_visita1_fin'        => $this->filterDate($request->input('fecha_visita1_fin')),
            'motivo_visita1'           => $this->filterSelect($request->input('motivo_visita1')),
            'fecha_visita2_inicio'     => $this->filterDate($request->input('fecha_visita2_inicio')),
            'fecha_visita2_fin'        => $this->filterDate($request->input('fecha_visita2_fin')),
            'motivo_visita2'           => $this->filterSelect($request->input('motivo_visita2')),
            'categoria_sisben'         => $this->filterSelect($request->input('categoria_sisben')),
            'registrado_por_id'        => $this->filterSelect($request->input('registrado_por_id')),
            'fecha_resolucion_inicio'  => $this->filterDate($request->input('fecha_resolucion_inicio')),
            'fecha_resolucion_fin'     => $this->filterDate($request->input('fecha_resolucion_fin')),
        ];
    }

    /**
     * Fecha de filtro validada; una fecha malformada equivale a no filtrar,
     * en lugar de dejar que Carbon::parse() lance una excepción (error 500).
     */
    private function filterDate(mixed $valor): string
    {
        return FechaFiltro::valida($valor) ?? '';
    }

    /** Lee y valida la granularidad de periodo pedida (día/mes/año, por defecto mes) */
    private function getGranularity(Request $request): string
    {
        $value = (string) $request->input('granularity', 'month');
        return in_array($value, ['day', 'month', 'year'], true) ? $value : 'month';
    }

    /** Máscara TO_CHAR de PostgreSQL según la granularidad activa */
    private function periodoFormat(): string
    {
        return match ($this->granularity) {
            'day'   => 'YYYY-MM-DD',
            'year'  => 'YYYY',
            default => 'YYYY-MM',
        };
    }

    private function filterSelect(mixed $value, array $allowed = []): string
    {
        $value = trim((string) ($value ?? 'todos'));
        if ($value === '') {
            return 'todos';
        }
        if (!empty($allowed) && !in_array($value, $allowed, true)) {
            return 'todos';
        }
        return $value;
    }

    private function filterIsSet(string $value): bool
    {
        return $value !== '' && $value !== 'todos';
    }

    private function buildQuery(array $filters)
    {
        return Solicitud::query()
            ->when(
                in_array($filters['asistencial_estado'], ['activo', 'inactivo'], true)
                || $this->filterIsSet($filters['usuario_id']),
                function ($q) use ($filters) {
                    $q->whereHas('usuario', function ($uq) use ($filters) {
                        if ($filters['asistencial_estado'] === 'activo') {
                            $uq->where('estado', true);
                        } elseif ($filters['asistencial_estado'] === 'inactivo') {
                            $uq->where('estado', false);
                        }
                        if ($this->filterIsSet($filters['usuario_id'])) {
                            $uq->where('id', (int) $filters['usuario_id']);
                        }
                    });
                }
            )
            ->when($this->filterIsSet($filters['tipo_tramite_id']), fn($q) => $q->where('solicitud.tipo_tramite_id', (int) $filters['tipo_tramite_id']))
            ->when($filters['fecha_inicio'] && $filters['fecha_fin'], function ($q) use ($filters) {
                $q->whereBetween('solicitud.creado_el', [
                    Carbon::parse($filters['fecha_inicio'])->startOfDay(),
                    Carbon::parse($filters['fecha_fin'])->endOfDay(),
                ]);
            })
            ->when($this->filterIsSet($filters['punto_atencion_id']), fn($q) => $q->where('solicitud.punto_atencion_id', (int) $filters['punto_atencion_id']))
            ->when($this->filterIsSet($filters['evento_id']), fn($q) => $q->where('solicitud.evento_id', (int) $filters['evento_id']))
            ->when($this->filterIsSet($filters['canal_id']), fn($q) => $q->where('solicitud.canal_id', (int) $filters['canal_id']))
            ->when($this->filterIsSet($filters['ciudadano_id']), fn($q) => $q->where('solicitud.ciudadano_id', (int) $filters['ciudadano_id']))
            ->when($this->filterIsSet($filters['comuna_id']), fn($q) => $q->where('solicitud.comuna_id', (int) $filters['comuna_id']))
            ->when($this->filterIsSet($filters['barrio_id']), fn($q) => $q->where('solicitud.barrio_id', (int) $filters['barrio_id']))
            ->when($this->filterIsSet($filters['estado_gestion']), fn($q) => $q->where('solicitud.estado_gestion', $filters['estado_gestion']))
            ->when($this->filterIsSet($filters['id_sisbenapp']), fn($q) => $q->where('solicitud.id_SisbenApp', $filters['id_sisbenapp']))
            ->when($this->filterIsSet($filters['radicado']), fn($q) => $q->where('solicitud.num_radicado', $filters['radicado']))
            ->when($filters['fecha_respuesta_inicio'] && $filters['fecha_respuesta_fin'], function ($q) use ($filters) {
                $q->whereBetween(DB::raw('COALESCE(solicitud.fecha_ejecucion, solicitud.fecha_notificacion)'), [
                    Carbon::parse($filters['fecha_respuesta_inicio'])->startOfDay(),
                    Carbon::parse($filters['fecha_respuesta_fin'])->endOfDay(),
                ]);
            })
            ->when($this->filterIsSet($filters['paquete_id']), fn($q) => $q->where('solicitud.paquete_id', (int) $filters['paquete_id']))
            ->when($this->filterIsSet($filters['encuestador_id']), function ($q) use ($filters) {
                $q->whereHas('paquete', fn($pq) => $pq->where('encuestador_id', (int) $filters['encuestador_id']));
            })
            ->when($filters['fecha_ejecucion_inicio'] && $filters['fecha_ejecucion_fin'], function ($q) use ($filters) {
                $q->whereBetween('solicitud.fecha_ejecucion', [
                    Carbon::parse($filters['fecha_ejecucion_inicio'])->startOfDay(),
                    Carbon::parse($filters['fecha_ejecucion_fin'])->endOfDay(),
                ]);
            })
            ->when($filters['fecha_notificacion_inicio'] && $filters['fecha_notificacion_fin'], function ($q) use ($filters) {
                $q->whereBetween('solicitud.fecha_notificacion', [
                    Carbon::parse($filters['fecha_notificacion_inicio'])->startOfDay(),
                    Carbon::parse($filters['fecha_notificacion_fin'])->endOfDay(),
                ]);
            })
            ->when(
                ($filters['fecha_visita1_inicio'] && $filters['fecha_visita1_fin'])
                || $this->filterIsSet($filters['motivo_visita1']),
                function ($q) use ($filters) {
                    $q->whereHas('visita1', function ($vq) use ($filters) {
                        if ($filters['fecha_visita1_inicio'] && $filters['fecha_visita1_fin']) {
                            $vq->whereBetween('fecha', [
                                Carbon::parse($filters['fecha_visita1_inicio'])->startOfDay(),
                                Carbon::parse($filters['fecha_visita1_fin'])->endOfDay(),
                            ]);
                        }
                        if ($this->filterIsSet($filters['motivo_visita1'])) {
                            $vq->where('motivo', $filters['motivo_visita1']);
                        }
                    });
                }
            )
            ->when(
                ($filters['fecha_visita2_inicio'] && $filters['fecha_visita2_fin'])
                || $this->filterIsSet($filters['motivo_visita2']),
                function ($q) use ($filters) {
                    $q->whereHas('visita2', function ($vq) use ($filters) {
                        if ($filters['fecha_visita2_inicio'] && $filters['fecha_visita2_fin']) {
                            $vq->whereBetween('fecha', [
                                Carbon::parse($filters['fecha_visita2_inicio'])->startOfDay(),
                                Carbon::parse($filters['fecha_visita2_fin'])->endOfDay(),
                            ]);
                        }
                        if ($this->filterIsSet($filters['motivo_visita2'])) {
                            $vq->where('motivo', $filters['motivo_visita2']);
                        }
                    });
                }
            )
            ->when(
                $this->filterIsSet($filters['categoria_sisben'])
                || $this->filterIsSet($filters['registrado_por_id'])
                || ($filters['fecha_resolucion_inicio'] && $filters['fecha_resolucion_fin']),
                function ($q) use ($filters) {
                    $q->whereHas('gestionSistema', function ($gq) use ($filters) {
                        if ($this->filterIsSet($filters['categoria_sisben'])) {
                            $gq->where('categoria_sisben', $filters['categoria_sisben']);
                        }
                        if ($this->filterIsSet($filters['registrado_por_id'])) {
                            $gq->where('usuario_id', (int) $filters['registrado_por_id']);
                        }
                        if ($filters['fecha_resolucion_inicio'] && $filters['fecha_resolucion_fin']) {
                            $gq->whereBetween('fecha_resolucion', [
                                Carbon::parse($filters['fecha_resolucion_inicio'])->startOfDay(),
                                Carbon::parse($filters['fecha_resolucion_fin'])->endOfDay(),
                            ]);
                        }
                    });
                }
            );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Consulta multidimensional dinámica
    // ──────────────────────────────────────────────────────────────────────────

    /** Mapa de configuración SQL por clave de dimensión */
    private function getDimConfig(): array
    {
        // Las dimensiones de periodo solo agrupan por día/mes/año cuando el
        // usuario acota el rango de fechas correspondiente; sin rango, todo
        // el histórico colapsa en una sola fila etiquetada "Histórico".
        $hasRegistroRange  = ($this->filters['fecha_inicio'] ?? '') !== '' && ($this->filters['fecha_fin'] ?? '') !== '';
        $hasRespuestaRange = ($this->filters['fecha_respuesta_inicio'] ?? '') !== '' && ($this->filters['fecha_respuesta_fin'] ?? '') !== '';

        return [
            'asistencial' => [
                'joins'  => [['join', 'usuario', 'usuario.id', '=', 'solicitud.usuario_id']],
                'select' => DB::raw("CONCAT(usuario.nombres,' ',usuario.apellidos) AS dim_asistencial"),
                'group'  => ['usuario.id', DB::raw("CONCAT(usuario.nombres,' ',usuario.apellidos)")],
            ],
            'tipo_tramite' => [
                'joins'  => [['join', 'tipo_tramite', 'tipo_tramite.id', '=', 'solicitud.tipo_tramite_id']],
                'select' => DB::raw('tipo_tramite.nombre AS dim_tipo_tramite'),
                'group'  => ['tipo_tramite.id', 'tipo_tramite.nombre'],
            ],
            'fecha_registro' => $this->dateGranularityDimConfig(
                'solicitud.creado_el',
                'dim_fecha_registro',
                $hasRegistroRange,
            ),
            'punto_atencion' => [
                'joins'  => [['join', 'punto_atencion', 'punto_atencion.id', '=', 'solicitud.punto_atencion_id']],
                'select' => DB::raw('punto_atencion.nombre AS dim_punto_atencion'),
                'group'  => ['punto_atencion.id', 'punto_atencion.nombre'],
            ],
            'evento' => [
                'joins'  => [['leftJoin', 'evento', 'evento.id', '=', 'solicitud.evento_id']],
                'select' => DB::raw("COALESCE(evento.nombre,'Sin evento') AS dim_evento"),
                'group'  => ['solicitud.evento_id', 'evento.nombre'],
            ],
            'canal' => [
                'joins'  => [['leftJoin', 'canal', 'canal.id', '=', 'solicitud.canal_id']],
                'select' => DB::raw("COALESCE(canal.nombre,'Sin canal') AS dim_canal"),
                'group'  => ['solicitud.canal_id', 'canal.nombre'],
            ],
            'solicitante' => [
                'joins'  => [['join', 'ciudadano', 'ciudadano.id', '=', 'solicitud.ciudadano_id']],
                'select' => DB::raw('ciudadano.nombre_completo AS dim_solicitante'),
                'group'  => ['ciudadano.id', 'ciudadano.nombre_completo'],
            ],
            'comuna' => [
                'joins'  => [['join', 'comuna', 'comuna.id', '=', 'solicitud.comuna_id']],
                'select' => DB::raw('comuna.nombre AS dim_comuna'),
                'group'  => ['solicitud.comuna_id', 'comuna.nombre'],
            ],
            'barrio' => [
                'joins'  => [['join', 'barrio', 'barrio.id', '=', 'solicitud.barrio_id']],
                'select' => DB::raw('barrio.nombre AS dim_barrio'),
                'group'  => ['solicitud.barrio_id', 'barrio.nombre'],
            ],
            'estado' => [
                'joins'  => [],
                'select' => DB::raw('solicitud.estado_gestion AS dim_estado'),
                'group'  => ['solicitud.estado_gestion'],
            ],
            'paquete' => [
                'joins'  => [['leftJoin', 'paquete', 'paquete.id', '=', 'solicitud.paquete_id']],
                // En PostgreSQL CAST(... AS CHAR) es char(1) y LPAD recorta lo que
                // pase del largo pedido: sin GREATEST, 2517 saldría "Paquete #002".
                'select' => DB::raw("CONCAT('Paquete #',LPAD(COALESCE(CAST(solicitud.paquete_id AS TEXT),'?'),GREATEST(LENGTH(CAST(solicitud.paquete_id AS TEXT)),3),'0')) AS dim_paquete"),
                'group'  => ['solicitud.paquete_id'],
            ],
            'encuestador' => [
                'joins'  => [
                    ['leftJoin', 'paquete',      'paquete.id',      '=', 'solicitud.paquete_id'],
                    ['leftJoin', 'encuestador',  'encuestador.id',  '=', 'paquete.encuestador_id'],
                ],
                'select' => DB::raw("COALESCE(CONCAT(encuestador.nombres,' ',encuestador.apellidos),'Sin encuestador') AS dim_encuestador"),
                'group'  => ['paquete.encuestador_id', DB::raw("COALESCE(CONCAT(encuestador.nombres,' ',encuestador.apellidos),'Sin encuestador')")],
            ],
            // Fecha en que se resolvió la solicitud. Una solicitud se ejecuta
            // o se notifica, nunca ambas, así que solo una de las dos fechas existe.
            'fecha_respuesta' => $this->dateGranularityDimConfig(
                'COALESCE(solicitud.fecha_ejecucion, solicitud.fecha_notificacion)',
                'dim_fecha_respuesta',
                $hasRespuestaRange,
            ),
            'fecha_ejecucion' => [
                'joins'  => [],
                'select' => DB::raw('DATE(solicitud.fecha_ejecucion) AS dim_fecha_ejecucion'),
                'group'  => [DB::raw('DATE(solicitud.fecha_ejecucion)')],
            ],
            'fecha_notificacion' => [
                'joins'  => [],
                'select' => DB::raw('DATE(solicitud.fecha_notificacion) AS dim_fecha_notificacion'),
                'group'  => [DB::raw('DATE(solicitud.fecha_notificacion)')],
            ],
            'fecha_visita1' => [
                'joins'  => [['_visita1', null, null, null, null]],
                'select' => DB::raw('DATE(visita1.fecha) AS dim_fecha_visita1'),
                'group'  => [DB::raw('DATE(visita1.fecha)')],
            ],
            'motivo_visita1' => [
                'joins'  => [['_visita1', null, null, null, null]],
                'select' => DB::raw("COALESCE(visita1.motivo,'Sin motivo') AS dim_motivo_visita1"),
                'group'  => [DB::raw("COALESCE(visita1.motivo,'Sin motivo')")],
            ],
            'fecha_visita2' => [
                'joins'  => [['_visita2', null, null, null, null]],
                'select' => DB::raw('DATE(visita2.fecha) AS dim_fecha_visita2'),
                'group'  => [DB::raw('DATE(visita2.fecha)')],
            ],
            'motivo_visita2' => [
                'joins'  => [['_visita2', null, null, null, null]],
                'select' => DB::raw("COALESCE(visita2.motivo,'Sin motivo') AS dim_motivo_visita2"),
                'group'  => [DB::raw("COALESCE(visita2.motivo,'Sin motivo')")],
            ],
            'categoria_sisben' => [
                'joins'  => [['leftJoin', 'gestion_sistema', 'gestion_sistema.solicitud_id', '=', 'solicitud.id']],
                'select' => DB::raw("COALESCE(gestion_sistema.categoria_sisben,'Sin categoría') AS dim_categoria_sisben"),
                'group'  => ['gestion_sistema.categoria_sisben'],
            ],
            'registrado_por' => [
                'joins'  => [
                    ['leftJoin', 'gestion_sistema', 'gestion_sistema.solicitud_id', '=', 'solicitud.id'],
                    ['_u_gs', null, null, null, null],
                ],
                'select' => DB::raw("COALESCE(CONCAT(u_gs.nombres,' ',u_gs.apellidos),'Sin registro') AS dim_registrado_por"),
                'group'  => ['gestion_sistema.usuario_id', DB::raw("COALESCE(CONCAT(u_gs.nombres,' ',u_gs.apellidos),'Sin registro')")],
            ],
            'fecha_resolucion' => [
                'joins'  => [['leftJoin', 'gestion_sistema', 'gestion_sistema.solicitud_id', '=', 'solicitud.id']],
                'select' => DB::raw('DATE(gestion_sistema.fecha_resolucion) AS dim_fecha_resolucion'),
                'group'  => [DB::raw('DATE(gestion_sistema.fecha_resolucion)')],
            ],
            // ── Campos de detalle: grano de una fila por solicitud ────────────
            // Agrupar por solicitud.id garantiza una fila por solicitud aunque
            // el radicado sea nulo o esté repetido.
            'radicado' => [
                'joins'  => [],
                'select' => DB::raw("COALESCE(NULLIF(solicitud.num_radicado,''), CONCAT('Solicitud #', solicitud.id)) AS dim_radicado"),
                'group'  => ['solicitud.id', DB::raw("COALESCE(NULLIF(solicitud.num_radicado,''), CONCAT('Solicitud #', solicitud.id))")],
            ],
            'id_sisbenapp' => [
                'joins'  => [],
                'select' => DB::raw("COALESCE(NULLIF(solicitud.\"id_SisbenApp\",''),'Sin ID') AS dim_id_sisbenapp"),
                'group'  => [DB::raw("COALESCE(NULLIF(solicitud.\"id_SisbenApp\",''),'Sin ID')")],
            ],
            'documento' => [
                'joins'  => [['join', 'ciudadano', 'ciudadano.id', '=', 'solicitud.ciudadano_id']],
                'select' => DB::raw("COALESCE(NULLIF(ciudadano.num_documento,''),'Sin documento') AS dim_documento"),
                'group'  => [DB::raw("COALESCE(NULLIF(ciudadano.num_documento,''),'Sin documento')")],
            ],
            'direccion' => [
                'joins'  => [],
                'select' => DB::raw("COALESCE(NULLIF(solicitud.direccion,''),'Sin dirección') AS dim_direccion"),
                'group'  => [DB::raw("COALESCE(NULLIF(solicitud.direccion,''),'Sin dirección')")],
            ],
            // ── Indicadores Sí/No: derivados de las fechas de la solicitud ────
            'notificada' => [
                'joins'  => [],
                'select' => DB::raw("CASE WHEN solicitud.fecha_notificacion IS NOT NULL THEN 'Sí' ELSE 'No' END AS dim_notificada"),
                'group'  => [DB::raw("CASE WHEN solicitud.fecha_notificacion IS NOT NULL THEN 'Sí' ELSE 'No' END")],
            ],
            'ejecutada' => [
                'joins'  => [],
                'select' => DB::raw("CASE WHEN solicitud.fecha_ejecucion IS NOT NULL THEN 'Sí' ELSE 'No' END AS dim_ejecutada"),
                'group'  => [DB::raw("CASE WHEN solicitud.fecha_ejecucion IS NOT NULL THEN 'Sí' ELSE 'No' END")],
            ],
            'tipo_documento' => [
                'joins'  => [
                    ['join', 'ciudadano', 'ciudadano.id', '=', 'solicitud.ciudadano_id'],
                    ['leftJoin', 'tipo_documento', 'tipo_documento.id', '=', 'ciudadano.tipo_documento_id'],
                ],
                'select' => DB::raw("COALESCE(tipo_documento.nombre,'Sin tipo') AS dim_tipo_documento"),
                'group'  => [DB::raw("COALESCE(tipo_documento.nombre,'Sin tipo')")],
            ],
            'telefono' => [
                'joins'  => [['join', 'ciudadano', 'ciudadano.id', '=', 'solicitud.ciudadano_id']],
                'select' => DB::raw("COALESCE(NULLIF(ciudadano.telefono,''),'Sin teléfono') AS dim_telefono"),
                'group'  => [DB::raw("COALESCE(NULLIF(ciudadano.telefono,''),'Sin teléfono')")],
            ],
            'observacion' => [
                'joins'  => [],
                'select' => DB::raw("COALESCE(NULLIF(solicitud.observacion,''),'Sin observación') AS dim_observacion"),
                'group'  => [DB::raw("COALESCE(NULLIF(solicitud.observacion,''),'Sin observación')")],
            ],
            'codigo_encuestador' => [
                'joins'  => [
                    ['leftJoin', 'paquete', 'paquete.id', '=', 'solicitud.paquete_id'],
                    ['leftJoin', 'encuestador', 'encuestador.id', '=', 'paquete.encuestador_id'],
                ],
                'select' => DB::raw("COALESCE(NULLIF(encuestador.codigo,''),'Sin encuestador') AS dim_codigo_encuestador"),
                'group'  => [DB::raw("COALESCE(NULLIF(encuestador.codigo,''),'Sin encuestador')")],
            ],
        ];
    }

    /**
     * Configuración de una dimensión de fecha con granularidad ajustable.
     * En granularidad 'día' agrupa por fecha exacta (comportamiento clásico
     * de fecha_registro/fecha_respuesta). En 'mes'/'año' se comporta como
     * un periodo: sin rango de fechas asociado, consolida todo el histórico
     * en un único valor "Histórico"; con rango, agrupa por TO_CHAR según
     * self::$granularity.
     */
    private function dateGranularityDimConfig(string $dateExpr, string $alias, bool $hasRange): array
    {
        if ($this->granularity === 'day') {
            return [
                'joins'  => [],
                'select' => DB::raw("DATE({$dateExpr}) AS {$alias}"),
                'group'  => [DB::raw("DATE({$dateExpr})")],
            ];
        }

        if ($hasRange) {
            return [
                'joins'  => [],
                'select' => DB::raw("TO_CHAR({$dateExpr}, '{$this->periodoFormat()}') AS {$alias}"),
                'group'  => [DB::raw("TO_CHAR({$dateExpr}, '{$this->periodoFormat()}')")],
            ];
        }

        // Sin rango, granularidad mes/año: literal constante, no se agrupa
        // por él (Postgres no admite constantes de texto en GROUP BY); el
        // valor es el mismo en toda la fila agregada sin necesidad de agruparlo.
        return [
            'joins'  => [],
            'select' => DB::raw("'Histórico' AS {$alias}"),
            'group'  => [],
        ];
    }

    /**
     * Campos de `atencion` que se pueden correlacionar con cada dimensión de solicitud.
     * Si una dimensión seleccionada tiene entrada aquí, se puede JOIN con atencion.
     */
    private function getDimAtencionField(): array
    {
        return [
            'asistencial'    => ['atencion.usuario_id',        'solicitud.usuario_id'],
            'punto_atencion' => ['atencion.punto_atencion_id', 'solicitud.punto_atencion_id'],
            'canal'          => ['atencion.canal_id',          'solicitud.canal_id'],
            'solicitante'    => ['atencion.ciudadano_id',      'solicitud.ciudadano_id'],
            'comuna'         => ['atencion.comuna_id',         'solicitud.comuna_id'],
            'barrio'         => ['atencion.barrio_id',         'solicitud.barrio_id'],
        ];
    }

    /** Dimensiones de grano fino: producen una fila por solicitud */
    private const DETAIL_DIMS = ['radicado', 'id_sisbenapp', 'documento', 'direccion', 'telefono', 'observacion'];

    /** Dimensiones indicador: en exportaciones se marcan con "X" o quedan en blanco */
    private const INDICATOR_DIMS = ['notificada', 'ejecutada'];

    /**
     * Dimensiones cuyos valores pueden mostrarse como columnas de marca "X":
     * el usuario elige valores puntuales y cada uno se vuelve una columna.
     */
    private const MARK_DIMS = ['estado', 'tipo_tramite', 'punto_atencion', 'evento', 'canal', 'categoria_sisben'];

    /** Etiquetas legibles de los estados de gestión */
    private function estadoLabels(): array
    {
        return [
            'registrada'      => 'Registrada',
            'enviada_a_campo' => 'Enviada a campo',
            'asignada'        => 'Asignada',
            'entregada'       => 'Entregada',
            'ejecutada'       => 'Ejecutada',
            'notificada'      => 'Notificada',
            'aprobada'        => 'Aprobada',
            'cancelada'       => 'Cancelada',
            'rechazada'       => 'Rechazada',
            'pendiente'       => 'Pendiente',
            // Desenlaces reportados por el DNP desde Gestión de Calidad.
            'sincronizada'    => 'Sincronizada',
            'realizada'       => 'Realizada',
            'pendiente_dnp'   => 'Pendiente (DNP)',
            'cancelada_dnp'   => 'Cancelada (DNP)',
        ];
    }

    /** Etiqueta legible para un valor de columna de marca "X" */
    private function markValueLabel(string $dim, string $value): string
    {
        if ($dim === 'estado') {
            return $this->estadoLabels()[$value] ?? $value;
        }
        if ($dim === 'categoria_sisben') {
            return GestioncalidadController::categoriasSisben()[$value] ?? $value;
        }
        return $value;
    }

    /**
     * Columnas de marca "X" pedidas en la request: parámetros `marks_<dim>`
     * (arreglo de valores) para cada dimensión de self::MARK_DIMS.
     */
    private function getMarks(Request $request): array
    {
        $marks = [];
        foreach (self::MARK_DIMS as $dim) {
            $values = $this->ensureArray($request->input('marks_'.$dim));
            if (!empty($values)) {
                $marks[$dim] = $values;
            }
        }
        return $marks;
    }

    /** Filas por página de la tabla de resultados */
    private const PER_PAGE = 10;

    /** Tope de filas para el dataset de gráficas (solo 1-2 dimensiones) */
    private const CHART_MAX_ROWS = 3000;

    /** Tope de filas de una exportación */
    private const EXPORT_MAX_ROWS = 50000;

    /** Caracteres mínimos antes de buscar opciones de un filtro */
    private const BUSQUEDA_MIN_CARACTERES = 3;

    /** Opciones que devuelve cada búsqueda de un filtro */
    private const BUSQUEDA_MAX_OPCIONES = 20;

    /** Etiquetas legibles por clave de dimensión (deben coincidir con el frontend) */
    private function getDimLabels(): array
    {
        return [
            'asistencial'        => 'Asistencial',
            'tipo_tramite'       => 'Tipo de trámite',
            'fecha_registro'     => 'Fecha de registro',
            'punto_atencion'     => 'Punto de atención',
            'evento'             => 'Evento',
            'canal'              => 'Canal',
            'solicitante'        => 'Solicitante',
            'comuna'             => 'Comuna',
            'barrio'             => 'Barrio',
            'estado'             => 'Estado',
            'paquete'            => 'Paquete',
            'encuestador'        => 'Nombre encuestador',
            'fecha_respuesta'    => 'Fecha de respuesta',
            'fecha_ejecucion'    => 'Fecha de ejecución',
            'fecha_notificacion' => 'Fecha de notificación',
            'fecha_visita1'      => 'Fecha primera visita',
            'motivo_visita1'     => 'Motivo primera visita',
            'fecha_visita2'      => 'Fecha segunda visita',
            'motivo_visita2'     => 'Motivo segunda visita',
            'categoria_sisben'   => 'Categoría SISBÉN',
            'registrado_por'     => 'Registrado por',
            'fecha_resolucion'   => 'Fecha de resolución',
            'radicado'           => 'Radicado',
            'id_sisbenapp'       => 'ID SisbenApp',
            'documento'          => 'Nro documento',
            'direccion'          => 'Dirección',
            'notificada'         => 'Notificada',
            'ejecutada'          => 'Ejecutada',
            'tipo_documento'     => 'Tipo de documento',
            'telefono'           => 'Teléfono',
            'observacion'        => 'Observación',
            'codigo_encuestador' => 'Código encuestador',
        ];
    }

    /**
     * Construye la consulta agrupada (SELECT + JOIN + GROUP BY) para cualquier
     * combinación de dimensiones, sin orden ni paginación.
     * Devuelve [$q, $validDims, $wantAtenciones] o null si no hay dimensiones válidas.
     */
    private function makeMultiDimBase($query, array $dimensions, array $metrics = []): ?array
    {
        $cfg       = $this->getDimConfig();
        $validDims = array_values(array_filter($dimensions, fn($d) => isset($cfg[$d])));

        if (empty($validDims)) return null;

        $wantAtenciones = in_array('total_atenciones', $metrics);
        $wantHogares    = in_array('total_hogares', $metrics);
        $wantEjecutadas = in_array('total_ejecutadas', $metrics);
        $wantNotificadas = in_array('total_notificadas', $metrics);

        $q           = clone $query;
        $selects     = [DB::raw('COUNT(DISTINCT solicitud.id) as total')];
        $groups      = [];
        $joinedKeys  = [];

        foreach ($validDims as $dim) {
            $d = $cfg[$dim];

            foreach ($d['joins'] as [$method, $table, $first, $op, $second]) {
                $key = match ($method) {
                    '_visita1' => '_visita1',
                    '_visita2' => '_visita2',
                    default    => $table,
                };
                if (in_array($key, $joinedKeys)) continue;
                $joinedKeys[] = $key;

                if ($method === '_visita1') {
                    $q = $q->leftJoin('visita as visita1', function ($j) {
                        $j->on('visita1.solicitud_id', '=', 'solicitud.id')
                          ->where('visita1.numero_visita', 1);
                    });
                } elseif ($method === '_visita2') {
                    $q = $q->leftJoin('visita as visita2', function ($j) {
                        $j->on('visita2.solicitud_id', '=', 'solicitud.id')
                          ->where('visita2.numero_visita', 2);
                    });
                } elseif ($method === '_u_gs') {
                    $q = $q->leftJoin('usuario as u_gs', 'u_gs.id', '=', 'gestion_sistema.usuario_id');
                } else {
                    $q = $q->$method($table, $first, $op, $second);
                }
            }

            $selects[] = $d['select'];
            foreach ($d['group'] as $g) {
                $groups[] = $g;
            }
        }

        // ── JOIN con atencion para la métrica total_atenciones ────────────────
        if ($wantAtenciones) {
            $atencionFields = $this->getDimAtencionField();
            $joinConditions = [];
            foreach ($validDims as $dim) {
                if (isset($atencionFields[$dim])) {
                    $joinConditions[] = $atencionFields[$dim];
                }
            }
            if (!empty($joinConditions)) {
                $q = $q->leftJoin('atencion', function ($join) use ($joinConditions) {
                    $first = array_shift($joinConditions);
                    $join->on($first[0], '=', $first[1]);
                    foreach ($joinConditions as $cond) {
                        $join->on($cond[0], '=', $cond[1]);
                    }
                });
                $selects[] = DB::raw('COUNT(DISTINCT atencion.id) as total_atenciones');
            } else {
                $selects[] = DB::raw('NULL as total_atenciones');
            }
        }

        // ── JOIN con gestion_sistema para la métrica total_hogares ────────────
        if ($wantHogares) {
            if (!in_array('gestion_sistema', $joinedKeys)) {
                $joinedKeys[] = 'gestion_sistema';
                $q = $q->leftJoin('gestion_sistema', 'gestion_sistema.solicitud_id', '=', 'solicitud.id');
            }
            $selects[] = DB::raw('COALESCE(SUM(gestion_sistema.cantidad_hogares), 0) as total_hogares');
        }

        // ── Conteo de solicitudes con encuesta ejecutada (fecha_ejecucion no nula) ──
        if ($wantEjecutadas) {
            $selects[] = DB::raw('COUNT(DISTINCT CASE WHEN solicitud.fecha_ejecucion IS NOT NULL THEN solicitud.id END) as total_ejecutadas');
        }

        // ── Conteo de solicitudes con encuesta notificada (fecha_notificacion no nula) ──
        if ($wantNotificadas) {
            $selects[] = DB::raw('COUNT(DISTINCT CASE WHEN solicitud.fecha_notificacion IS NOT NULL THEN solicitud.id END) as total_notificadas');
        }

        $q = $q->select($selects);
        // No llamar a groupBy() con un array vacío: Laravel solo comprueba si
        // $query->groups es null al compilar, así que un array vacío igual
        // emite una cláusula "group by" sin columnas y rompe el SQL.
        if (!empty($groups)) {
            $q = $q->groupBy($groups);
        }

        return [$q, $validDims, $wantAtenciones, $wantHogares, $wantEjecutadas, $wantNotificadas];
    }

    /** Expresión SQL cruda de una dimensión (su SELECT sin el alias) */
    private function dimExpression(string $dim): string
    {
        $select = $this->getDimConfig()[$dim]['select'];
        $raw    = $select instanceof \Illuminate\Database\Query\Expression
            ? (string) $select->getValue(DB::connection()->getQueryGrammar())
            : (string) $select;

        return preg_replace('/\s+AS\s+\S+\s*$/i', '', $raw);
    }

    /**
     * Orden natural de una dimensión: primero la parte alfabética y luego el
     * valor numérico como número, para que "Comuna 2" preceda a "Comuna 12"
     * y los valores puramente numéricos ordenen 1, 2, 3… y no 1, 12, 2…
     */
    private function orderByDimNatural($q, string $dim, string $dir)
    {
        $expr = $this->dimExpression($dim);

        return $q
            ->orderByRaw("regexp_replace(({$expr})::text, '[0-9]+', '', 'g') {$dir}")
            ->orderByRaw("COALESCE(NULLIF(regexp_replace(({$expr})::text, '[^0-9]', '', 'g'), '')::numeric, 0) {$dir}")
            ->orderByRaw("({$expr})::text {$dir}");
    }

    /**
     * Aplica el orden pedido (`dim:<clave>` o `metric:<clave>`) validándolo contra
     * las dimensiones/métricas activas, más un desempate estable por el resto de
     * dimensiones para que la paginación no repita ni omita filas entre páginas.
     */
    private function applyMultiDimSort($q, array $validDims, array $metrics, string $sortBy, string $sortOrder)
    {
        $dir        = strtolower($sortOrder) === 'asc' ? 'asc' : 'desc';
        $appliedDim = null;

        if (str_starts_with($sortBy, 'dim:')) {
            $dim = substr($sortBy, 4);
            if (in_array($dim, $validDims, true)) {
                $this->orderByDimNatural($q, $dim, $dir);
                $appliedDim = $dim;
            } else {
                $q->orderByDesc('total');
            }
        } elseif ($sortBy === 'metric:total_atenciones' && in_array('total_atenciones', $metrics)) {
            $q->orderBy('total_atenciones', $dir);
        } elseif ($sortBy === 'metric:total_hogares' && in_array('total_hogares', $metrics)) {
            $q->orderBy('total_hogares', $dir);
        } elseif ($sortBy === 'metric:total_ejecutadas' && in_array('total_ejecutadas', $metrics)) {
            $q->orderBy('total_ejecutadas', $dir);
        } elseif ($sortBy === 'metric:total_notificadas' && in_array('total_notificadas', $metrics)) {
            $q->orderBy('total_notificadas', $dir);
        } elseif (str_starts_with($sortBy, 'metric:')) {
            $q->orderBy('total', $dir);
        } else {
            $q->orderByDesc('total');
        }

        foreach ($validDims as $dim) {
            if ($dim !== $appliedDim) {
                $this->orderByDimNatural($q, $dim, 'asc');
            }
        }

        return $q;
    }

    /** Convierte las filas crudas (dim_<clave>) al formato del frontend */
    private function mapMultiDimRows($rows, array $validDims, bool $wantAtenciones, bool $wantHogares = false, bool $wantEjecutadas = false, bool $wantNotificadas = false): array
    {
        return collect($rows)
            ->map(function ($row) use ($validDims, $wantAtenciones, $wantHogares, $wantEjecutadas, $wantNotificadas) {
                $result = ['total' => (int) $row->total];
                if ($wantAtenciones) {
                    $result['total_atenciones'] = $row->total_atenciones !== null
                        ? (int) $row->total_atenciones
                        : null;
                }
                if ($wantHogares) {
                    $result['total_hogares'] = (int) $row->total_hogares;
                }
                if ($wantEjecutadas) {
                    $result['total_ejecutadas'] = (int) $row->total_ejecutadas;
                }
                if ($wantNotificadas) {
                    $result['total_notificadas'] = (int) $row->total_notificadas;
                }
                foreach ($validDims as $dim) {
                    $result[$dim] = $row->{"dim_{$dim}"};
                }
                return $result;
            })
            ->values()
            ->toArray();
    }

    /**
     * Tabla de resultados paginada en servidor.
     * Devuelve la página pedida junto con los metadatos de paginación.
     */
    private function getMultiDimTableData($query, array $dimensions, array $metrics, string $sortBy, string $sortOrder, int $page): array
    {
        $empty = ['data' => [], 'total' => 0, 'current_page' => 1, 'last_page' => 1, 'per_page' => self::PER_PAGE];

        $base = $this->makeMultiDimBase($query, $dimensions, $metrics);
        if ($base === null) return $empty;

        [$q, $validDims, $wantAtenciones, $wantHogares, $wantEjecutadas, $wantNotificadas] = $base;
        $this->applyMultiDimSort($q, $validDims, $metrics, $sortBy, $sortOrder);

        $paginator = $q->paginate(self::PER_PAGE, ['*'], 'page', $page);

        return [
            'data'         => $this->mapMultiDimRows($paginator->items(), $validDims, $wantAtenciones, $wantHogares, $wantEjecutadas, $wantNotificadas),
            'total'        => $paginator->total(),
            'current_page' => $paginator->currentPage(),
            'last_page'    => max(1, $paginator->lastPage()),
            'per_page'     => $paginator->perPage(),
        ];
    }

    /**
     * Dataset completo (con tope) para las gráficas de 1 o 2 dimensiones.
     * Los reportes de detalle o de 3+ dimensiones no grafican, así que se omiten.
     */
    private function getChartTableData($query, array $dimensions, array $metrics): array
    {
        $cfg       = $this->getDimConfig();
        $validDims = array_values(array_filter($dimensions, fn($d) => isset($cfg[$d])));

        if (count($validDims) < 1 || count($validDims) > 2) return [];
        if (array_intersect($validDims, self::DETAIL_DIMS)) return [];

        [$q, $validDims, $wantAtenciones, $wantHogares, $wantEjecutadas, $wantNotificadas] = $this->makeMultiDimBase($query, $dimensions, $metrics);

        return $this->mapMultiDimRows(
            $q->orderByDesc('total')->limit(self::CHART_MAX_ROWS)->get(),
            $validDims,
            $wantAtenciones,
            $wantHogares,
            $wantEjecutadas,
            $wantNotificadas,
        );
    }

    /**
     * Exporta el reporte completo (misma consulta que la tabla, sin paginar).
     * format=xlsx|csv descarga el archivo; format=json devuelve las filas
     * (usado por la impresión en PDF del navegador).
     */
    public function export(Request $request)
    {
        $this->granularity = $this->getGranularity($request);

        $filters       = $this->getFilters($request);
        $this->filters = $filters;
        $query      = $this->buildQuery($filters);
        $dimensions = $this->ensureArray($request->input('dimensions'));
        $metrics    = $this->ensureArray($request->input('metrics'));
        $marks      = $this->getMarks($request);
        $dimensions = array_values(array_unique(array_merge($dimensions, array_keys($marks))));

        $base = $this->makeMultiDimBase($query, $dimensions, $metrics);
        abort_if($base === null, 400, 'Debe seleccionar al menos una dimensión.');

        [$q, $validDims, $wantAtenciones, $wantHogares, $wantEjecutadas, $wantNotificadas] = $base;
        $this->applyMultiDimSort(
            $q,
            $validDims,
            $metrics,
            (string) $request->input('sort_by', ''),
            (string) $request->input('sort_order', 'desc'),
        );

        $rows = $this->mapMultiDimRows(
            $q->limit(self::EXPORT_MAX_ROWS)->get(),
            $validDims,
            $wantAtenciones,
            $wantHogares,
            $wantEjecutadas,
            $wantNotificadas,
        );

        if ($request->input('format') === 'json') {
            return response()->json(['rows' => $rows]);
        }

        $dimLabels    = $this->getDimLabels();
        $metricLabels = [
            'total_solicitudes' => 'Total de solicitudes',
            'total_atenciones'  => 'Total de atenciones',
            'total_hogares'     => 'Total de hogares',
            'total_ejecutadas'  => 'Total de encuestas ejecutadas',
            'total_notificadas' => 'Total de encuestas notificadas',
        ];
        $exportMetrics = array_values(array_intersect($metrics, array_keys($metricLabels)));

        $headings = [];
        foreach ($validDims as $d) {
            if (!empty($marks[$d])) {
                foreach ($marks[$d] as $value) {
                    $headings[] = $this->markValueLabel($d, (string) $value);
                }
            } else {
                $headings[] = $dimLabels[$d] ?? $d;
            }
        }
        foreach ($exportMetrics as $m) {
            $headings[] = $metricLabels[$m];
        }

        $data = array_map(function ($row) use ($validDims, $exportMetrics, $marks) {
            $out = [];
            foreach ($validDims as $d) {
                if (!empty($marks[$d])) {
                    foreach ($marks[$d] as $value) {
                        $out[] = ($row[$d] ?? '') === $value ? 'X' : '';
                    }
                } elseif (in_array($d, self::INDICATOR_DIMS, true)) {
                    $out[] = ($row[$d] ?? '') === 'Sí' ? 'X' : '';
                } else {
                    $out[] = $row[$d] ?? '';
                }
            }
            foreach ($exportMetrics as $m) {
                $out[] = $m === 'total_solicitudes' ? $row['total'] : ($row[$m] ?? '');
            }
            return $out;
        }, $rows);

        $filename = 'reporte-'.now()->format('Ymd-His');

        if ($request->input('format') === 'csv') {
            return Excel::download(new ReporteExport($data, $headings), $filename.'.csv', \Maatwebsite\Excel\Excel::CSV);
        }

        return Excel::download(new ReporteExport($data, $headings), $filename.'.xlsx');
    }

    /**
     * Coincidencias para los filtros que crecen con cada solicitud (ID
     * SisbenApp, radicado, solicitante y paquete). Enviarlos completos con la
     * página pesaba varios MB; el combobox los pide mientras el usuario escribe.
     */
    public function opciones(Request $request)
    {
        $campo = (string) $request->query('campo');
        $texto = trim((string) $request->query('q', ''));

        // Un paquete se busca por su número, que puede tener un solo dígito
        $minimo = $campo === 'paquete' ? 1 : self::BUSQUEDA_MIN_CARACTERES;

        if (mb_strlen($texto) < $minimo) {
            return response()->json(['opciones' => [], 'hayMas' => false]);
        }

        $patron = '%'.addcslashes($texto, '%_\\').'%';
        $limite = self::BUSQUEDA_MAX_OPCIONES + 1;

        // GROUP BY en lugar de DISTINCT: PostgreSQL no permite ordenar por
        // una expresión (LENGTH) que no esté en la lista de un SELECT DISTINCT.
        $opciones = match ($campo) {
            'paquete' => $this->opcionesPaquete($texto, $limite),
            'id_sisbenapp' => Solicitud::where('id_SisbenApp', 'ilike', $patron)
                ->groupBy('id_SisbenApp')
                ->orderByRaw('LENGTH("id_SisbenApp"), "id_SisbenApp"')
                ->limit($limite)
                ->pluck('id_SisbenApp')
                ->map(fn ($v) => ['value' => $v, 'label' => $v]),
            'radicado' => Solicitud::where('num_radicado', 'ilike', $patron)
                ->groupBy('num_radicado')
                ->orderByRaw('LENGTH(num_radicado), num_radicado')
                ->limit($limite)
                ->pluck('num_radicado')
                ->map(fn ($v) => ['value' => $v, 'label' => $v]),
            'solicitante' => Ciudadano::whereHas('solicitudes')
                ->where(fn ($q) => $q->where('nombre_completo', 'ilike', $patron)
                    ->orWhere('num_documento', 'like', $patron))
                ->orderBy('nombre_completo')
                ->limit($limite)
                ->get(['id', 'nombre_completo', 'num_documento'])
                ->map(fn ($c) => ['value' => (string) $c->id, 'label' => $this->etiquetaSolicitante($c)]),
            default => collect(),
        };

        return response()->json([
            'opciones' => $opciones->take(self::BUSQUEDA_MAX_OPCIONES)->values(),
            'hayMas'   => $opciones->count() > self::BUSQUEDA_MAX_OPCIONES,
        ]);
    }

    /**
     * Paquetes cuyo número contiene los dígitos escritos ("Paquete #025",
     * "#25" y "25" buscan lo mismo). El número exacto va primero y después
     * los más cortos: al escribir 25 aparecen 25, 125, 250…
     */
    private function opcionesPaquete(string $texto, int $limite)
    {
        $digitos = ltrim(preg_replace('/\D/', '', $texto), '0');

        if ($digitos === '' || strlen($digitos) > 18) {
            return collect();
        }

        return Paquete::whereRaw('CAST(id AS TEXT) LIKE ?', ["%{$digitos}%"])
            ->orderByRaw('id = ? DESC', [(int) $digitos])
            ->orderByRaw('LENGTH(CAST(id AS TEXT))')
            ->orderBy('id')
            ->limit($limite)
            ->pluck('id')
            ->map(fn ($id) => [
                'value' => (string) $id,
                'label' => 'Paquete #'.str_pad((string) $id, 3, '0', STR_PAD_LEFT),
            ]);
    }

    /** Nombre del solicitante con su documento, para distinguir homónimos */
    private function etiquetaSolicitante(?Ciudadano $ciudadano): ?string
    {
        if (!$ciudadano) return null;

        return $ciudadano->num_documento
            ? "{$ciudadano->nombre_completo} ({$ciudadano->num_documento})"
            : $ciudadano->nombre_completo;
    }

    private function ensureArray($value, bool $toInt = false)
    {
        if ($value === null || $value === '') {
            return [];
        }

        if (is_string($value)) {
            $parts = preg_split('/[\s,]+/', trim($value)) ?: [];
            $value = array_values(array_filter($parts, fn ($item) => $item !== ''));
        } elseif (! is_array($value)) {
            $value = [$value];
        }

        $value = array_values(array_filter($value, fn ($item) => $item !== null && $item !== ''));

        if ($toInt) {
            return array_values(array_unique(array_map(fn ($item) => (int) $item, $value)));
        }

        return array_values(array_unique(array_map(fn ($item) => (string) $item, $value)));
    }
}