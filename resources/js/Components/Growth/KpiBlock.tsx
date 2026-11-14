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
            // currency would be meaningless. Intl inserts a non-breaking space
            // between the currency and the amount, which prevents wrapping inside
            // a narrow KPI card — use a normal space so the value wraps cleanly.
            return formatMoney(Number(item.value), item.currency ?? 'USD').replace(/[\u00a0\u202f]/g, ' ');
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
                            className="flex h-full min-w-0 flex-col rounded-lg border border-dashed border-border bg-card/60 p-4"
                        >
                            <div className="min-w-0 break-words text-xs font-medium uppercase leading-snug tracking-wider text-muted-foreground">
                                {item.label}
                            </div>
                            <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">
                                {item.reason ?? 'Not available.'}
                            </p>
                        </div>
                    ),
                )}
            </div>
        </section>
    );
}
