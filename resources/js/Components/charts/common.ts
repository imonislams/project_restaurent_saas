export const CHART_PALETTE = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];

export interface ChartSeries {
    key: string;
    name: string;
    color?: string;
}

export interface ChartProps {
    data: Array<Record<string, any>>;
    xKey: string;
    series: ChartSeries[];
    height?: number;
    valueFormat?: (value: number) => string;
}

export const seriesColor = (series: ChartSeries, index: number): string => series.color ?? CHART_PALETTE[index % CHART_PALETTE.length];

export const axisProps = {
    tick: { fontSize: 12, fill: '#64748b' },
    stroke: '#e2e8f0',
} as const;
