import { Badge, Button, formatMoney } from '@/Components/ui';

export interface IngredientRow {
    id: number;
    name: string;
    unit_id: number | null;
    unit_code: string | null;
    cost_per_unit: number;
    track_inventory: boolean;
    is_active: boolean;
}

export default function IngredientsTable({
    rows,
    currency,
    canManage = false,
    onEdit,
    onDelete,
}: {
    rows: IngredientRow[];
    currency: string;
    canManage?: boolean;
    onEdit?: (row: IngredientRow) => void;
    onDelete?: (row: IngredientRow) => void;
}) {
    return (
        <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <tr>
                        <th className="px-6 py-3.5">Ingredient Name</th>
                        <th className="px-6 py-3.5">Standard Unit</th>
                        <th className="px-6 py-3.5 text-right">Cost Per Unit</th>
                        <th className="px-6 py-3.5 text-center">Track Stock</th>
                        <th className="px-6 py-3.5 text-center">Status</th>
                        {canManage && <th className="px-6 py-3.5 text-right print:hidden">Actions</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.map((i) => (
                        <tr key={i.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">{i.name}</td>
                            <td className="px-6 py-4 text-gray-600">
                                <span className="font-mono text-xs font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/25">
                                    {i.unit_code ?? 'None'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-mono tabular-nums text-gray-900">
                                {formatMoney(i.cost_per_unit, currency)}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {i.track_inventory ? (
                                    <Badge tone="success">Tracked</Badge>
                                ) : (
                                    <Badge tone="neutral">Untracked</Badge>
                                )}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {i.is_active ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        Active
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                                        Archived
                                    </span>
                                )}
                            </td>
                            {canManage && (
                                <td className="px-6 py-4 text-right print:hidden">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button size="xs" variant="secondary" onClick={() => onEdit?.(i)}>
                                            Edit
                                        </Button>
                                        <Button size="xs" variant="danger" onClick={() => onDelete?.(i)}>
                                            Delete
                                        </Button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
