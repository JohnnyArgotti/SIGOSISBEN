import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

export const CHART_COLORS = [
    '#4f46e5', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

export interface ChartItem {
    id?: number;
    name: string;
    value: number;
    [key: string]: string | number | undefined;
}

export type SimpleChartData  = { mode: 'simple';  items: ChartItem[] };
export type GroupedChartData = { mode: 'grouped'; items: Record<string, string | number>[]; series: string[] };
export type ChartData        = SimpleChartData | GroupedChartData;

export type VizType = 'table' | 'bar' | 'pie';

// ── Tabla equivalente para lectores de pantalla ─────────────────────────────
/**
 * Alternativa textual del gráfico (WCAG 2.0 — 1.1.1 Contenido no textual).
 *
 * Recharts produce un SVG sin texto alternativo: para quien no ve la pantalla,
 * la información del gráfico sencillamente no existe. Esta tabla lleva los
 * mismos datos y se oculta a la vista con `sr-only`, de modo que no cambia nada
 * de lo que ve el resto de usuarios.
 *
 * La leyenda y el propio gráfico se marcan con `aria-hidden` para que el lector
 * no repita la misma información dos veces.
 */
function TablaEquivalente({ data, titulo }: { data: ChartData; titulo: string }) {
    const encabezados = data.mode === 'grouped' ? data.series : ['Total'];

    const filas = data.mode === 'grouped'
        ? data.items.map((f) => ({
            nombre: String(f.name ?? ''),
            valores: data.series.map((s) => Number(f[s] ?? 0)),
        }))
        : data.items.map((f) => ({
            nombre: String(f.name ?? ''),
            valores: [Number(f.value ?? 0)],
        }));

    return (
        <table className="sr-only">
            <caption>{titulo}</caption>
            <thead>
                <tr>
                    <th scope="col">Categoría</th>
                    {encabezados.map((h) => (
                        <th key={h} scope="col">{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {filas.map((fila, i) => (
                    <tr key={i}>
                        <th scope="row">{fila.nombre}</th>
                        {fila.valores.map((v, j) => (
                            <td key={j}>{v.toLocaleString('es')}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// ── Leyenda personalizada ────────────────────────────────────────────────────
function ChartLegend({ entries }: { entries: { label: string; color: string; value?: number }[] }) {
    return (
        // La tabla equivalente ya expone estos datos; repetirlos aqui solo
        // alargaria el recorrido del lector de pantalla.
        <div aria-hidden="true" className="max-h-32 overflow-y-auto rounded border bg-muted/30 p-2">
            <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                {entries.map((e, i) => (
                    <div key={i} className="flex items-center gap-1.5 min-w-0">
                        <span
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                            style={{ background: e.color }}
                        />
                        <span
                            className="truncate text-xs text-muted-foreground flex-1"
                            title={e.label}
                        >
                            {e.label}
                        </span>
                        {e.value !== undefined && (
                            <span className="ml-auto pl-2 text-xs font-medium tabular-nums flex-shrink-0">
                                {e.value.toLocaleString('es')}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ReportChart({
    data,
    type,
    titulo = 'Datos representados en el gráfico',
}: {
    data: ChartData;
    type: Exclude<VizType, 'table'>;
    /** Encabezado de la tabla equivalente que leen los lectores de pantalla. */
    titulo?: string;
}) {
    const isEmpty = data.items.length === 0;
    if (isEmpty) {
        return (
            <div className="flex h-80 items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                    Sin datos para mostrar en esta visualización.
                </p>
            </div>
        );
    }

    // ── Gráfico de barras ────────────────────────────────────────────────────
    if (type === 'bar') {
        if (data.mode === 'grouped') {
            const bottomMargin = data.items.some(r => String(r.name).length > 14) ? 100 : 50;
            const legendEntries = data.series.map((s, i) => ({
                label: s,
                color: CHART_COLORS[i % CHART_COLORS.length],
            }));
            return (
                <figure className="flex flex-col gap-3">
                    <TablaEquivalente data={data} titulo={titulo} />
                    <ChartLegend entries={legendEntries} />
                    <div aria-hidden="true" style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.items} margin={{ top: 4, right: 16, left: 0, bottom: bottomMargin }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                    angle={-35}
                                    textAnchor="end"
                                    interval={0}
                                />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }} />
                                {data.series.map((s, i) => (
                                    <Bar
                                        key={s}
                                        dataKey={s}
                                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                                        radius={[4, 4, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </figure>
            );
        }
        // Barra simple — color distinto por barra
        return (
            <figure className="h-80">
                <TablaEquivalente data={data} titulo={titulo} />
                <div aria-hidden="true" className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.items} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {data.items.map((_: ChartItem, i: number) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </figure>
        );
    }

    // ── Gráfico de pastel ────────────────────────────────────────────────────
    const pieItems: ChartItem[] = data.mode === 'grouped'
        ? data.items
            .flatMap(row =>
                data.series.map(s => ({
                    name: `${String(row.name)} – ${s}`,
                    value: Number(row[s] ?? 0),
                })),
            )
            .filter(x => x.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10)
        : data.items;

    const pieLegendEntries = pieItems.map((item, i) => ({
        label: item.name,
        color: CHART_COLORS[i % CHART_COLORS.length],
        value: item.value,
    }));

    return (
        <figure className="flex flex-col gap-3">
            {/*
              * En modo agrupado el pastel no dibuja `data.items` sino `pieItems`,
              * que ya viene filtrado y recortado a los 10 mayores. La tabla se
              * construye sobre esa misma lista para que describa exactamente lo
              * que se ve, ni mas ni menos.
              */}
            <TablaEquivalente data={{ mode: 'simple', items: pieItems }} titulo={titulo} />
            <div aria-hidden="true" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieItems}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={100}
                            innerRadius={55}
                            paddingAngle={3}
                        >
                            {pieItems.map((_: ChartItem, i: number) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }}
                            formatter={(value) => [Number(value).toLocaleString('es')]}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <ChartLegend entries={pieLegendEntries} />
        </figure>
    );
}
