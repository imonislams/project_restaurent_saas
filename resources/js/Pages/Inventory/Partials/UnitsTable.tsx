import { Button } from '@/Components/ui';

export interface UnitRow {
    id: number;
    name: string;
    code: string;
}

export default function UnitsTable({
    rows,
    canManage = false,
    onEdit,
    onDelete,
}: {
    rows: UnitRow[];
    canManage?: boolean;
    onEdit?: (row: UnitRow) => void;
    onDelete?: (row: UnitRow) => void;
}) {
    return (
        <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <tr>
                        <th className="px-6 py-3.5">Unit Name</th>
                        <th className="px-6 py-3.5">Short Code</th>
                        {canManage && <th className="px-6 py-3.5 text-right print:hidden">Actions</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                            <td className="px-6 py-4">
                                <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                    {u.code}
                                </span>
                            </td>
                            {canManage && (
                                <td className="px-6 py-4 text-right print:hidden">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button size="xs" variant="secondary" onClick={() => onEdit?.(u)}>
                                            Edit
                                        </Button>
                                        <Button size="xs" variant="danger" onClick={() => onDelete?.(u)}>
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
