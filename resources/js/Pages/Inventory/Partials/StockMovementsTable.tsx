import { Badge } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';

export interface StockMovementRow {
    id: number;
    created_at: string | null;
    item_type: string;
    item_name: string;
    quantity_delta: number;
    reason: string;
    reason_label: string;
    location_name: string | null;
    note: string | null;
    user_name: string | null;
}

const REASON_TONES: Record<string, BadgeTone> = {
    opening: 'info',
    adjustment: 'warning',
    sale: 'neutral',
    waste: 'danger',
    transfer_in: 'success',
    transfer_out: 'warning',
    purchase: 'success',
    return: 'info',
};

export default function StockMovementsTable({ rows }: { rows: StockMovementRow[] }) {
    return (
        <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <tr>
                        <th className="px-6 py-3.5">Timestamp</th>
                        <th className="px-6 py-3.5">Item</th>
                        <th className="px-6 py-3.5">Reason</th>
                        <th className="px-6 py-3.5">Location</th>
                        <th className="px-6 py-3.5 text-right">Delta Change</th>
                        <th className="px-6 py-3.5">Recorded By</th>
                        <th className="px-6 py-3.5">Audit Note</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.map((m) => {
                        const isPositive = m.quantity_delta > 0;
                        const isZero = m.quantity_delta === 0;

                        return (
                            <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                                <td className="px-6 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                                    {m.created_at ? new Date(m.created_at).toLocaleString() : '—'}
                                </td>
                                <td className="px-6 py-3.5 font-medium text-gray-900">
                                    {m.item_name}
                                    <span className="ml-1.5 text-xs text-gray-400">({m.item_type})</span>
                                </td>
                                <td className="px-6 py-3.5">
                                    <Badge tone={REASON_TONES[m.reason] ?? 'neutral'}>{m.reason_label}</Badge>
                                </td>
                                <td className="px-6 py-3.5 text-gray-600">{m.location_name ?? '—'}</td>
                                <td className="px-6 py-3.5 text-right">
                                    <span
                                        className={`font-mono text-sm font-semibold tabular-nums ${
                                            isZero
                                                ? 'text-gray-500'
                                                : isPositive
                                                  ? 'text-emerald-600'
                                                  : 'text-rose-600'
                                        }`}
                                    >
                                        {isPositive ? `+${m.quantity_delta.toFixed(3)}` : m.quantity_delta.toFixed(3)}
                                    </span>
                                </td>
                                <td className="px-6 py-3.5 text-xs text-gray-600">{m.user_name ?? 'System'}</td>
                                <td className="px-6 py-3.5 text-xs text-gray-500 max-w-xs truncate">{m.note ?? '—'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
