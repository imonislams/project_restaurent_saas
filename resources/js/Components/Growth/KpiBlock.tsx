import { KpiCard, formatMoney, formatNumber } from '@/Components/ui';

export interface KpiItem {
    key: string;
    label: string;
    value: number | string | null;
    format: 'money' | 'number' | 'percent' | 'text';
    currency?: string | null;
    hint?: string | null;
    available: boolean;
    reason?: string | null;
}

export interface KpiBlockData {
    key: string;
    label: string;
    items: KpiItem[];
}

/** Render a metric value in its own unit. Never a bare number without context. */
export function formatKpiValue(item: KpiItem): string {
    if (item.value === null || item.value === undefined) {
        return '—';
    }

    switch (item.format) {
        case 'money':
            // Currency is always supplied by the server; a money figure without a
            // currency would be meaningless.
            return formatMoney(Number(item.value), item.currency ?? 'USD');
        case 'number':
            return formatNumber(Number(item.value));
        case 'percent':
            return `${Number(item.value).toFixed(1)}%`;
        default:
            return String(item.value);
    }
}

/**
 * A titled block of KPI cards.
 *
 * An unavailable metric renders its reason instead of a number — there is no
 * placeholder or substituted value anywhere in this workspace.
 */
export default function KpiBlock({ block }: { block: KpiBlockData }) {
    return (
        <section aria-labelledby={`kpi-block-${block.key}`}>
            <h2
                id={`kpi-block-${block.key}`}
                className="mb-3 text-sm font-semibold tracking-tight text-foreground"
            >
                {block.label}
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
                {block.items.map((item) =>
                    item.available ? (
                        <KpiCard
                            key={item.key}
                            label={item.label}
                            value={<span className="font-mono text-xl">{formatKpiValue(item)}</span>}
                            hint={item.hint ?? undefined}
                        />
                    ) : (
                        <div
                            key={item.key}
                            className="rounded-lg border border-dashed border-border bg-card/60 p-4"
                        >
                            <div className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {item.label}
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                {item.reason ?? 'Not available.'}
                            </p>
                        </div>
                    ),
                )}
            </div>
        </section>
    );
}
