import {
    Bar,
    BarChart as RechartsBarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { axisProps, ChartProps, seriesColor } from './common';

export default function BarChart({ data, xKey, series, height = 280, valueFormat, stacked = false }: ChartProps & { stacked?: boolean }) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsBarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey={xKey} {...axisProps} />
                <YAxis {...axisProps} width={56} tickFormatter={valueFormat ? (v: number) => valueFormat(Number(v)) : undefined} />
                <Tooltip formatter={valueFormat ? ((value: any) => valueFormat(Number(value))) : undefined} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {series.map((s, i) => (
                    <Bar key={s.key} dataKey={s.key} name={s.name} fill={seriesColor(s, i)} stackId={stacked ? 'a' : undefined} radius={[3, 3, 0, 0]} />
                ))}
            </RechartsBarChart>
        </ResponsiveContainer>
    );
}
