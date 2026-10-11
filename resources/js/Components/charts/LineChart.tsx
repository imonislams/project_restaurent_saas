import {
    CartesianGrid,
    Legend,
    Line,
    LineChart as RechartsLineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { axisProps, ChartProps, seriesColor } from './common';

export default function LineChart({ data, xKey, series, height = 280, valueFormat }: ChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsLineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey={xKey} {...axisProps} />
                <YAxis {...axisProps} width={56} tickFormatter={valueFormat ? (v: number) => valueFormat(Number(v)) : undefined} />
                <Tooltip formatter={valueFormat ? ((value: any) => valueFormat(Number(value))) : undefined} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {series.map((s, i) => (
                    <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={seriesColor(s, i)} strokeWidth={2} dot={false} />
                ))}
            </RechartsLineChart>
        </ResponsiveContainer>
    );
}
