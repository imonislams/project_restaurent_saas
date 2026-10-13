import { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from './cn';
import EmptyState from './EmptyState';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from './Table';

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
 * Enterprise shadcn/ui Server-side data table.
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

    const alignClass = (align?: string) =>
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

    return (
        <div className="rounded-md border border-border bg-card overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                        {selectable && (
                            <TableHead className="w-10 px-3 py-2.5">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={onToggleAll}
                                    aria-label="Select all rows"
                                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                                />
                            </TableHead>
                        )}
                        {columns.map((col) => (
                            <TableHead
                                key={col.key}
                                className={cn(
                                    'whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
                                    alignClass(col.align),
                                    col.className
                                )}
                            >
                                {col.sortable && onSort ? (
                                    <button
                                        onClick={() => onSort(col.key)}
                                        className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground group font-semibold cursor-pointer"
                                    >
                                        <span>{col.label}</span>
                                        {sort?.key === col.key ? (
                                            sort.direction === 'asc' ? (
                                                <ArrowUp className="h-3.5 w-3.5 text-primary" />
                                            ) : (
                                                <ArrowDown className="h-3.5 w-3.5 text-primary" />
                                            )
                                        ) : (
                                            <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100" />
                                        )}
                                    </button>
                                ) : (
                                    col.label
                                )}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => {
                        const id = rowKey(row);
                        const href = rowHref?.(row);
                        return (
                            <TableRow key={id} className="transition-colors hover:bg-muted/50">
                                {selectable && (
                                    <TableCell className="px-3 py-2.5">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(id)}
                                            onChange={() => onToggle?.(id)}
                                            aria-label="Select row"
                                            className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                                        />
                                    </TableCell>
                                )}
                                {columns.map((col, ci) => {
                                    const content = col.render ? col.render(row) : (row[col.key] as ReactNode);
                                    const cellClass = cn(
                                        'px-3 py-2.5 align-middle text-sm text-foreground/90 font-normal',
                                        alignClass(col.align),
                                        col.className
                                    );
                                    if (ci === 0 && href) {
                                        return (
                                            <TableCell key={col.key} className={cellClass}>
                                                <a
                                                    href={href}
                                                    className="font-medium text-primary hover:underline underline-offset-4"
                                                >
                                                    {content}
                                                </a>
                                            </TableCell>
                                        );
                                    }
                                    return (
                                        <TableCell key={col.key} className={cellClass}>
                                            {content}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            {rows.length === 0 && (
                <div className="p-8">
                    {empty ?? <EmptyState title="Nothing to show" />}
                </div>
            )}
        </div>
    );
}
