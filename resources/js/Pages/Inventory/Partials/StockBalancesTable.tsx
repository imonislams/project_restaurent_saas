import { Badge, Button } from '@/Components/ui';

export interface StockBalanceRow {
    id: number;
    branch_id?: number;
    stock_location_id?: number;
    item_id?: number;
    branch_name: string | null;
    location_name: string | null;
    item_type: string;
    item_name: string;
    quantity: number;
}

export default function StockBalancesTable({
    rows,
    canAdjust = false,
    onAdjust,
}: {
    rows: StockBalanceRow[];
    canAdjust?: boolean;
    onAdjust?: (row: StockBalanceRow) => void;
}) {
    return (
        <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <tr>
                        <th className="px-6 py-3.5">Item Name</th>
                        <th className="px-6 py-3.5">Category Type</th>
                        <th className="px-6 py-3.5">Branch</th>
                        <th className="px-6 py-3.5">Storage Location</th>
                        <th className="px-6 py-3.5 text-right">Available Qty</th>
                        <th className="px-6 py-3.5 text-center">Stock Status</th>
                        {canAdjust && <th className="px-6 py-3.5 text-right print:hidden">Actions</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.map((b) => {
                        const isDepleted = b.quantity <= 0;
                        const isLow = b.quantity > 0 && b.quantity < 5;

                        return (
                            <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{b.item_name}</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700">
                                        {b.item_type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{b.branch_name ?? '—'}</td>
                                <td className="px-6 py-4 text-gray-600">
                                    <span className="inline-flex items-center gap-1.5 font-medium text-gray-800">
                                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                        {b.location_name ?? 'General'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span
                                        className={`font-mono text-sm font-semibold tabular-nums ${
                                            isDepleted ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-gray-900'
                                        }`}
                                    >
                                        {b.quantity.toFixed(3)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {isDepleted ? (
                                        <Badge tone="danger">Depleted / Negative</Badge>
                                    ) : isLow ? (
                                        <Badge tone="warning">Low Stock</Badge>
                                    ) : (
                                        <Badge tone="success">Adequate</Badge>
                                    )}
                                </td>
                                {canAdjust && (
                                    <td className="px-6 py-4 text-right print:hidden">
                                        <Button size="xs" variant="secondary" onClick={() => onAdjust?.(b)}>
                                            Adjust Count
                                        </Button>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
