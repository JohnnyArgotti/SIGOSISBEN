<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\Solicitud;
use App\Models\GestionSistema;
use App\Models\DocumentoSisben;
use App\Models\Paquete;
use App\Exports\CalidadExport;
use App\Support\FechaFiltro;
use App\Support\HogarLock;
use App\Support\PlazoEdicion;
use Maatwebsite\Excel\Facades\Excel;

class GestioncalidadController extends Controller
{
    /**
     * Categorías oficiales del SISBEN IV (Colombia).
     */
    public static function categoriasSisben(): array
    {
        return [
            'A1' => 'A1 – Pobreza extrema',
            'A2' => 'A2 – Pobreza extrema',
            'A3' => 'A3 – Pobreza extrema',
            'A4' => 'A4 – Pobreza extrema',
            'A5' => 'A5 – Pobreza extrema',
            'B1' => 'B1 – Pobreza moderada',
            'B2' => 'B2 – Pobreza moderada',
            'B3' => 'B3 – Pobreza moderada',
            'B4' => 'B4 – Pobreza moderada',
            'B5' => 'B5 – Pobreza moderada',
            'B6' => 'B6 – Pobreza moderada',
            'B7' => 'B7 – Pobreza moderada',
            'C1' => 'C1 – Vulnerable',
            'C2' => 'C2 – Vulnerable',
            'C3' => 'C3 – Vulnerable',
            'C4' => 'C4 – Vulnerable',
            'C5' => 'C5 – Vulnerable',
            'C6' => 'C6 – Vulnerable',
            'C7' => 'C7 – Vulnerable',
            'C8' => 'C8 – Vulnerable',
            'C9' => 'C9 – Vulnerable',
            'C10' => 'C10 – Vulnerable',
            'C11' => 'C11 – Vulnerable',
            'C12' => 'C12 – Vulnerable',
            'C13' => 'C13 – Vulnerable',
            'C14' => 'C14 – Vulnerable',
            'C15' => 'C15 – Vulnerable',
            'C16' => 'C16 – Vulnerable',
            'C17' => 'C17 – Vulnerable',
            'C18' => 'C18 – Vulnerable',
            'D1' => 'D1 – No pobre, no vulnerable',
            'D2' => 'D2 – No pobre, no vulnerable',
            'D3' => 'D3 – No pobre, no vulnerable',
            'D4' => 'D4 – No pobre, no vulnerable',
            'D5' => 'D5 – No pobre, no vulnerable',
            'D6' => 'D6 – No pobre, no vulnerable',
            'D7' => 'D7 – No pobre, no vulnerable',
            'D8' => 'D8 – No pobre, no vulnerable',
            'D9' => 'D9 – No pobre, no vulnerable',
            'D10' => 'D10 – No pobre, no vulnerable',
            'D11' => 'D11 – No pobre, no vulnerable',
            'D12' => 'D12 – No pobre, no vulnerable',
            'D13' => 'D13 – No pobre, no vulnerable',
            'D14' => 'D14 – No pobre, no vulnerable',
            'D15' => 'D15 – No pobre, no vulnerable',
            'D16' => 'D16 – No pobre, no vulnerable',
            'D17' => 'D17 – No pobre, no vulnerable',
            'D18' => 'D18 – No pobre, no vulnerable',
            'D19' => 'D19 – No pobre, no vulnerable',
            'D20' => 'D20 – No pobre, no vulnerable',
            'D21' => 'D21 – No pobre, no vulnerable',
        ];
    }

    /**
     * Estados que devuelve el DNP para una solicitud. Se guardan en el mismo
     * `estado_gestion` de la solicitud porque son su desenlace final.
     *
     * `cancelada_dnp` y `pendiente_dnp` se diferencian a propósito de
     * `cancelada` (cancelación desde Gestión de Solicitudes) y de `pendiente`
     * (segunda visita en Gestión de Campo): comparten el nombre pero no el
     * flujo, y unificarlos devolvería la solicitud a esos procesos.
     */
    public static function estadosDnp(): array
    {
        return [
            'aprobada'      => 'Aprobada',
            'sincronizada'  => 'Sincronizada',
            'realizada'     => 'Realizada',
            'pendiente_dnp' => 'Pendiente (DNP)',
            'cancelada_dnp' => 'Cancelada (DNP)',
            'rechazada'     => 'Rechazada',
        ];
    }

