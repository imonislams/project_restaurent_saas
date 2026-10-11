import { ReactNode } from 'react';
import { cn } from './cn';
import EmptyState from './EmptyState';

export interface Column<T> {
    key: string;
    label: string;
    align?: 'left' | 'right' | 'center';
    sortable?: boolean;
    className?: string;
    render?: (row: T) => ReactNode;
}

export interface SortState {
    key: string;
    direction: 'asc' | 'desc';
}

/**
 * Server-side data table. Rows are rendered exactly as supplied (already
 * paginated on the server) — never load an entire history into the browser.
 */
export default function DataTable<T extends Record<string, any>>({
    columns,
    rows,
    rowKey,
    sort,
    onSort,
    rowHref,
    empty,
    selectable = false,
    selected = [],
    onToggle,
    onToggleAll,
}: {
    columns: Column<T>[];
    rows: T[];
    rowKey: (row: T) => string | number;
    sort?: SortState;
    onSort?: (key: string) => void;
    rowHref?: (row: T) => string;
    empty?: ReactNode;
    selectable?: boolean;
    selected?: Array<string | number>;
    onToggle?: (id: string | number) => void;
    onToggleAll?: () => void;
}) {
    const allSelected = selectable && rows.length > 0 && rows.every((r) => selected.includes(rowKey(r)));

    const alignClass = (align?: string) => (align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left');

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50/60">
                    <tr>
                        {selectable && (
                            <th className="w-10 px-4 py-2.5">
                                <input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Select all rows" className="rounded border-gray-300" />
                            </th>
                        )}
                        {columns.map((col) => (
                            <th key={col.key} className={cn('whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500', alignClass(col.align), col.className)}>
                                {col.sortable && onSort ? (
                                    <button onClick={() => onSort(col.key)} className="inline-flex items-center gap-1 transition hover:text-gray-800">
                                        {col.label}
                                        {sort?.key === col.key && <span aria-hidden="true">{sort.direction === 'asc' ? '↑' : '↓'}</span>}
                                    </button>
                                ) : (
                                    col.label
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {rows.map((row) => {
                        const id = rowKey(row);
                        const href = rowHref?.(row);
                        return (
                            <tr key={id} className="transition hover:bg-gray-50/70">
                                {selectable && (
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(id)}
                                            onChange={() => onToggle?.(id)}
                                            aria-label="Select row"
                                            className="rounded border-gray-300"
                                        />
                                    </td>
                                )}
                                {columns.map((col, ci) => {
                                    const content = col.render ? col.render(row) : (row[col.key] as ReactNode);
                                    const cellClass = cn('px-4 py-3 align-middle text-gray-700', alignClass(col.align), col.className);
                                    if (ci === 0 && href) {
                                        return (
                                            <td key={col.key} className={cellClass}>
                                                <a href={href} className="font-medium text-indigo-600 hover:text-indigo-700">
                                                    {content}
                                                </a>
                                            </td>
                                        );
                                    }
                                    return (
                                        <td key={col.key} className={cellClass}>
                                            {content}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {rows.length === 0 && (empty ?? <EmptyState title="Nothing to show" />)}
        </div>
    );
}
