import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ChartData, VizType } from './ReportChart';

const LazyReportChart = lazy(() => import('./ReportChart'));

import {
    BarChart2,
    ChevronDown,
    ChevronUp,
    Download,
    FileSpreadsheet,
    FileText,
    Filter,
    LayoutTemplate,
    Maximize2,
    PieChart as LucidePie,
    Printer,
    Table2,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchCombobox from '@/components/search-combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cspNonce } from '@/lib/csp-nonce';
import { crudo, html, sanearCelda } from '@/lib/exportacion-segura';
import type { HtmlSeguro } from '@/lib/exportacion-segura';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes del módulo
// ─────────────────────────────────────────────────────────────────────────────

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Reportes', href: '/gestion_reportes' }];

const VIZ_OPTIONS: { type: VizType; label: string; icon: React.ReactNode }[] = [
    { type: 'table', label: 'Tabla',             icon: <Table2    size={18} /> },
    { type: 'bar',   label: 'Gráfico de barras', icon: <BarChart2 size={18} /> },
    { type: 'pie',   label: 'Gráfico de pastel', icon: <LucidePie size={18} /> },
];

type DimensionKey =
    | 'asistencial'      | 'tipo_tramite'       | 'fecha_registro'     | 'punto_atencion'
    | 'evento'           | 'canal'              | 'solicitante'        | 'comuna'
    | 'barrio'           | 'estado'             | 'paquete'            | 'fecha_respuesta'
    | 'encuestador'      | 'fecha_ejecucion'    | 'fecha_notificacion' | 'fecha_visita1'
    | 'motivo_visita1'   | 'fecha_visita2'      | 'motivo_visita2'
    | 'categoria_sisben' | 'registrado_por'     | 'fecha_resolucion'
    | 'radicado'         | 'id_sisbenapp'       | 'documento'          | 'direccion'
    | 'notificada'       | 'ejecutada'          | 'tipo_documento'     | 'telefono'
    | 'observacion'      | 'codigo_encuestador';

interface DimensionOption {
    key: DimensionKey;
    label: string;
    /** Aclaración mostrada al pasar el mouse sobre la opción */
    hint?: string;
    /** Al seleccionarla, despliega el selector de granularidad (día/mes/año) */
    hasGranularity?: boolean;
}

/** Dimensiones organizadas según las etapas del proceso de negocio */
const DIMENSION_GROUPS: { title: string; options: DimensionOption[] }[] = [
    {
        title: 'Generales',
        options: [
            { key: 'id_sisbenapp',   label: 'ID SisbenApp' },
            { key: 'radicado',       label: 'Radicado' },
            { key: 'tipo_tramite',   label: 'Tipo de trámite' },
            { key: 'fecha_registro', label: 'Fecha de registro', hint: 'Fecha en que se registró la solicitud. Permite elegir granularidad día/mes/año', hasGranularity: true },
            { key: 'tipo_documento', label: 'Tipo de documento', hint: 'Tipo de documento del solicitante' },
            { key: 'documento',      label: 'Nro documento',     hint: 'Número de documento del solicitante' },
            { key: 'solicitante',    label: 'Solicitante' },
            { key: 'telefono',       label: 'Teléfono',          hint: 'Teléfono del solicitante' },
            { key: 'direccion',      label: 'Dirección',         hint: 'Dirección del solicitante' },
            { key: 'comuna',         label: 'Comuna' },
            { key: 'barrio',         label: 'Barrio' },
            { key: 'observacion',    label: 'Observación',       hint: 'Observación registrada en la solicitud' },
            { key: 'estado',         label: 'Estado',            hint: 'Estado de gestión de la solicitud' },
        ],
    },
    {
        title: 'Proceso de puntos de atención',
        options: [
            { key: 'asistencial',    label: 'Asistencial', hint: 'Usuario que registró la solicitud' },
            { key: 'punto_atencion', label: 'Punto de atención' },
            { key: 'evento',         label: 'Evento' },
            { key: 'canal',          label: 'Canal' },
        ],
    },
    {
        title: 'Proceso de campo',
        options: [
            { key: 'fecha_respuesta',    label: 'Fecha de respuesta',    hint: 'Fecha en que se resolvió la solicitud: la de ejecución o la de notificación, según el desenlace. Permite elegir granularidad día/mes/año', hasGranularity: true },
            { key: 'paquete',            label: 'Paquete' },
            { key: 'codigo_encuestador', label: 'Código encuestador' },
            { key: 'encuestador',        label: 'Nombre encuestador' },
            { key: 'fecha_ejecucion',    label: 'Fecha de ejecución',    hint: 'Fecha en que se ejecutó la visita' },
            { key: 'fecha_notificacion', label: 'Fecha de notificación', hint: 'Fecha en que se notificó la visita' },
            { key: 'ejecutada',          label: 'Ejecutada',             hint: 'Marca X si la solicitud fue ejecutada' },
            { key: 'notificada',         label: 'Notificada',            hint: 'Marca X si la solicitud fue notificada' },
            { key: 'fecha_visita1',      label: 'Fecha primera visita' },
            { key: 'motivo_visita1',     label: 'Motivo primera visita' },
            { key: 'fecha_visita2',      label: 'Fecha segunda visita' },
            { key: 'motivo_visita2',     label: 'Motivo segunda visita' },
        ],
    },
    {
        title: 'Proceso de calidad de la información',
        options: [
            { key: 'categoria_sisben', label: 'Categoría SISBÉN' },
            { key: 'registrado_por',   label: 'Registrado por',     hint: 'Usuario que registró la información de calidad' },
            { key: 'fecha_resolucion', label: 'Fecha de resolución', hint: 'Fecha en que se cargó la categoría y el soporte a la solicitud aprobada' },
        ],
    },
];

const DIMENSION_OPTIONS: DimensionOption[] = DIMENSION_GROUPS.flatMap(g => g.options);

/**
 * Dimensiones de grano fino: al incluirlas el reporte pasa a mostrar una fila
 * por solicitud (detalle), por lo que los gráficos dejan de tener sentido.
 */
const DETAIL_DIMENSIONS: DimensionKey[] = ['radicado', 'id_sisbenapp', 'documento', 'direccion', 'telefono', 'observacion'];

const hasDetailDims = (dims: DimensionKey[]) => dims.some(d => DETAIL_DIMENSIONS.includes(d));

/**
 * Catálogos disponibles como columnas de marca "X": el usuario elige valores
 * puntuales y cada uno se convierte en una columna marcada con X donde aplica.
 */
const MARK_GROUPS: { dim: DimensionKey; label: string }[] = [
    { dim: 'estado',           label: 'Estados de gestión' },
    { dim: 'tipo_tramite',     label: 'Tipos de trámite' },
    { dim: 'punto_atencion',   label: 'Puntos de atención' },
    { dim: 'evento',           label: 'Eventos' },
    { dim: 'canal',            label: 'Canales' },
    { dim: 'categoria_sisben', label: 'Categorías SISBÉN' },
];

type MarkSelection = Partial<Record<DimensionKey, string[]>>;

/** Reporte prediseñado: una combinación lista para generar con un clic */
interface ReportPreset {
    id: string;
    name: string;
    description: string;
    dimensions: DimensionKey[];
    metrics: MetricKey[];
    marks?: MarkSelection;
    /** Granularidad inicial para presets basados en un periodo (día/mes/año); por defecto 'month' */
    granularity?: 'day' | 'month' | 'year';
}

const REPORT_PRESETS: ReportPreset[] = [
    {
        id: 'solicitudes-comuna',
        name: 'Solicitudes por comuna',
        description: 'Total de solicitudes agrupadas por comuna',
        dimensions: ['comuna'],
        metrics: ['total_solicitudes'],
    },
    {
        id: 'solicitudes-punto',
        name: 'Solicitudes por punto de atención',
        description: 'Total de solicitudes agrupadas por punto de atención',
        dimensions: ['punto_atencion'],
        metrics: ['total_solicitudes'],
    },
    {
        id: 'tramites-asistencial',
        name: 'Trámites por asistencial',
        description: 'Total de solicitudes por cada tipo de trámite y asistencial',
        dimensions: ['asistencial', 'tipo_tramite'],
        metrics: ['total_solicitudes'],
    },
    {
        id: 'tramites-punto',
        name: 'Trámites por punto de atención',
        description: 'Total de solicitudes por cada tipo de trámite y punto de atención',
        dimensions: ['punto_atencion', 'tipo_tramite'],
        metrics: ['total_solicitudes'],
    },
    {
        id: 'solicitudes-encuestas-hogares-periodo',
        name: 'Solicitudes, encuestas y hogares por periodo',
        description: 'Solicitudes registradas, encuestas ejecutadas y hogares por periodo. Sin rango de fechas muestra un total histórico único; con rango, se agrupa por día, mes o año',
        dimensions: ['fecha_registro'],
        metrics: ['total_solicitudes', 'total_ejecutadas', 'total_hogares'],
        granularity: 'month',
    },
    {
        id: 'encuestas-efectivas-notificadas-periodo',
        name: 'Encuestas ejecutadas y notificadas por periodo',
        description: 'Encuestas ejecutadas y notificadas, con el total de solicitudes, por periodo. Sin rango de fechas muestra un total histórico único; con rango, se agrupa por día, mes o año',
        dimensions: ['fecha_respuesta'],
        metrics: ['total_solicitudes', 'total_ejecutadas', 'total_notificadas'],
        granularity: 'month',
    },
];

/**
 * Dimensiones indicador: en tablas y exportaciones se muestran como una marca
 * "X" cuando aplican y en blanco cuando no (los datos internos siguen siendo
 * Sí/No para que el agrupado y las gráficas conserven etiquetas legibles).
 */
const INDICATOR_DIMENSIONS: DimensionKey[] = ['notificada', 'ejecutada'];

const displayDimValue = (dk: DimensionKey, value: string | undefined): string => {
    if (value == null) return '';
    if (INDICATOR_DIMENSIONS.includes(dk)) return value === 'Sí' ? 'X' : '';
    return value;
};

// Los campos de ordenamiento se generan dinámicamente a partir del reporte comprometido

type MetricKey = 'total_solicitudes' | 'total_atenciones' | 'total_visitas' | 'total_hogares' | 'total_ejecutadas' | 'total_notificadas';

const METRIC_OPTIONS: { key: MetricKey; label: string }[] = [
    { key: 'total_solicitudes', label: 'Total de solicitudes' },
    { key: 'total_atenciones',  label: 'Total de atenciones' },
    { key: 'total_visitas',     label: 'Total de visitas' },
    { key: 'total_hogares',     label: 'Total de hogares' },
    { key: 'total_ejecutadas',  label: 'Total de encuestas ejecutadas' },
    { key: 'total_notificadas', label: 'Total de encuestas notificadas' },
];

/** Valor por defecto de los filtros tipo lista desplegable */
const FILTER_ALL = 'todos';

/** Dimensiones con datos reales disponibles en el backend */
const DATA_DIMENSIONS = new Set<DimensionKey>([
    'asistencial',
    'tipo_tramite',
    'fecha_registro',
    'punto_atencion',
    'evento',
    'canal',
    'solicitante',
    'comuna',
    'barrio',
    'estado',
    'paquete',
    'encuestador',
    'fecha_ejecucion',
    'fecha_notificacion',
    'fecha_visita1',
    'motivo_visita1',
    'fecha_visita2',
    'motivo_visita2',
]);

const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

type FilterForm = {
    asistencial_estado: 'todos' | 'activo' | 'inactivo';
    usuario_id: string;
    tipo_tramite_id: string;
    fecha_inicio: string;
    fecha_fin: string;
    punto_atencion_id: string;
    evento_id: string;
    canal_id: string;
    ciudadano_id: string;
    comuna_id: string;
    barrio_id: string;
    estado_gestion: string;
    id_sisbenapp: string;
    radicado: string;
    fecha_respuesta_inicio: string;
    fecha_respuesta_fin: string;
    paquete_id: string;
    encuestador_id: string;
    fecha_ejecucion_inicio: string;
    fecha_ejecucion_fin: string;
    fecha_notificacion_inicio: string;
    fecha_notificacion_fin: string;
    fecha_visita1_inicio: string;
    fecha_visita1_fin: string;
    motivo_visita1: string;
    fecha_visita2_inicio: string;
    fecha_visita2_fin: string;
    motivo_visita2: string;
    categoria_sisben: string;
    registrado_por_id: string;
    fecha_resolucion_inicio: string;
    fecha_resolucion_fin: string;
};

const DEFAULT_FILTER_FORM: FilterForm = {
    asistencial_estado: 'todos',
    usuario_id: FILTER_ALL,
    tipo_tramite_id: FILTER_ALL,
    fecha_inicio: '',
    fecha_fin: '',
    punto_atencion_id: FILTER_ALL,
    evento_id: FILTER_ALL,
    canal_id: FILTER_ALL,
    ciudadano_id: FILTER_ALL,
    comuna_id: FILTER_ALL,
    barrio_id: FILTER_ALL,
    estado_gestion: FILTER_ALL,
    id_sisbenapp: '',
    radicado: '',
    fecha_respuesta_inicio: '',
    fecha_respuesta_fin: '',
    paquete_id: FILTER_ALL,
    encuestador_id: FILTER_ALL,
    fecha_ejecucion_inicio: '',
    fecha_ejecucion_fin: '',
    fecha_notificacion_inicio: '',
    fecha_notificacion_fin: '',
    fecha_visita1_inicio: '',
    fecha_visita1_fin: '',
    motivo_visita1: FILTER_ALL,
    fecha_visita2_inicio: '',
    fecha_visita2_fin: '',
    motivo_visita2: FILTER_ALL,
    categoria_sisben: FILTER_ALL,
    registrado_por_id: FILTER_ALL,
    fecha_resolucion_inicio: '',
    fecha_resolucion_fin: '',
};


/** Fila dinámica: valores por clave de dimensión y de métrica */
interface DynamicTableRow {
    dimValues:    Partial<Record<DimensionKey, string>>;
    metricValues: Partial<Record<MetricKey, number>>;
}

/** Columna efectiva de la tabla: dimensión normal o marca X de un valor expandido */
type ColumnSpec =
    | { kind: 'dim';  dim: DimensionKey; label: string; center: boolean }
    | { kind: 'mark'; dim: DimensionKey; value: string; label: string };

/** Valor de celda para una columna; null se muestra como "—" */
function columnCell(row: DynamicTableRow, col: ColumnSpec): string | null {
    if (col.kind === 'mark') {
        return row.dimValues[col.dim] === col.value ? 'X' : '';
    }
    const value = row.dimValues[col.dim];
    if (value == null) return null;
    return displayDimValue(col.dim, value);
}

type RawTableRow = Record<string, string | number | null>;

/** Tabla de resultados paginada en servidor */
interface PaginatedTableData {
    data:         RawTableRow[];
    total:        number;
    current_page: number;
    last_page:    number;
    per_page:     number;
}

interface Props {
    totalSolicitudes: number;
    tableData: PaginatedTableData;
    chartTableData: RawTableRow[];
    reportDimensions: DimensionKey[];
    comunas: { id: number; nombre: string }[];
    barrios: { id: number; nombre: string; comuna_id: number }[];
    puntosAtencion: { id: number; nombre: string }[];
    tiposTramite: { id: number; nombre: string }[];
    canales: { id: number; nombre: string }[];
    asistenciales: { id: number; nombre: string; estado: boolean }[];
    eventos: { id: number; nombre: string }[];
    solicitanteSeleccionado: string | null;
    encuestadores: { id: number; nombre: string }[];
    registradores: { id: number; nombre: string }[];
    categoriasSisben: Record<string, string>;
    motivosVisita1: string[];
    motivosVisita2: string[];
    estadosDisponibles: Record<string, string>;
    filtros: Partial<FilterForm>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function GestionReporteIndex({
    totalSolicitudes,
    tableData,
    chartTableData,
    reportDimensions,
    comunas,
    barrios,
    puntosAtencion,
    tiposTramite,
    canales,
    asistenciales,
    eventos,
    solicitanteSeleccionado,
    encuestadores,
    registradores,
    categoriasSisben,
    motivosVisita1,
    motivosVisita2,
    estadosDisponibles,
    filtros,
}: Props) {
    // ── Visibilidad de resultados ───────────────────────────────────────────
    const [hasGenerated, setHasGenerated] = useState(false);

    // ── Estado de visualización ────────────────────────────────────────────
    const [vizType, setVizType] = useState<VizType>('table');
    const [isExpanded, setIsExpanded] = useState(false);
    const [showPresets, setShowPresets] = useState(true);
    const [showDesigner, setShowDesigner] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Reporte predeterminado seleccionado; se des-selecciona al modificar
    // cualquier opción del diseñador o de los filtros
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

    // Selecciones del diseñador (pueden cambiar libremente sin afectar el reporte visible)
    const [dimensions, setDimensions] = useState<DimensionKey[]>([]);
    const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([]);
    const [marksSel, setMarksSel] = useState<MarkSelection>({});

    // Granularidad de fecha_registro / fecha_respuesta cuando se agrupan por periodo.
    // 'day' (por defecto) es el comportamiento clásico de fecha exacta.
    const [granularity, setGranularity] = useState<'day' | 'month' | 'year'>('day');

    // Selecciones comprometidas: solo se actualizan al presionar "Generar reporte"
    const [committedDimensions, setCommittedDimensions] = useState<DimensionKey[]>([]);
    const [committedMetrics, setCommittedMetrics] = useState<MetricKey[]>([]);
    const [committedMarks, setCommittedMarks] = useState<MarkSelection>({});

    const [sortBy, setSortBy] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);

    // Parámetros (filtros + dimensiones + métricas) del último reporte generado.
    // Paginación, ordenamiento y export los reutilizan aunque el usuario haya
    // modificado el formulario de filtros sin volver a generar.
    const committedParams = useRef<Record<string, unknown> | null>(null);

    const { data, setData, processing } = useForm<FilterForm>({
        ...DEFAULT_FILTER_FORM,
        ...filtros,
    });

    // Cualquier cambio en los filtros des-selecciona el reporte predeterminado
    // (el preset deja de representar lo que hay configurado)
    const filtersTouched = useRef(false);
    useEffect(() => {
        if (!filtersTouched.current) {
            filtersTouched.current = true;
            return;
        }
        setSelectedPreset(null);
    }, [data]);

    const isFilterActive = (value: string) => value !== FILTER_ALL && value !== '';
    const clearSelectFilter = (key: keyof FilterForm) => setData(key, FILTER_ALL as never);

    // Filtros de búsqueda en servidor: el backend devuelve 'todos' cuando están vacíos
    const idSisbenApp = isFilterActive(data.id_sisbenapp) ? data.id_sisbenapp : '';
    const radicado    = isFilterActive(data.radicado) ? data.radicado : '';
    // El combobox de solicitante guarda el id; el nombre visible se lleva aparte
    const [solicitanteLabel, setSolicitanteLabel] = useState(solicitanteSeleccionado ?? '');
    // El nombre del paquete se deduce del id (igual que en el backend)
    const paqueteId    = isFilterActive(data.paquete_id) ? data.paquete_id : '';
    const paqueteLabel = paqueteId ? `Paquete #${paqueteId.padStart(3, '0')}` : '';
    const clearDateRange = (startKey: keyof FilterForm, endKey: keyof FilterForm) => {
        setData(startKey, '' as never);
        setData(endKey, '' as never);
    };

    // ── Listas ordenadas con localización española ─────────────────────────
    const sortedComunas = useMemo(
        () => [...comunas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true })),
        [comunas],
    );
    const filteredAsistenciales = useMemo(() => {
        const base = asistenciales.filter((u) => {
            if (data.asistencial_estado === 'activo') return u.estado;
            if (data.asistencial_estado === 'inactivo') return !u.estado;
            return true;
        });
        return [...base].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
    }, [asistenciales, data.asistencial_estado]);
    const filteredBarrios = useMemo(() => {
        const base = isFilterActive(data.comuna_id)
            ? barrios.filter((b) => String(b.comuna_id) === data.comuna_id)
            : barrios;
        return [...base].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
    }, [barrios, data.comuna_id]);

    // ── Valores disponibles por catálogo para columnas de marca X ───────────
    // (los valores deben coincidir con lo que produce la dimensión en el backend)
    const markOptions = useMemo<Partial<Record<DimensionKey, { value: string; label: string }[]>>>(() => ({
        estado:           Object.entries(estadosDisponibles).map(([value, label]) => ({ value, label })),
        tipo_tramite:     tiposTramite.map(t => ({ value: t.nombre, label: t.nombre })),
        punto_atencion:   puntosAtencion.map(p => ({ value: p.nombre, label: p.nombre })),
        evento:           eventos.map(e => ({ value: e.nombre, label: e.nombre })),
        canal:            canales.map(c => ({ value: c.nombre, label: c.nombre })),
        categoria_sisben: Object.entries(categoriasSisben).map(([value, label]) => ({ value, label })),
    }), [estadosDisponibles, tiposTramite, puntosAtencion, eventos, canales, categoriasSisben]);

    // ── Dimensión primaria (basada en selección comprometida) ───────────────
    const primaryDimension = committedDimensions.find(d => DATA_DIMENSIONS.has(d)) ?? 'comuna';

    // ── Modo servidor: el backend pagina y ordena la tabla multidimensional ──
    const serverMode = tableData.data.length > 0 && reportDimensions.length > 0;

    // ── Dimensiones activas: usa reportDimensions del backend cuando hay tableData ──
    const activeDimensions = serverMode
        ? reportDimensions
        : committedDimensions.filter(d => DATA_DIMENSIONS.has(d));

    // ── Campos de ordenamiento dinámicos según reporte comprometido ──────────
    const sortFields = useMemo(() => {
        const fields: { value: string; label: string }[] = [
            ...activeDimensions.map(dk => ({
                value: `dim:${dk}`,
                label: DIMENSION_OPTIONS.find(d => d.key === dk)?.label ?? dk,
            })),
            ...committedMetrics.map(mk => ({
                value: `metric:${mk}`,
                label: METRIC_OPTIONS.find(m => m.key === mk)?.label ?? mk,
            })),
        ];
        return fields;
    }, [activeDimensions, committedMetrics]);

    /** Convierte una fila cruda del backend al formato dinámico de la tabla */
    const mapRawRow = (row: RawTableRow, dims: DimensionKey[]): DynamicTableRow => {
        const dimValues: Partial<Record<DimensionKey, string>> = {};
        for (const dk of dims) {
            const val = row[dk];
            dimValues[dk] = val != null ? String(val) : '—';
        }
        const metricValues: Partial<Record<MetricKey, number>> = {
            total_solicitudes: Number(row.total) ?? 0,
        };
        if (row.total_atenciones != null) {
            metricValues.total_atenciones = Number(row.total_atenciones);
        }
        if (row.total_hogares != null) {
            metricValues.total_hogares = Number(row.total_hogares);
        }
        if (row.total_ejecutadas != null) {
            metricValues.total_ejecutadas = Number(row.total_ejecutadas);
        }
        if (row.total_notificadas != null) {
            metricValues.total_notificadas = Number(row.total_notificadas);
        }
        return { dimValues, metricValues };
    };

    // ── Datos dinámicos para tabla (usa selección comprometida) ─────────────
    // La página actual ya viene ordenada y paginada del backend. Sin modo
    // servidor no hay filas: la consulta del reporte no encontró resultados.
    const allTableData = useMemo<DynamicTableRow[]>(
        () => (serverMode ? tableData.data.map(row => mapRawRow(row, reportDimensions)) : []),
        [serverMode, tableData, reportDimensions],
    );

    // Ordenamiento en cliente: solo aplica al fallback (el servidor ya ordena)
    const sortedTableData = useMemo(() => {
        if (serverMode) return allTableData;
        const rows = [...allTableData].sort((a, b) => {
            if (sortBy.startsWith('dim:')) {
                const dk = sortBy.slice(4) as DimensionKey;
                const aVal = a.dimValues[dk] ?? '';
                const bVal = b.dimValues[dk] ?? '';
                return aVal.localeCompare(bVal, 'es', { numeric: true });
            }
            if (sortBy.startsWith('metric:')) {
                const mk = sortBy.slice(7) as MetricKey;
                const aVal = a.metricValues[mk] ?? 0;
                const bVal = b.metricValues[mk] ?? 0;
                return aVal - bVal;
            }
            return 0;
        });
        return sortOrder === 'desc' ? rows.reverse() : rows;
    }, [serverMode, allTableData, sortBy, sortOrder]);

    const paginatedTableData = useMemo(() => {
        if (serverMode) return sortedTableData;
        const start = (currentPage - 1) * PAGE_SIZE;
        return sortedTableData.slice(start, start + PAGE_SIZE);
    }, [serverMode, sortedTableData, currentPage]);

    const totalRows        = serverMode ? tableData.total : sortedTableData.length;
    const tableCurrentPage = serverMode ? tableData.current_page : currentPage;
    const lastPage         = serverMode ? tableData.last_page : Math.ceil(sortedTableData.length / PAGE_SIZE);

    // ── Columnas efectivas: convierte las marcas elegidas en columnas X ──
    const tableColumns = useMemo<ColumnSpec[]>(() => {
        const dims = activeDimensions.length > 0 ? activeDimensions : (['comuna'] as DimensionKey[]);
        const markValueLabel = (dim: DimensionKey, value: string): string => {
            if (dim === 'estado') return estadosDisponibles[value] ?? value;
            if (dim === 'categoria_sisben') return categoriasSisben[value] ?? value;
            return value;
        };
        const cols: ColumnSpec[] = [];
        for (const dk of dims) {
            const values = committedMarks[dk];
            if (values && values.length > 0) {
                values.forEach(v =>
                    cols.push({ kind: 'mark', dim: dk, value: v, label: markValueLabel(dk, v) }),
                );
            } else {
                cols.push({
                    kind: 'dim',
                    dim: dk,
                    label: DIMENSION_OPTIONS.find(d => d.key === dk)?.label ?? dk,
                    center: INDICATOR_DIMENSIONS.includes(dk),
                });
            }
        }
        return cols;
    }, [activeDimensions, committedMarks, estadosDisponibles, categoriasSisben]);

    // ── Datos del gráfico (usa chartTableData: dataset completo del servidor) ──
    const chartData = useMemo<ChartData>(() => {
        // Dos dimensiones: barras agrupadas / pastel combinado
        if (chartTableData.length > 0 && reportDimensions.length >= 2) {
            const [dim1, dim2] = reportDimensions;

            // Top 8 valores de la segunda dimensión por volumen total → series de barras
            const seriesTotals = new Map<string, number>();
            chartTableData.forEach(row => {
                const v = row[dim2];
                if (v != null) {
                    const s = String(v);
                    seriesTotals.set(s, (seriesTotals.get(s) ?? 0) + Number(row.total));
                }
            });
            const series = [...seriesTotals.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([s]) => s)
                .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

            // Agrupar por primera dimensión
            const grouped = new Map<string, Record<string, number>>();
            chartTableData.forEach(row => {
                const key  = String(row[dim1] ?? '—');
                const sKey = String(row[dim2] ?? '—');
                if (!grouped.has(key)) grouped.set(key, {});
                const entry = grouped.get(key)!;
                entry[sKey] = (entry[sKey] ?? 0) + Number(row.total);
            });

            // Top 15 grupos por total descendente
            const items = [...grouped.entries()]
                .map(([name, vals]) => {
                    const __total = Object.values(vals).reduce((s, v) => s + v, 0);
                    return { name, ...vals, __total };
                })
                .sort((a, b) => (b.__total as number) - (a.__total as number))
                .slice(0, 15)
                .map(({ __total, ...rest }) => rest as Record<string, string | number>);

            return { mode: 'grouped', items, series };
        }

        // Una dimensión: usar también el dataset completo del servidor
        if (chartTableData.length > 0 && reportDimensions.length === 1) {
            const dim1 = reportDimensions[0];
            return {
                mode: 'simple',
                items: [...chartTableData]
                    .sort((a, b) => Number(b.total) - Number(a.total))
                    .slice(0, 20)
                    .map(r => ({ name: String(r[dim1] ?? '—'), value: Number(r.total) })),
            };
        }

        // Sin resultados, o más de dos dimensiones (la gráfica está deshabilitada)
        return { mode: 'simple', items: [] };
    }, [chartTableData, reportDimensions]);

    // ── Manejadores ───────────────────────────────────────────────────────

    /** Genera el reporte con las selecciones indicadas (diseñador o preset) */
    const generateReport = (
        dims: DimensionKey[],
        metrics: MetricKey[],
        marks: MarkSelection,
    ) => {
        // Orden por defecto: primera métrica descendente, o primera dimensión ascendente
        const defaultSort = metrics.length > 0
            ? { by: `metric:${metrics[0]}`, order: 'desc' as const }
            : dims.length > 0
                ? { by: `dim:${dims[0]}`, order: 'asc' as const }
                : { by: '', order: 'desc' as const };

        // Columnas de marca X: se envían como marks_<dimensión> = [valores]
        const activeMarks: MarkSelection = {};
        const marksParams: Record<string, string[]> = {};
        MARK_GROUPS.forEach(({ dim }) => {
            const values = marks[dim] ?? [];
            if (values.length > 0) {
                activeMarks[dim] = values;
                marksParams[`marks_${dim}`] = values;
            }
        });

        const baseParams = {
            ...(data as Record<string, any>),
            dimensions: dims,
            metrics,
            granularity,
            ...marksParams,
        };

        router.get('/gestion_reportes', {
            ...baseParams,
            sort_by: defaultSort.by,
            sort_order: defaultSort.order,
            page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            // Los catálogos de los filtros ya llegaron con la página
            only: ['tableData', 'chartTableData', 'reportDimensions', 'totalSolicitudes'],
            onSuccess: () => {
                // Comprometer las selecciones generadas
                committedParams.current = baseParams;
                setCommittedDimensions([...dims]);
                setCommittedMetrics([...metrics]);
                setCommittedMarks(activeMarks);
                setHasGenerated(true);
                setCurrentPage(1);
                setSortBy(defaultSort.by);
                setSortOrder(defaultSort.order);

                // Con más de 2 dimensiones, campos de detalle o marcas X, forzar vista de tabla
                const newActiveDims = dims.filter(d => DATA_DIMENSIONS.has(d));
                if (newActiveDims.length > 2 || hasDetailDims(dims) || Object.keys(activeMarks).length > 0) {
                    setVizType('table');
                }
            },
        });
    };

    const handleGenerar = () => generateReport(dimensions, selectedMetrics, marksSel);

    /**
     * Carga un reporte predeterminado en el diseñador y lo deja seleccionado.
     * El reporte se genera al presionar "Generar reporte".
     */
    const applyPreset = (preset: ReportPreset) => {
        setSelectedPreset(preset.id);
        setDimensions([...preset.dimensions]);
        setSelectedMetrics([...preset.metrics]);
        setMarksSel(preset.marks ?? {});
        if (preset.granularity) setGranularity(preset.granularity);
        // Mostrar de inmediato lo que el preset configuró, en vez de dejarlo oculto
        setShowDesigner(true);
    };

    /** Deselecciona el reporte predeterminado y limpia lo que haya cargado en el diseñador */
    const clearPreset = () => {
        setSelectedPreset(null);
        setDimensions([]);
        setSelectedMetrics([]);
        setMarksSel({});
        setGranularity('day');
    };

    /** Recarga parcial de la tabla (paginación/ordenamiento en servidor) */
    const reloadTable = (extra: Record<string, unknown>) => {
        if (!committedParams.current) return;
        router.get('/gestion_reportes', {
            ...committedParams.current,
            sort_by: sortBy,
            sort_order: sortOrder,
            ...extra,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['tableData'],
        });
    };

    const handlePageChange = (page: number) => {
        if (serverMode) reloadTable({ page });
        else setCurrentPage(page);
    };

    const handleSortByChange = (value: string) => {
        setSortBy(value);
        if (serverMode) reloadTable({ sort_by: value, page: 1 });
    };

    const handleSortOrderChange = (order: 'asc' | 'desc') => {
        setSortOrder(order);
        if (serverMode) reloadTable({ sort_order: order, page: 1 });
    };

    const handleAsistencialEstadoChange = (value: 'todos' | 'activo' | 'inactivo') => {
        setData('asistencial_estado', value);
        if (data.usuario_id !== FILTER_ALL) {
            const selected = asistenciales.find((u) => String(u.id) === data.usuario_id);
            if (
                selected
                && ((value === 'activo' && !selected.estado)
                    || (value === 'inactivo' && selected.estado))
            ) {
                setData('usuario_id', FILTER_ALL);
            }
        }
    };

    const handleComunaChange = (value: string) => {
        setData('comuna_id', value);
        if (data.barrio_id !== FILTER_ALL) {
            const barrio = barrios.find((b) => String(b.id) === data.barrio_id);
            if (barrio && String(barrio.comuna_id) !== value) {
                setData('barrio_id', FILTER_ALL);
            }
        }
    };

    /** Activa o desactiva una dimensión de análisis */
    const toggleDimension = (key: DimensionKey) => {
        setSelectedPreset(null);
        setDimensions(prev =>
            prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key],
        );
        setCurrentPage(1);
    };

    /** Activa o desactiva un valor como columna de marca X */
    const toggleMark = (dim: DimensionKey, value: string) => {
        setSelectedPreset(null);
        setMarksSel(prev => {
            const current = prev[dim] ?? [];
            const next = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
            return { ...prev, [dim]: next };
        });
    };

    /** Activa o desactiva una métrica */
    const toggleMetric = (key: MetricKey) => {
        setSelectedPreset(null);
        setSelectedMetrics(prev =>
            prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key],
        );
    };

    /** Serializa los parámetros comprometidos para el endpoint de exportación */
    const buildExportQuery = (extra: Record<string, string>) => {
        const qs = new URLSearchParams();
        Object.entries(committedParams.current ?? {}).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                // Notación PHP key[]=a&key[]=b: preserva valores con espacios o comas
                value.forEach(item => qs.append(`${key}[]`, String(item)));
            } else if (value != null && value !== '') {
                qs.set(key, String(value));
            }
        });
        qs.set('sort_by', sortBy);
        qs.set('sort_order', sortOrder);
        Object.entries(extra).forEach(([key, value]) => qs.set(key, value));
        return qs.toString();
    };

    const handleExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
        // Modo servidor: Excel/CSV se generan en el backend con todas las filas
        if (serverMode && committedParams.current && (format === 'xlsx' || format === 'csv')) {
            window.location.href = `/gestion_reportes/export?${buildExportQuery({ format })}`;
            return;
        }

        // PDF en modo servidor: traer todas las filas (la tabla solo tiene la página actual)
        let exportRows = sortedTableData;
        if (serverMode && committedParams.current) {
            const res = await fetch(`/gestion_reportes/export?${buildExportQuery({ format: 'json' })}`, {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const payload: { rows: RawTableRow[] } = await res.json();
                exportRows = payload.rows.map(row => mapRawRow(row, reportDimensions));
            }
        }

        const dimsCols    = tableColumns.map(c => c.label);
        const metricsCols = committedMetrics.map(mk => METRIC_OPTIONS.find(m => m.key === mk)?.label ?? mk);
        const allCols     = [...dimsCols, ...metricsCols];
        const reportName  = `reporte-${activeDimensions[0] ?? primaryDimension}`;

        if (format === 'csv') {
            const dataRows = exportRows.map(r => {
                const dimParts    = tableColumns.map(col => `"${sanearCelda(columnCell(r, col) ?? '').replace(/"/g, '""')}"`);
                const metricParts = committedMetrics.map(mk => r.metricValues[mk] ?? 0);
                return [...dimParts, ...metricParts].join(',');
            });
            exportFile(
                '\uFEFF' + [allCols.map(c => `"${c}"`).join(','), ...dataRows].join('\r\n'),
                `${reportName}.csv`,
                'text/csv;charset=utf-8;',
            );

        } else if (format === 'xlsx') {
            // Importación dinámica: xlsx solo se descarga cuando el usuario exporta
            const XLSX = await import('xlsx');

            // Construir matriz de datos para SheetJS
            const rows: (string | number)[][] = [
                allCols,
                ...exportRows.map(r => [
                    ...tableColumns.map(col => sanearCelda(columnCell(r, col) ?? '')),
                    ...committedMetrics.map(mk => r.metricValues[mk] ?? 0),
                ]),
            ];
            const ws = XLSX.utils.aoa_to_sheet(rows);

            // Ancho automático por columna
            ws['!cols'] = allCols.map((_, ci) => ({
                wch: Math.max(
                    allCols[ci].length,
                    ...rows.slice(1).map(r => String(r[ci] ?? '').length),
                ) + 2,
            }));

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
            XLSX.writeFile(wb, `${reportName}.xlsx`);

        } else {
            // PDF: usar iframe oculto para imprimir sin abrir nueva pestaña.
            // La plantilla `html` escapa cada interpolación. La tabla se estiliza
            // con clases definidas en printHtmlTable: la CSP rechaza los
            // atributos style="..." escritos en el HTML.
            const headerRow = html`<tr>${allCols.map(c => html`<th scope="col">${c}</th>`)}</tr>`;
            const bodyRows  = exportRows.map(r => {
                const dimCells    = tableColumns.map(col => {
                    const centered = (col.kind === 'mark' || (col.kind === 'dim' && col.center)) ? crudo(' class="centro"') : crudo('');
                    return html`<td${centered}>${columnCell(r, col) ?? ''}</td>`;
                });
                const metricCells = committedMetrics.map(mk => html`<td class="num">${r.metricValues[mk]?.toLocaleString('es') ?? ''}</td>`);
                return html`<tr>${[...dimCells, ...metricCells]}</tr>`;
            });
            const tableHtml = html`<table>${headerRow}${bodyRows}</table>`;
            printHtmlTable(reportName, tableHtml, allCols.join(' / '));
        }
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reportes" />

            {/* Titulo de la pagina para lectores de pantalla (WCAG 2.4.6 y 1.3.1). */}
            <h1 className="sr-only">Reportes</h1>
            <div className="space-y-6 p-6">

                {/* ══════════════════════════════════════════════
                    SECCIÓN 0 — REPORTES PREDETERMINADOS
                ════════════════════════════════════════════ */}
                <Collapsible open={showPresets} onOpenChange={setShowPresets}>
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                            <CardTitle>Reportes predeterminados</CardTitle>
                            <div className="flex items-center gap-3 shrink-0">
                                {selectedPreset && (
                                    <button
                                        onClick={clearPreset}
                                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        <X size={10} /> Limpiar selección
                                    </button>
                                )}
                                <CollapsibleTrigger asChild>
                                    <button className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                        {showPresets ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </CollapsibleTrigger>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Selecciona uno de los reportes más comunes y presiona
                            &quot;Generar reporte&quot;. Puedes ajustarlo antes desde el
                            diseñador y los filtros.
                        </p>
                    </CardHeader>
                    <CollapsibleContent>
                    <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {REPORT_PRESETS.map((preset) => {
                            const isSelected = selectedPreset === preset.id;
                            return (
                                <button
                                    key={preset.id}
                                    onClick={() => applyPreset(preset)}
                                    disabled={processing}
                                    className={[
                                        'rounded-lg border p-3 text-left transition-colors disabled:opacity-50',
                                        isSelected
                                            ? 'border-muted-foreground/40 bg-muted'
                                            : 'hover:border-primary/40 hover:bg-muted/40',
                                    ].join(' ')}
                                >
                                    <p className="text-sm font-medium text-foreground">{preset.name}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
                                </button>
                            );
                        })}
                    </CardContent>
                    </CollapsibleContent>
                </Card>
                </Collapsible>

                {/* ══════════════════════════════════════════════
                    SECCIÓN 1 — DISEÑAR REPORTE
                ════════════════════════════════════════════ */}
                <Collapsible open={showDesigner} onOpenChange={setShowDesigner}>
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <LayoutTemplate size={15} className="text-muted-foreground" />
                                <CardTitle>Diseñar reporte</CardTitle>
                            </div>
                            <CollapsibleTrigger asChild>
                                <button className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                    {showDesigner ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                            </CollapsibleTrigger>
                        </div>
                    </CardHeader>
                    <CollapsibleContent>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                            {/* Dimensiones */}
                            <div className="space-y-4">
                                <p className="text-sm font-semibold text-foreground">Dimensiones</p>
                                {DIMENSION_GROUPS.map((group) => (
                                    <div key={group.title} className="space-y-2">
                                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                            {group.title}
                                        </p>
                                        <div className="flex flex-wrap items-start gap-2">
                                            {group.options.map((opt) => (
                                                <Fragment key={opt.key}>
                                                    <button
                                                        onClick={() => toggleDimension(opt.key)}
                                                        title={opt.hint}
                                                        className={[
                                                            'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                                                            dimensions.includes(opt.key)
                                                                ? 'border-primary bg-primary/10 text-primary'
                                                                : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40',
                                                        ].join(' ')}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                    {/* w-full en un flex-wrap fuerza el salto de línea aquí mismo:
                                                        el selector queda justo debajo de su pill y empuja el resto
                                                        de las dimensiones del grupo a la línea siguiente. */}
                                                    {opt.hasGranularity && dimensions.includes(opt.key) && (
                                                        <div className="w-full space-y-1.5 rounded-md border px-3 py-2.5">
                                                            <Label className="text-xs">
                                                                Agrupar {opt.label.toLowerCase()} por
                                                            </Label>
                                                            <Select
                                                                value={granularity}
                                                                onValueChange={(v) => { setSelectedPreset(null); setGranularity(v as 'day' | 'month' | 'year'); }}
                                                            >
                                                                <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="day">Día (fecha exacta)</SelectItem>
                                                                    <SelectItem value="month">Mes</SelectItem>
                                                                    <SelectItem value="year">Año</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {granularity === 'day'
                                                                    ? 'Una fila por cada fecha exacta.'
                                                                    : `Sin un rango de fechas en Filtros, el reporte muestra un único total histórico. Con un rango, se agrupa por ${granularity === 'month' ? 'mes' : 'año'}.`}
                                                            </p>
                                                        </div>
                                                    )}
                                                </Fragment>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {hasDetailDims(dimensions) && (
                                    <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                                        Con campos de detalle el reporte muestra una fila por solicitud.
                                        Los gráficos se deshabilitan en este modo.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-8">
                                {/* Métricas */}
                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-foreground">Métricas</p>
                                    <div className="space-y-2">
                                        {METRIC_OPTIONS.map((opt) => (
                                            <label
                                                key={opt.key}
                                                className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/30"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMetrics.includes(opt.key)}
                                                    onChange={() => toggleMetric(opt.key)}
                                                    className="rounded accent-primary"
                                                />
                                                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Columnas de marca (X) */}
                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-foreground">Columnas de marca (X)</p>
                                    <p className="text-xs text-muted-foreground">
                                        Cada valor seleccionado se convierte en una columna del reporte,
                                        marcada con una X en las filas donde aplica.
                                    </p>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {MARK_GROUPS.map(({ dim, label }) => {
                                            const selected = marksSel[dim] ?? [];
                                            const options  = markOptions[dim] ?? [];
                                            return (
                                                <DropdownMenu key={dim}>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full justify-between gap-1.5 font-normal"
                                                        >
                                                            <span className="truncate">{label}</span>
                                                            <span className="flex shrink-0 items-center gap-1">
                                                                {selected.length > 0 && (
                                                                    <span className="rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
                                                                        {selected.length}
                                                                    </span>
                                                                )}
                                                                <ChevronDown size={12} />
                                                            </span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="max-h-64 min-w-[220px] overflow-y-auto">
                                                        {options.map(opt => (
                                                            <DropdownMenuCheckboxItem
                                                                key={opt.value}
                                                                checked={selected.includes(opt.value)}
                                                                onCheckedChange={() => toggleMark(dim, opt.value)}
                                                                onSelect={(e) => e.preventDefault()}
                                                            >
                                                                {opt.label}
                                                            </DropdownMenuCheckboxItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    </CollapsibleContent>
                </Card>
                </Collapsible>

                {/* ════════════════════════════════════════════
                    SECCIÓN 2 — FILTROS DEL REPORTE
                ════════════════════════════════════════════ */}
                <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Filter size={15} className="text-muted-foreground" />
                                <CardTitle>Filtros del reporte</CardTitle>
                            </div>
                            <CollapsibleTrigger asChild>
                                <button className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground shrink-0">
                                    {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                            </CollapsibleTrigger>
                        </div>
                    </CardHeader>

                    <CollapsibleContent>
                    <CardContent className="space-y-6">
                        {/* ── Generales ──────────────────────────────── */}
                        <div className="space-y-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Generales</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

                            {/* ID SisbenApp */}
                            <div className="space-y-1.5">
                                <Label>ID SisbenApp</Label>
                                <SearchCombobox
                                    url="/gestion_reportes/opciones?campo=id_sisbenapp"
                                    value={idSisbenApp}
                                    label={idSisbenApp}
                                    onChange={(v) => setData('id_sisbenapp', v)}
                                    placeholder="Buscar ID SisbenApp..."
                                />
                            </div>

                            {/* Radicado */}
                            <div className="space-y-1.5">
                                <Label>Radicado</Label>
                                <SearchCombobox
                                    url="/gestion_reportes/opciones?campo=radicado"
                                    value={radicado}
                                    label={radicado}
                                    onChange={(v) => setData('radicado', v)}
                                    placeholder="Buscar radicado..."
                                />
                            </div>

                            {/* Tipo de trámite */}
                            <div className="space-y-1.5">
                                <Label>Tipo de trámite</Label>
                                <Select value={data.tipo_tramite_id} onValueChange={(v) => setData('tipo_tramite_id', v)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={FILTER_ALL}>Todos los tipos</SelectItem>
                                        {tiposTramite.map((t) => (
                                            <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isFilterActive(data.tipo_tramite_id) && (
                                    <button onClick={() => clearSelectFilter('tipo_tramite_id')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Fecha de registro */}
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>Fecha de registro</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs" value={data.fecha_inicio} onChange={(e) => setData('fecha_inicio', e.target.value)} />
                                    <input type="date" className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs" value={data.fecha_fin} onChange={(e) => setData('fecha_fin', e.target.value)} />
                                </div>
                                {(data.fecha_inicio || data.fecha_fin) && (
                                    <button onClick={() => clearDateRange('fecha_inicio', 'fecha_fin')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Solicitante */}
                            <div className="space-y-1.5">
                                <Label>Solicitante</Label>
                                <SearchCombobox
                                    url="/gestion_reportes/opciones?campo=solicitante"
                                    value={isFilterActive(data.ciudadano_id) ? data.ciudadano_id : ''}
                                    label={isFilterActive(data.ciudadano_id) ? solicitanteLabel : ''}
                                    onChange={(v, l) => {
                                        setData('ciudadano_id', v || FILTER_ALL);
                                        setSolicitanteLabel(l);
                                    }}
                                    placeholder="Buscar por nombre o documento..."
                                />
                            </div>

                            {/* Comuna */}
                            <div className="space-y-1.5">
                                <Label>Comuna</Label>
                                <Select value={data.comuna_id} onValueChange={handleComunaChange}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={FILTER_ALL}>Todas las comunas</SelectItem>
                                        {sortedComunas.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isFilterActive(data.comuna_id) && (
                                    <button onClick={() => { setData('comuna_id', FILTER_ALL); setData('barrio_id', FILTER_ALL); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Barrio */}
                            <div className="space-y-1.5">
                                <Label>Barrio</Label>
                                <Select value={data.barrio_id} onValueChange={(v) => setData('barrio_id', v)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={FILTER_ALL}>Todos los barrios</SelectItem>
                                        {filteredBarrios.map((b) => (
                                            <SelectItem key={b.id} value={String(b.id)}>{b.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isFilterActive(data.barrio_id) && (
                                    <button onClick={() => clearSelectFilter('barrio_id')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Estado de gestión */}
                            <div className="space-y-1.5">
                                <Label>Estado</Label>
                                <Select value={data.estado_gestion} onValueChange={(v) => setData('estado_gestion', v)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={FILTER_ALL}>Todos los estados</SelectItem>
                                        {Object.entries(estadosDisponibles).map(([val, label]) => (
                                            <SelectItem key={val} value={val}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isFilterActive(data.estado_gestion) && (
                                    <button onClick={() => clearSelectFilter('estado_gestion')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                        </div>
                        </div>

                        {/* ── Proceso de puntos de atención ──────────── */}
                        <div className="space-y-3 border-t pt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proceso de puntos de atención</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

                            {/* Estado del asistencial */}
                            <div className="space-y-1.5">
                                <Label>Estado del asistencial</Label>
                                <Select value={data.asistencial_estado} onValueChange={handleAsistencialEstadoChange}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos los estados</SelectItem>
                                        <SelectItem value="activo">Activo</SelectItem>
                                        <SelectItem value="inactivo">Inactivo</SelectItem>
                                    </SelectContent>
                                </Select>
                                {data.asistencial_estado !== 'todos' && (
                                    <button onClick={() => handleAsistencialEstadoChange('todos')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Asistencial */}
                            <div className="space-y-1.5">
                                <Label>Asistencial</Label>
                                <Select value={data.usuario_id} onValueChange={(v) => setData('usuario_id', v)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={FILTER_ALL}>Todos los asistenciales</SelectItem>
                                        {filteredAsistenciales.map((u) => (
                                            <SelectItem key={u.id} value={String(u.id)}>{u.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isFilterActive(data.usuario_id) && (
                                    <button onClick={() => clearSelectFilter('usuario_id')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Punto de atención */}
                            <div className="space-y-1.5">
                                <Label>Punto de atención</Label>
                                <Select value={data.punto_atencion_id} onValueChange={(v) => setData('punto_atencion_id', v)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={FILTER_ALL}>Todos los puntos</SelectItem>
                                        {puntosAtencion.map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isFilterActive(data.punto_atencion_id) && (
                                    <button onClick={() => clearSelectFilter('punto_atencion_id')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Evento */}
                            <div className="space-y-1.5">
                                <Label>Evento</Label>
                                <Select value={data.evento_id} onValueChange={(v) => setData('evento_id', v)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={FILTER_ALL}>Todos los eventos</SelectItem>
                                        {eventos.map((e) => (
                                            <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isFilterActive(data.evento_id) && (
                                    <button onClick={() => clearSelectFilter('evento_id')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Canal */}
                            <div className="space-y-1.5">
                                <Label>Canal</Label>
                                <Select value={data.canal_id} onValueChange={(v) => setData('canal_id', v)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={FILTER_ALL}>Todos los canales</SelectItem>
                                        {canales.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isFilterActive(data.canal_id) && (
                                    <button onClick={() => clearSelectFilter('canal_id')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                        </div>
                        </div>

                        {/* ── Proceso de campo ───────────────────────── */}
                        <div className="space-y-3 border-t pt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proceso de campo</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

                            {/* Paquete */}
                            <div className="space-y-1.5">
                                <Label>Paquete</Label>
                                <SearchCombobox
                                    url="/gestion_reportes/opciones?campo=paquete"
                                    value={paqueteId}
                                    label={paqueteLabel}
                                    onChange={(v) => setData('paquete_id', v || FILTER_ALL)}
                                    placeholder="Buscar por número de paquete..."
                                    minCaracteres={1}
                                />
                            </div>

                            {/* Encuestador */}
                            <div className="space-y-1.5">
                                <Label>Encuestador</Label>
                                <Select value={data.encuestador_id} onValueChange={(v) => setData('encuestador_id', v)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={FILTER_ALL}>Todos los encuestadores</SelectItem>
                                        {encuestadores.map((e) => (
                                            <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isFilterActive(data.encuestador_id) && (
                                    <button onClick={() => clearSelectFilter('encuestador_id')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Fecha de respuesta */}
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label title="Fecha en que se resolvió la solicitud: la de ejecución o la de notificación, según el desenlace">
                                    Fecha de respuesta
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs" value={data.fecha_respuesta_inicio} onChange={(e) => setData('fecha_respuesta_inicio', e.target.value)} />
                                    <input type="date" className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs" value={data.fecha_respuesta_fin} onChange={(e) => setData('fecha_respuesta_fin', e.target.value)} />
                                </div>
                                {(data.fecha_respuesta_inicio || data.fecha_respuesta_fin) && (
                                    <button onClick={() => clearDateRange('fecha_respuesta_inicio', 'fecha_respuesta_fin')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Fecha de ejecución */}
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>Fecha de ejecución</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs" value={data.fecha_ejecucion_inicio} onChange={(e) => setData('fecha_ejecucion_inicio', e.target.value)} />
                                    <input type="date" className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs" value={data.fecha_ejecucion_fin} onChange={(e) => setData('fecha_ejecucion_fin', e.target.value)} />
                                </div>
                                {(data.fecha_ejecucion_inicio || data.fecha_ejecucion_fin) && (
                                    <button onClick={() => clearDateRange('fecha_ejecucion_inicio', 'fecha_ejecucion_fin')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Fecha de notificación */}
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>Fecha de notificación</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs" value={data.fecha_notificacion_inicio} onChange={(e) => setData('fecha_notificacion_inicio', e.target.value)} />
                                    <input type="date" className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs" value={data.fecha_notificacion_fin} onChange={(e) => setData('fecha_notificacion_fin', e.target.value)} />
                                </div>
                                {(data.fecha_notificacion_inicio || data.fecha_notificacion_fin) && (
                                    <button onClick={() => clearDateRange('fecha_notificacion_inicio', 'fecha_notificacion_fin')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Fecha primera visita */}
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>Fecha primera visita</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs" value={data.fecha_visita1_inicio} onChange={(e) => setData('fecha_visita1_inicio', e.target.value)} />
                                    <input type="date" className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs" value={data.fecha_visita1_fin} onChange={(e) => setData('fecha_visita1_fin', e.target.value)} />
                                </div>
                                {(data.fecha_visita1_inicio || data.fecha_visita1_fin) && (
                                    <button onClick={() => clearDateRange('fecha_visita1_inicio', 'fecha_visita1_fin')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Motivo primera visita */}
                            <div className="space-y-1.5">
                                <Label>Motivo primera visita</Label>
                                <Select value={data.motivo_visita1} onValueChange={(v) => setData('motivo_visita1', v)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={FILTER_ALL}>Todos los motivos</SelectItem>
                                        {motivosVisita1.map((m) => (
                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isFilterActive(data.motivo_visita1) && (
                                    <button onClick={() => clearSelectFilter('motivo_visita1')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Fecha segunda visita */}
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>Fecha segunda visita</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs" value={data.fecha_visita2_inicio} onChange={(e) => setData('fecha_visita2_inicio', e.target.value)} />
                                    <input type="date" className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs" value={data.fecha_visita2_fin} onChange={(e) => setData('fecha_visita2_fin', e.target.value)} />
                                </div>
                                {(data.fecha_visita2_inicio || data.fecha_visita2_fin) && (
                                    <button onClick={() => clearDateRange('fecha_visita2_inicio', 'fecha_visita2_fin')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Motivo segunda visita */}
                            <div className="space-y-1.5">
                                <Label>Motivo segunda visita</Label>
                                <Select value={data.motivo_visita2} onValueChange={(v) => setData('motivo_visita2', v)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={FILTER_ALL}>Todos los motivos</SelectItem>
                                        {motivosVisita2.map((m) => (
                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isFilterActive(data.motivo_visita2) && (
                                    <button onClick={() => clearSelectFilter('motivo_visita2')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                        </div>
                        </div>

                        {/* ── Proceso de calidad de la información ───── */}
                        <div className="space-y-3 border-t pt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proceso de calidad de la información</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

                            {/* Categoría SISBÉN */}
                            <div className="space-y-1.5">
                                <Label>Categoría SISBÉN</Label>
                                <Select value={data.categoria_sisben} onValueChange={(v) => setData('categoria_sisben', v)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={FILTER_ALL}>Todas las categorías</SelectItem>
                                        {Object.entries(categoriasSisben).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isFilterActive(data.categoria_sisben) && (
                                    <button onClick={() => clearSelectFilter('categoria_sisben')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Registrado por */}
                            <div className="space-y-1.5">
                                <Label>Registrado por</Label>
                                <Select value={data.registrado_por_id} onValueChange={(v) => setData('registrado_por_id', v)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={FILTER_ALL}>Todos los usuarios</SelectItem>
                                        {registradores.map((u) => (
                                            <SelectItem key={u.id} value={String(u.id)}>{u.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isFilterActive(data.registrado_por_id) && (
                                    <button onClick={() => clearSelectFilter('registrado_por_id')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                            {/* Fecha de resolución */}
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>Fecha de resolución</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs" value={data.fecha_resolucion_inicio} onChange={(e) => setData('fecha_resolucion_inicio', e.target.value)} />
                                    <input type="date" className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs" value={data.fecha_resolucion_fin} onChange={(e) => setData('fecha_resolucion_fin', e.target.value)} />
                                </div>
                                {(data.fecha_resolucion_inicio || data.fecha_resolucion_fin) && (
                                    <button onClick={() => clearDateRange('fecha_resolucion_inicio', 'fecha_resolucion_fin')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={10} /> Limpiar</button>
                                )}
                            </div>

                        </div>
                        </div>
                    </CardContent>
                    </CollapsibleContent>
                </Card>
                </Collapsible>

                {/* Botón principal — siempre visible, fuera de la sección de filtros */}
                <div className="flex justify-end">
                    <Button
                        onClick={handleGenerar}
                        disabled={processing}
                        className="min-w-[160px]"
                    >
                        {processing ? 'Generando...' : 'Generar reporte'}
                    </Button>
                </div>

                {/* ══════════════════════════════════════════════
                    SECCIÓN 2 — VISUALIZACIÓN DEL REPORTE
                    Visible únicamente tras generar el reporte
                ══════════════════════════════════════════════ */}
                {hasGenerated && (
                    <>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

                        {/* ── Columna izquierda: controles ────────────────── */}
                        <div className="space-y-4 lg:col-span-4 xl:col-span-3">

                            {/* Tipo de visualización */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-semibold">
                                        Tipo de visualización
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-2">
                                    {VIZ_OPTIONS.map((opt) => {
                                        const chartDisabled = opt.type !== 'table'
                                            && (activeDimensions.length > 2 || hasDetailDims(activeDimensions));
                                        return (
                                            <button
                                                key={opt.type}
                                                disabled={chartDisabled}
                                                onClick={() => !chartDisabled && setVizType(opt.type)}
                                                title={chartDisabled
                                                    ? hasDetailDims(activeDimensions)
                                                        ? 'Los gráficos no están disponibles en reportes de detalle'
                                                        : 'Los gráficos solo están disponibles con 1 o 2 dimensiones'
                                                    : undefined}
                                                className={[
                                                    'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all',
                                                    chartDisabled
                                                        ? 'cursor-not-allowed border-border opacity-40'
                                                        : vizType === opt.type
                                                            ? 'border-primary bg-primary/5 text-primary'
                                                            : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40',
                                                ].join(' ')}
                                            >
                                                {opt.icon}
                                                <span>{opt.label}</span>
                                            </button>
                                        );
                                    })}
                                </CardContent>
                            </Card>

                            {/* Ordenar por */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-semibold">Ordenar por</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Select value={sortBy} onValueChange={handleSortByChange}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Columna" />
                                        </SelectTrigger>
                                        <SelectContent
                                            position="popper"
                                            sideOffset={4}
                                            className="min-w-[200px]"
                                        >
                                            {sortFields.map((f) => (
                                                <SelectItem key={f.value} value={f.value}>
                                                    {f.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['asc', 'desc'] as const).map((order) => (
                                            <button
                                                key={order}
                                                onClick={() => handleSortOrderChange(order)}
                                                className={[
                                                    'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                                                    sortOrder === order
                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                        : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40',
                                                ].join(' ')}
                                            >
                                                {order === 'asc' ? '↑ Ascendente' : '↓ Descendente'}
                                            </button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* ── Columna derecha: resultados ─────────────────── */}
                        <div className="lg:col-span-8 xl:col-span-9">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <CardTitle>Resultados del reporte</CardTitle>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {totalSolicitudes.toLocaleString()} solicitudes encontradas
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="shrink-0 gap-1.5"
                                                onClick={() => setIsExpanded(true)}
                                                title="Ampliar vista"
                                                aria-label="Ampliar la vista del gráfico"
                                            >
                                                <Maximize2 size={14} />
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
                                                        <Download size={14} />
                                                        Exportar
                                                        <ChevronDown size={12} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="min-w-[160px]">
                                                    <DropdownMenuItem
                                                        className="cursor-pointer gap-2"
                                                        onClick={() => handleExport('xlsx')}
                                                    >
                                                        <FileSpreadsheet size={14} />
                                                        Excel (.xlsx)
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="cursor-pointer gap-2"
                                                        onClick={() => handleExport('csv')}
                                                    >
                                                        <FileText size={14} />
                                                        CSV (.csv)
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="cursor-pointer gap-2"
                                                        onClick={() => handleExport('pdf')}
                                                    >
                                                        <Printer size={14} />
                                                        PDF / Imprimir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    {vizType === 'table' ? (
                                        <ReportTable
                                            data={paginatedTableData}
                                            totalRows={totalRows}
                                            currentPage={tableCurrentPage}
                                            lastPage={lastPage}
                                            columns={tableColumns}
                                            activeMetrics={committedMetrics}
                                            onPageChange={handlePageChange}
                                        />
                                    ) : (
                                        <Suspense fallback={<div className="flex h-80 items-center justify-center"><span className="text-sm text-muted-foreground">Cargando gráfico…</span></div>}>
                                            <LazyReportChart
                                                data={chartData}
                                                type={vizType}
                                            />
                                        </Suspense>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* ── Modal de vista ampliada ─────────────────────── */}
                    <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                        <DialogContent className="max-h-[92vh] w-[96vw] max-w-[96vw] flex flex-col gap-0 p-0 overflow-hidden">
                            <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
                                <div className="flex items-center justify-between">
                                    <DialogTitle>
                                        Resultados del reporte
                                        <span className="ml-3 text-sm font-normal text-muted-foreground">
                                            {totalSolicitudes.toLocaleString()} solicitudes
                                        </span>
                                    </DialogTitle>
                                </div>
                            </DialogHeader>
                            <div className="flex-1 overflow-auto p-6">
                                {vizType === 'table' ? (
                                    <ReportTable
                                        data={paginatedTableData}
                                        totalRows={totalRows}
                                        currentPage={tableCurrentPage}
                                        lastPage={lastPage}
                                        columns={tableColumns}
                                        activeMetrics={committedMetrics}
                                        onPageChange={handlePageChange}
                                    />
                                ) : (
                                    <div className="h-[60vh]">
                                        <Suspense fallback={<div className="flex h-full items-center justify-center"><span className="text-sm text-muted-foreground">Cargando gráfico…</span></div>}>
                                            <LazyReportChart data={chartData} type={vizType} />
                                        </Suspense>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                    </>
                )}
            </div>
        </AppLayout>
    );
}

// ─────────────────────────────────────────────────────────────────────────────// Helper de descarga
// ───────────────────────────────────────────────────────────────────────────────

function exportFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Imprime una tabla HTML mediante un iframe oculto (exportación a PDF) */
function printHtmlTable(title: string, tableHtml: HtmlSeguro, subtitle: string) {
    // El iframe hereda el origen de la aplicación, así que todo lo que se
    // escriba aquí corre con la sesión del usuario: el documento se arma con la
    // plantilla que escapa, y la tabla entra ya marcada como HtmlSeguro.
    // El iframe también hereda la CSP de la página, por eso el <style> lleva
    // el nonce.
    const documento = html`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
<style nonce="${cspNonce}">
  body { font-family: sans-serif; padding: 24px; }
  h2 { font-size: 15px; margin-bottom: 14px; }
  @page { margin: 15mm; }
  table { border-collapse: collapse; font-family: sans-serif; width: 100%; }
  th { background: #f3f4f6; border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; font-size: 12px; white-space: nowrap; }
  td { border: 1px solid #d1d5db; padding: 6px 12px; font-size: 12px; }
  td.centro { text-align: center; }
  td.num { text-align: right; }
</style></head><body>
<h2>Reporte — ${subtitle}</h2>
${tableHtml}
</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow!.document;
    doc.open();
    doc.write(documento.toString());
    doc.close();
    iframe.contentWindow!.focus();
    // Pequeño delay para que el DOM del iframe esté listo
    setTimeout(() => {
        iframe.contentWindow!.print();
        setTimeout(() => document.body.removeChild(iframe), 500);
    }, 300);
}

// ───────────────────────────────────────────────────────────────────────────────// Sub-componentes
// ─────────────────────────────────────────────────────────────────────────────


function ReportTable({
    data,
    totalRows,
    currentPage,
    lastPage,
    columns,
    activeMetrics,
    onPageChange,
}: {
    data: DynamicTableRow[];
    totalRows: number;
    currentPage: number;
    lastPage: number;
    columns: ColumnSpec[];
    activeMetrics: MetricKey[];
    onPageChange: (page: number) => void;
}) {
    if (data.length === 0) {
        return (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                    No hay datos para mostrar con los filtros aplicados.
                </p>
            </div>
        );
    }

    const startRow     = (currentPage - 1) * PAGE_SIZE + 1;
    const endRow       = Math.min(totalRows, currentPage * PAGE_SIZE);
    const visiblePages = Array.from({ length: lastPage }, (_, i) => i + 1).filter(
        (p) => Math.abs(p - currentPage) <= 2,
    );

    const thClass = 'px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground';
    const thRightClass = 'px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground';

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/30">
                            <th scope="col" className="w-10 py-3 pl-4 pr-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">#</th>
                            {columns.map((col, ci) => {
                                const centered = col.kind === 'mark' || col.center;
                                return (
                                    <th scope="col" key={ci} className={centered ? thClass.replace('text-left', 'text-center') : thClass}>
                                        {col.label}
                                    </th>
                                );
                            })}
                            {activeMetrics.map(mk => (
                                <th scope="col" key={mk} className={thRightClass}>
                                    {METRIC_OPTIONS.find(m => m.key === mk)?.label ?? mk}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.map((row, index) => {
                            const rowNumber = (currentPage - 1) * PAGE_SIZE + index + 1;
                            return (
                                <tr key={index} className="transition-colors hover:bg-muted/20">
                                    <td className="py-3.5 pl-4 pr-3 text-xs text-muted-foreground">{rowNumber}</td>
                                    {columns.map((col, ci) => {
                                        const centered = col.kind === 'mark' || col.center;
                                        const value = columnCell(row, col);
                                        return (
                                            <td
                                                key={ci}
                                                className={[
                                                    'px-3 py-3.5 font-medium text-foreground',
                                                    centered ? 'text-center' : '',
                                                ].join(' ')}
                                            >
                                                {value == null
                                                    ? <span className="text-muted-foreground">—</span>
                                                    : value}
                                            </td>
                                        );
                                    })}
                                    {activeMetrics.map(mk => (
                                        <td key={mk} className="px-3 py-3.5 pr-4 text-right tabular-nums">
                                            {row.metricValues[mk] != null
                                                ? row.metricValues[mk]!.toLocaleString()
                                                : <span className="text-muted-foreground">—</span>}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {lastPage > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Mostrando {startRow}–{endRow} de {totalRows} filas</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="rounded border px-2.5 py-1.5 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            ←
                        </button>
                        {visiblePages.map((p) => (
                            <button
                                key={p}
                                onClick={() => onPageChange(p)}
                                className={[
                                    'rounded border px-2.5 py-1.5 transition-colors',
                                    p === currentPage
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'hover:bg-muted',
                                ].join(' ')}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= lastPage}
                            className="rounded border px-2.5 py-1.5 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/** Leyenda externa reutilizable para ambos modos */