    /**
     * Estados de gestión cuyas solicitudes se listan en Gestión de Calidad:
     * las que llegan del flujo de campo más los desenlaces del DNP.
     */
    public const ESTADOS_VISIBLES = [
        'ejecutada', 'notificada', 'cancelada',
        'aprobada', 'sincronizada', 'realizada',
        'pendiente_dnp', 'cancelada_dnp', 'rechazada',
    ];


    /**
     * Observación del DNP normalizada: en mayúsculas y null cuando viene vacía.
     * La conversión se hace también en el servidor y no solo en el formulario,
     * para que el dato quede uniforme venga de donde venga.
     */
    private function observacionDnp(Request $request): ?string
    {
        $texto = trim((string) $request->input('observacion_dnp'));

        return $texto === '' ? null : mb_strtoupper($texto, 'UTF-8');
    }

    /**
     * Fecha límite para editar un registro de hogar.
     */
    private function limiteEdicionHogar(GestionSistema $gs): Carbon
    {
        return PlazoEdicion::limite($gs->creado_el, PlazoEdicion::HORAS_HOGARES);
    }

    /**
     * Motivo por el que el usuario actual NO puede editar el registro de hogar,
     * o null cuando sí está habilitado.
     *
     * Mismas reglas que la edición de solicitudes y atenciones: solo edita
     * quien registró el hogar y dentro del plazo. Las excepciones de propiedad
     * y de plazo se conceden con sus permisos correspondientes.
     */
    private function motivoBloqueoEdicionHogar(?GestionSistema $gs): ?string
    {
        if (!$gs) {
            return 'Esta solicitud no tiene un hogar registrado.';
        }

        $user = Auth::user();

        if (!$user || !$user->can('Editar hogares')) {
            return 'No tiene permisos para editar el registro de hogar.';
        }

        if ($gs->usuario_id !== $user->id
            && !$user->can('Editar hogares de otros usuarios')) {
            return 'Solo puede editar el registro de hogar el usuario que lo registró.';
        }

        if ($this->limiteEdicionHogar($gs)->isPast()
            && !$user->can('Editar hogares fuera de plazo')) {
            return 'El plazo de ' . PlazoEdicion::HORAS_HOGARES
                . ' horas para editar el registro de hogar ya venció.';
        }

        return null;
    }

    /**
     * Indica si el usuario actual puede editar el registro de hogar recibido.
     */
    private function puedeEditarHogar(?GestionSistema $gs): bool
    {
        return $gs !== null && $this->motivoBloqueoEdicionHogar($gs) === null;
    }

    /**
     * Lista solicitudes ejecutadas, notificadas y canceladas para Gestión de Calidad.
     */
    public function index(Request $request)
    {
        $search       = $request->get('search');
        $estado       = $request->get('estado');
        $paquete_id   = $request->get('paquete_id');
        $fecha_inicio = FechaFiltro::valida($request->get('fecha_inicio'));
        $fecha_fin    = FechaFiltro::valida($request->get('fecha_fin'));
        $pagina       = $request->get('pagina', 1);

        $query = Solicitud::query()
            ->with([
                'ciudadano' => function ($query) {
                    $query->select('id', 'nombre_completo', 'num_documento', 'tipo_documento_id')
                        ->with(['tipoDocumento' => function ($query) {
                            $query->select('id', 'codigo', 'nombre');
                        }]);
                },
                'barrio:id,nombre',
                'comuna:id,nombre',
                'gestionSistema.usuario:id,nombres,apellidos',
            ])
            ->select([
                'id',
                'id_SisbenApp',
                'num_radicado',
                'ciudadano_id',
                'barrio_id',
                'comuna_id',
                'estado_gestion',
                'paquete_id',
                'fecha_notificacion',
                'creado_el',
            ])
            ->whereIn('estado_gestion', self::ESTADOS_VISIBLES);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('num_radicado', 'like', "%{$search}%")
                  ->orWhereHas('ciudadano', function ($c) use ($search) {
                      $c->where('num_documento', 'like', "%{$search}%")
                        ->orWhere('nombre_completo', 'like', "%{$search}%");
                  });
            });
        }

        if ($estado) {
            $query->where('estado_gestion', $estado);
        }

        if ($paquete_id) {
            $query->where('paquete_id', $paquete_id);
        }

        if ($fecha_inicio && $fecha_fin) {
            $query->whereBetween('creado_el', [
                Carbon::parse($fecha_inicio)->startOfDay(),
                Carbon::parse($fecha_fin)->endOfDay(),
            ]);
        }

        $solicitudes = $query
            // Orden por fecha de respuesta (ejecución o notificación desde campo,
            // son mutuamente excluyentes), no por fecha de creación de la solicitud
            // ni por fecha_resolucion (esa es de calidad, no de campo).
            ->orderByRaw('COALESCE(fecha_ejecucion, fecha_notificacion) DESC NULLS LAST')
            ->orderByDesc('id')
            ->paginate(20, ['*'], 'pagina', $pagina);

        // Reservas activas de "registro de hogar" para las solicitudes de esta
        // página, en una sola vuelta al cache en vez de una por fila.
        $bloqueos  = HogarLock::propietarios($solicitudes->pluck('id')->all());
        $usuarioId = Auth::id();

        $solicitudes = $solicitudes
            ->through(function ($s) use ($bloqueos, $usuarioId) {
                $gs = $s->gestionSistema;
                $bloqueo = $bloqueos[$s->id] ?? null;
                return [
                    'id'             => $s->id,
                    'id_SisbenApp'   => $s->id_SisbenApp,
                    'num_radicado'   => $s->num_radicado,
                    'estado_gestion' => $s->estado_gestion,
                    'paquete'        => $s->paquete_id,
                    'ciudadano' => $s->ciudadano ? [
                        'nombre_completo' => $s->ciudadano->nombre_completo,
                        'num_documento'   => $s->ciudadano->num_documento,
                        'tipo_documento'  => optional($s->ciudadano->tipoDocumento) ? (
                            trim(optional($s->ciudadano->tipoDocumento)->codigo . ' - ' . optional($s->ciudadano->tipoDocumento)->nombre)
                        ) : null,
                    ] : null,
                    'barrio'  => $s->barrio  ? ['nombre' => $s->barrio->nombre]  : null,
                    'comuna'  => $s->comuna  ? ['nombre' => $s->comuna->nombre]  : null,
                    'cantidad_hogares'  => $gs?->cantidad_hogares,
                    'categoria_sisben'  => $gs?->categoria_sisben,
                    'usuario_calidad'   => $gs && $gs->usuario
                        ? trim($gs->usuario->nombres . ' ' . $gs->usuario->apellidos)
                        : null,
                    'fecha_resolucion'  => $gs?->fecha_resolucion
                        ? Carbon::parse($gs->fecha_resolucion)->format('d/m/Y')
                        : null,
                    'tiene_registro'    => $gs !== null,
                    'puede_editar_hogar' => $this->puedeEditarHogar($gs),
                    // Otro usuario tiene el formulario de registro abierto para
                    // esta solicitud: null cuando está libre. La reserva propia no
                    // se reporta como bloqueo: quien la tiene debe poder volver a
                    // entrar al formulario (por ejemplo tras usar el botón atrás)
                    // sin esperar a que expire.
                    'bloqueado_por'     => $bloqueo && (int) $bloqueo['usuario_id'] !== $usuarioId
                        ? $bloqueo['usuario_nombre']
                        : null,
                    'fecha_notificacion' => $s->fecha_notificacion
                        ? Carbon::parse($s->fecha_notificacion)->format('d/m/Y')
                        : null,
                ];
            });

        // Los estados propios del flujo interno más los desenlaces del DNP.
        $estados = [
            'ejecutada'  => 'Ejecutada',
            'notificada' => 'Notificada',
            'cancelada'  => 'Cancelada',
        ] + self::estadosDnp();

        return Inertia::render('gestion_calidad/index', [
            'solicitudes' => $solicitudes,
            'estados'     => $estados,
            // Solo paquetes con al menos una solicitud visible en esta vista,
            // para no llenar el filtro con paquetes aún sin resolver.
            'paquetes'    => fn () => Paquete::whereHas('solicitudes', function ($q) {
                    $q->whereIn('estado_gestion', self::ESTADOS_VISIBLES);
                })
                ->orderBy('id')
                ->pluck('id'),
            'filters'     => [
                'search'       => $search,
                'estado'       => $estado,
                'paquete_id'   => $paquete_id,
                'fecha_inicio' => $fecha_inicio,
                'fecha_fin'    => $fecha_fin,
            ],
        ]);
    }

    /**
     * Detalle de una solicitud en Gestión de Calidad.
     */
    public function exportar(Request $request)
    {
        $search       = $request->get('search');
        $estado       = $request->get('estado');
        $paquete_id   = $request->get('paquete_id');
        $fecha_inicio = FechaFiltro::valida($request->get('fecha_inicio'));
        $fecha_fin    = FechaFiltro::valida($request->get('fecha_fin'));
        $tipo         = $request->get('tipo', 'xlsx');

        if ($tipo === 'csv') {
            return Excel::download(
                new CalidadExport($search, $estado, $fecha_inicio, $fecha_fin, $paquete_id),
                'gestion_calidad_' . now()->format('YmdHis') . '.csv',
                \Maatwebsite\Excel\Excel::CSV
            );
        }

        return Excel::download(
            new CalidadExport($search, $estado, $fecha_inicio, $fecha_fin, $paquete_id),
            'gestion_calidad_' . now()->format('YmdHis') . '.xlsx'
        );
    }

    public function show(int $solicitudId)
    {
        $solicitud = Solicitud::with([
            'ciudadano.tipoDocumento',
            'tipoTramite',
            'canal',
            'puntoAtencion',
            'evento',
            'usuario',
            'comuna',
            'barrio',
            'gestionSistema.usuario',
            'paquete.encuestador',
            'visitas',
        ])->whereIn('estado_gestion', self::ESTADOS_VISIBLES)
          ->findOrFail($solicitudId);

        $gs  = $solicitud->gestionSistema;
        $visita1 = $solicitud->visitas->firstWhere('numero_visita', 1);
        $visita2 = $solicitud->visitas->firstWhere('numero_visita', 2);
        $doc = DocumentoSisben::where('solicitud_id', $solicitudId)
            ->select(['id', 'nombre_original', 'tamano_bytes', 'mime_type'])
            ->first();

        return Inertia::render('gestion_calidad/show', [
            'solicitud' => [
                'id'              => $solicitud->id,
                'id_SisbenApp'    => $solicitud->id_SisbenApp ?? '—',
                'num_radicado'    => $solicitud->num_radicado ?? '—',
                'ciudadano'       => optional($solicitud->ciudadano)->nombre_completo ?? '—',
                'tipo_documento'  => optional(optional($solicitud->ciudadano)->tipoDocumento)->codigo ?? '—',
                'num_documento'   => optional($solicitud->ciudadano)->num_documento ?? '—',
                'telefono'        => optional($solicitud->ciudadano)->telefono ?? '—',
                'tipo_tramite'    => optional($solicitud->tipoTramite)->nombre ?? '—',
                'canal'           => optional($solicitud->canal)->nombre ?? '—',
                'punto'           => optional($solicitud->puntoAtencion)->nombre
                    ?? optional($solicitud->evento)->nombre ?? '—',
                'asistencial'     => $solicitud->usuario
                    ? trim(($solicitud->usuario->nombres ?? '') . ' ' . ($solicitud->usuario->apellidos ?? ''))
                    : '—',
                'direccion'       => $solicitud->direccion ?? '—',
                'observacion'     => $solicitud->observacion ?? '—',
                'estado_gestion'  => $solicitud->estado_gestion ?? '—',
                'creado_el'       => $solicitud->creado_el
                    ? Carbon::parse($solicitud->creado_el)->format('d/m/Y H:i')
                    : '—',
                'comuna'          => optional($solicitud->comuna)->nombre ?? '—',
                'barrio'          => optional($solicitud->barrio)->nombre ?? '—',
                'paquete_id'          => $solicitud->paquete_id,
                'encuestador_codigo'  => $solicitud->paquete?->encuestador?->codigo,
                'encuestador_nombre'  => $solicitud->paquete?->encuestador
                    ? trim($solicitud->paquete->encuestador->nombres . ' ' . $solicitud->paquete->encuestador->apellidos)
                    : null,
                'fecha_visita1'       => $visita1?->fecha
                    ? Carbon::parse($visita1->fecha)->format('d/m/Y') : null,
                'motivo_visita1'      => $visita1?->motivo,
                'observacion_visita1' => $visita1?->observacion,
                'fecha_visita2'       => $visita2?->fecha
                    ? Carbon::parse($visita2->fecha)->format('d/m/Y') : null,
                'motivo_visita2'      => $visita2?->motivo,
                'observacion_visita2' => $visita2?->observacion,
                'fecha_ejecucion'     => $solicitud->fecha_ejecucion
                    ? Carbon::parse($solicitud->fecha_ejecucion)->format('d/m/Y') : null,
                'fecha_notificacion'  => $solicitud->fecha_notificacion
                    ? Carbon::parse($solicitud->fecha_notificacion)->format('d/m/Y') : null,
                // Datos de gestión de calidad (hogar)
                'tiene_registro'     => $gs !== null,
                'cantidad_hogares'   => $gs?->cantidad_hogares,
                'categoria_sisben'   => $gs?->categoria_sisben,
                'observacion_dnp'    => $gs?->observacion_dnp,
                'usuario_calidad'    => $gs && $gs->usuario
                    ? trim($gs->usuario->nombres . ' ' . $gs->usuario->apellidos)
                    : null,
                'fecha_resolucion'   => $gs?->fecha_resolucion
                    ? Carbon::parse($gs->fecha_resolucion)->format('d/m/Y') : null,
                'puede_editar_hogar' => $this->puedeEditarHogar($gs),
                // Documento soporte
                'tiene_documento'    => $doc !== null,
                'documento_nombre'   => $doc?->nombre_original,
                'documento_tamano'   => $doc
                    ? round($doc->tamano_bytes / 1024 / 1024, 2) . ' MB'
                    : null,
            ],
        ]);
    }

    /**
     * Descarga el soporte PDF de una solicitud desde la BD.
     */
    public function descargarSoporte(int $solicitudId)
    {
        return $this->streamSoporte($solicitudId, 'attachment');
    }

    /**
     * Muestra el soporte PDF en el visor del navegador (sin descargarlo).
     */
    public function verSoporte(int $solicitudId)
    {
        return $this->streamSoporte($solicitudId, 'inline');
    }

    /**
     * Entrega el soporte PDF almacenado en disco con la disposición indicada.
     */
    private function streamSoporte(int $solicitudId, string $disposition)
    {
        $doc = DocumentoSisben::where('solicitud_id', $solicitudId)->firstOrFail();

        abort_unless(Storage::disk('local')->exists($doc->ruta_archivo), 404);

        // El nombre original viene de la carga del usuario: se sanea para no
        // romper la cabecera ni permitir inyección de directivas.
        $nombre = str_replace(['"', "\r", "\n"], '', $doc->nombre_original);

        return Storage::disk('local')->response($doc->ruta_archivo, $nombre, [
            'Content-Type' => 'application/pdf',
            // Archivo subido por el usuario servido en el mismo origen: se evita
            // el sniffing de tipo y se aísla cualquier script embebido en el PDF.
            // allow-downloads mantiene operativo el botón de descarga del visor.
            'X-Content-Type-Options'  => 'nosniff',
            'Content-Security-Policy' => 'sandbox allow-downloads',
        ], $disposition);
    }

    /**
     * Formulario para registrar el hogar de una solicitud ejecutada.
     */
    public function registrarHogar(int $solicitudId)
    {
        $solicitud = Solicitud::with([
            'ciudadano:id,nombre_completo,num_documento',
            'barrio:id,nombre',
            'comuna:id,nombre',
        ])->findOrFail($solicitudId);

        if ($solicitud->estado_gestion !== 'ejecutada') {
            return back()->with('error', 'Solo se puede registrar el hogar cuando la solicitud está en estado Ejecutada.');
        }

        if (GestionSistema::where('solicitud_id', $solicitudId)->exists()) {
            return redirect()->route('gestion_calidad.index')
                ->with('error', 'Esta solicitud ya tiene un hogar registrado.');
        }

        $user = Auth::user();

        if (!HogarLock::adquirir($solicitudId, $user->id, trim($user->nombres . ' ' . $user->apellidos))) {
            return redirect()->route('gestion_calidad.index')
                ->with('error', HogarLock::mensajeBloqueo($solicitudId));
        }

        return Inertia::render('gestion_calidad/registrar-hogar', [
            'solicitud' => [
                'id'             => $solicitud->id,
                'id_SisbenApp'   => $solicitud->id_SisbenApp,
                'num_radicado'   => $solicitud->num_radicado,
                'estado_gestion' => $solicitud->estado_gestion,
                'ciudadano' => $solicitud->ciudadano ? [
                    'nombre_completo' => $solicitud->ciudadano->nombre_completo,
                    'num_documento'   => $solicitud->ciudadano->num_documento,
                ] : null,
                'barrio'  => $solicitud->barrio  ? ['nombre' => $solicitud->barrio->nombre]  : null,
                'comuna'  => $solicitud->comuna  ? ['nombre' => $solicitud->comuna->nombre]  : null,
            ],
            'categorias_sisben' => self::categoriasSisben(),
            'estados_dnp'       => self::estadosDnp(),
            'usuario_actual'    => trim($user->nombres . ' ' . $user->apellidos),
            'fecha_resolucion'  => Carbon::now()->format('d/m/Y'),
            'lock_minutos'      => HogarLock::MINUTOS,
        ]);
    }

    /**
     * Almacena el registro de hogar y el soporte PDF.
     */
    public function storeHogar(Request $request, int $solicitudId)
    {
        $solicitud = Solicitud::findOrFail($solicitudId);

        if ($solicitud->estado_gestion !== 'ejecutada') {
            return back()->with('error', 'Solo se puede registrar el hogar cuando la solicitud está en estado Ejecutada.');
        }

        if (GestionSistema::where('solicitud_id', $solicitudId)->exists()) {
            return back()->with('error', 'Esta solicitud ya tiene un hogar registrado.');
        }

        $user = Auth::user();

        // Se revalida (y renueva) el bloqueo antes de guardar: cubre tanto la
        // expiración del plazo mientras el usuario diligenciaba el formulario
        // como un envío directo por POST que nunca pasó por el formulario.
        if (!HogarLock::adquirir($solicitudId, $user->id, trim($user->nombres . ' ' . $user->apellidos))) {
            return redirect()->route('gestion_calidad.index')
                ->with('error', HogarLock::mensajeBloqueo($solicitudId));
        }

        $request->validate([
            'cantidad_hogares' => ['nullable', 'integer', 'min:1', 'max:99999'],
            'categoria_sisben' => ['required', 'string', 'in:' . implode(',', array_keys(self::categoriasSisben()))],
            'estado'           => ['required', 'string', 'in:' . implode(',', array_keys(self::estadosDnp()))],
            'observacion_dnp'  => ['nullable', 'string', 'max:300'],
            'soporte_pdf'      => ['required', 'file', 'mimes:pdf', 'max:1024'],
        ], [
            'cantidad_hogares.integer'  => 'La cantidad de hogares debe ser un número entero.',
            'cantidad_hogares.min'      => 'La cantidad de hogares debe ser al menos 1.',
            'categoria_sisben.required' => 'Debe seleccionar una categoría SISBÉN.',
            'categoria_sisben.in'       => 'La categoría SISBÉN seleccionada no es válida.',
            'estado.required'           => 'Debe seleccionar el estado reportado por el DNP.',
            'estado.in'                 => 'El estado seleccionado no es válido.',
            'observacion_dnp.max'       => 'La observación del DNP no debe superar los 300 caracteres.',
            'soporte_pdf.required'      => 'El archivo soporte PDF es obligatorio.',
            'soporte_pdf.mimes'         => 'El archivo debe ser un PDF.',
            'soporte_pdf.max'           => 'El archivo no debe superar 1 MB.',
        ]);

        $estado      = $request->input('estado');
        $observacion = $this->observacionDnp($request);

        DB::transaction(function () use ($request, $solicitudId, $solicitud, $estado, $observacion) {
            GestionSistema::create([
                'solicitud_id'     => $solicitudId,
                'usuario_id'       => Auth::id(),
                'cantidad_hogares' => $request->filled('cantidad_hogares')
                    ? (int) $request->input('cantidad_hogares')
                    : null,
                'categoria_sisben' => $request->input('categoria_sisben'),
                'estado'           => $estado,
                'observacion_dnp'  => $observacion,
                'fecha_resolucion' => Carbon::now(),
            ]);

            $this->guardarSoporte($solicitudId, $request->file('soporte_pdf'));

            // El hogar queda registrado: la solicitud toma el estado del DNP.
            $solicitud->update(['estado_gestion' => $estado]);
        });

        HogarLock::liberar($solicitudId, $user->id);

        return redirect()->route('gestion_calidad.index')
            ->with('success', 'Hogar registrado correctamente.');
    }

    /**
     * Libera el bloqueo de registro de hogar sin guardar nada. Se usa cuando
     * el usuario cancela el formulario, para que el resto no tenga que
     * esperar a que la reserva expire sola.
     */
    public function liberarLockHogar(int $solicitudId)
    {
        HogarLock::liberar($solicitudId, Auth::id());

        return redirect()->route('gestion_calidad.index');
    }

    /**
     * Guarda el soporte PDF en disco (storage/app/private/soportes_hogar). Si
     * la solicitud ya tiene un soporte cargado, reemplaza el archivo anterior.
     */
    private function guardarSoporte(int $solicitudId, UploadedFile $file): void
    {
        $nombreOriginal = $file->getClientOriginalName();
        $tamano         = $file->getSize();
        $hash           = hash_file('sha256', $file->getRealPath());

        // id_SisbenApp es texto libre digitado por el usuario (puede venir
        // nulo o con caracteres no aptos para una ruta): se sanea y, si queda
        // vacío, se usa el ID interno de la solicitud como respaldo.
        $idSisbenApp = Solicitud::where('id', $solicitudId)->value('id_SisbenApp');
        $prefijo     = preg_replace('/[^A-Za-z0-9_-]/', '', (string) $idSisbenApp);
        $prefijo     = $prefijo !== '' ? $prefijo : (string) $solicitudId;

        // Nombre generado por el backend: nunca se usa el nombre original del
        // usuario como ruta en disco, para evitar path traversal o colisiones.
        $nombreArchivo = $prefijo . '_' . Str::random(10) . '.pdf';
        $rutaArchivo   = $file->storeAs('soportes_hogar', $nombreArchivo, 'local');

        $existente = DocumentoSisben::where('solicitud_id', $solicitudId)->first();

        if ($existente) {
            Storage::disk('local')->delete($existente->ruta_archivo);
        }

        DocumentoSisben::updateOrCreate(
            ['solicitud_id' => $solicitudId],
            [
                'nombre_original' => $nombreOriginal,
                'mime_type'       => 'application/pdf',
                'tamano_bytes'    => $tamano,
                'hash_sha256'     => $hash,
                'ruta_archivo'    => $rutaArchivo,
            ]
        );
    }

    /**
     * Formulario para editar el hogar registrado de una solicitud.
     */
    public function editarHogar(int $solicitudId)
    {
        $solicitud = Solicitud::with([
            'ciudadano:id,nombre_completo,num_documento',
            'barrio:id,nombre',
            'comuna:id,nombre',
        ])->findOrFail($solicitudId);

        $gs = GestionSistema::with('usuario:id,nombres,apellidos')
            ->where('solicitud_id', $solicitudId)
            ->first();

        if ($motivo = $this->motivoBloqueoEdicionHogar($gs)) {
            return redirect()->route('gestion_calidad.index')->with('error', $motivo);
        }

        $doc = DocumentoSisben::where('solicitud_id', $solicitudId)
            ->select(['id', 'nombre_original', 'tamano_bytes'])
            ->first();

        return Inertia::render('gestion_calidad/editar-hogar', [
            'solicitud' => [
                'id'             => $solicitud->id,
                'id_SisbenApp'   => $solicitud->id_SisbenApp,
                'num_radicado'   => $solicitud->num_radicado,
                'estado_gestion' => $solicitud->estado_gestion,
                'ciudadano' => $solicitud->ciudadano ? [
                    'nombre_completo' => $solicitud->ciudadano->nombre_completo,
                    'num_documento'   => $solicitud->ciudadano->num_documento,
                ] : null,
                'barrio'  => $solicitud->barrio  ? ['nombre' => $solicitud->barrio->nombre]  : null,
                'comuna'  => $solicitud->comuna  ? ['nombre' => $solicitud->comuna->nombre]  : null,
            ],
            'hogar' => [
                'cantidad_hogares' => $gs->cantidad_hogares !== null
                    ? (string) $gs->cantidad_hogares
                    : '',
                'categoria_sisben' => $gs->categoria_sisben,
                // Los registros anteriores a los estados del DNP guardaron el
                // estado del flujo interno: se cae al de la solicitud para que
                // el selector no arranque en blanco.
                'estado'           => array_key_exists((string) $gs->estado, self::estadosDnp())
                    ? $gs->estado
                    : ($solicitud->estado_gestion ?? ''),
                'observacion_dnp'  => $gs->observacion_dnp ?? '',
                'registrado_por'   => $gs->usuario
                    ? trim($gs->usuario->nombres . ' ' . $gs->usuario->apellidos)
                    : '—',
                'fecha_resolucion' => $gs->fecha_resolucion
                    ? Carbon::parse($gs->fecha_resolucion)->format('d/m/Y')
                    : '—',
                'documento_nombre' => $doc?->nombre_original,
                'documento_tamano' => $doc
                    ? round($doc->tamano_bytes / 1024 / 1024, 2) . ' MB'
                    : null,
            ],
            'categorias_sisben' => self::categoriasSisben(),
            'estados_dnp'       => self::estadosDnp(),
            'plazo_edicion'     => [
                'horas'        => PlazoEdicion::HORAS_HOGARES,
                'fecha_limite' => $this->limiteEdicionHogar($gs)->format('d/m/Y H:i'),
            ],
        ]);
    }

    /**
     * Actualiza el registro de hogar y, opcionalmente, su soporte PDF.
     */
    public function updateHogar(Request $request, int $solicitudId)
    {
        $gs = GestionSistema::where('solicitud_id', $solicitudId)->first();

        if ($motivo = $this->motivoBloqueoEdicionHogar($gs)) {
            return redirect()->route('gestion_calidad.index')->with('error', $motivo);
        }

        $request->validate([
            'cantidad_hogares' => ['nullable', 'integer', 'min:1', 'max:99999'],
            'categoria_sisben' => ['required', 'string', 'in:' . implode(',', array_keys(self::categoriasSisben()))],
            'estado'           => ['required', 'string', 'in:' . implode(',', array_keys(self::estadosDnp()))],
            'observacion_dnp'  => ['nullable', 'string', 'max:300'],
            'soporte_pdf'      => ['nullable', 'file', 'mimes:pdf', 'max:1024'],
        ], [
            'cantidad_hogares.integer'  => 'La cantidad de hogares debe ser un número entero.',
            'cantidad_hogares.min'      => 'La cantidad de hogares debe ser al menos 1.',
            'categoria_sisben.required' => 'Debe seleccionar una categoría SISBÉN.',
            'categoria_sisben.in'       => 'La categoría SISBÉN seleccionada no es válida.',
            'estado.required'           => 'Debe seleccionar el estado reportado por el DNP.',
            'estado.in'                 => 'El estado seleccionado no es válido.',
            'observacion_dnp.max'       => 'La observación del DNP no debe superar los 300 caracteres.',
            'soporte_pdf.mimes'         => 'El archivo debe ser un PDF.',
            'soporte_pdf.max'           => 'El archivo no debe superar 1 MB.',
        ]);

        $estado      = $request->input('estado');
        $observacion = $this->observacionDnp($request);

        DB::transaction(function () use ($request, $solicitudId, $gs, $estado, $observacion) {
            $gs->update([
                'cantidad_hogares' => $request->filled('cantidad_hogares')
                    ? (int) $request->input('cantidad_hogares')
                    : null,
                'categoria_sisben' => $request->input('categoria_sisben'),
                'estado'           => $estado,
                'observacion_dnp'  => $observacion,
            ]);

            // El estado del hogar y el de la solicitud son el mismo dato. Se
            // actualiza por modelo para que la auditoría registre el cambio.
            Solicitud::findOrFail($solicitudId)->update(['estado_gestion' => $estado]);

            if ($request->hasFile('soporte_pdf')) {
                $this->guardarSoporte($solicitudId, $request->file('soporte_pdf'));
            }
        });

        return redirect()->route('gestion_calidad.index')
            ->with('success', 'Registro de hogar actualizado correctamente.');
    }
}
