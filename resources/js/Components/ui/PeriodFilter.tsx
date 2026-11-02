import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { useT } from '@/i18n';
import Button from './Button';
import { cn } from './cn';
import Input from './Input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export type PeriodPreset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | '12m' | 'week' | 'month' | 'custom';

export interface PeriodValue {
    preset: PeriodPreset;
    from: string;
    to: string;
}

/** Presets shown by default, unchanged for existing callers. */
export const DEFAULT_PRESETS: Array<Exclude<PeriodPreset, 'custom'>> = ['today', 'week', 'month'];

/**
 * Every preset the server understands, in the order the Marketing & Growth
 * workspace offers them.
 */
export const EXTENDED_PRESETS: Array<Exclude<PeriodPreset, 'custom'>> = [
    'today',
    'yesterday',
    '7d',
    '30d',
    '90d',
    '12m',
];

const PRESET_LABEL_KEYS: Record<Exclude<PeriodPreset, 'custom'>, string> = {
    today: 'dash.today',
    week: 'dash.week',
    month: 'dash.month',
    yesterday: 'dash.period.yesterday',
    '7d': 'dash.period.7d',
    '30d': 'dash.period.30d',
    '90d': 'dash.period.90d',
    '12m': 'dash.period.12m',
};

const iso = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Local-date range for a preset, mirroring the server (weeks start Monday).
 * Only used for display; the server recomputes the authoritative window.
 */
export function presetRange(preset: Exclude<PeriodPreset, 'custom'>): { from: string; to: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const daysBack = (days: number) => {
        const date = new Date(start);
        date.setDate(start.getDate() - days);
        return iso(date);
    };

    if (preset === 'yesterday') {
        return { from: daysBack(1), to: daysBack(1) };
    }

    if (preset === '7d') return { from: daysBack(6), to: iso(start) };
    if (preset === '30d') return { from: daysBack(29), to: iso(start) };
    if (preset === '90d') return { from: daysBack(89), to: iso(start) };

    if (preset === '12m') {
        const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        return { from: iso(from), to: iso(start) };
    }

    if (preset === 'week') {
        const offset = (start.getDay() + 6) % 7; // Monday = 0
        const monday = new Date(start);
        monday.setDate(start.getDate() - offset);
        return { from: iso(monday), to: iso(start) };
    }

    if (preset === 'month') {
        return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(start) };
    }

    return { from: iso(start), to: iso(start) };
}

export default function PeriodFilter({
    value,
    onChange,
    presets = DEFAULT_PRESETS,
}: {
    value: PeriodValue;
    onChange: (value: PeriodValue) => void;
    /** Override the offered presets. Defaults to the original today/week/month set. */
    presets?: Array<Exclude<PeriodPreset, 'custom'>>;
}) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState({ from: value.from, to: value.to });

    const selectPreset = (preset: Exclude<PeriodPreset, 'custom'>) => {
        onChange({ preset, ...presetRange(preset) });
    };

    const applyCustom = () => {
        if (!draft.from || !draft.to) return;
        const [from, to] = draft.from <= draft.to ? [draft.from, draft.to] : [draft.to, draft.from];
        onChange({ preset: 'custom', from, to });
        setOpen(false);
    };

    const itemClass = (active: boolean) =>
        cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
            active
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        );

    return (
        <div className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-xs">
            {presets.map((key) => (
                <button key={key} type="button" onClick={() => selectPreset(key)} className={itemClass(value.preset === key)}>
                    {t(PRESET_LABEL_KEYS[key])}
                </button>
            ))}

            <Popover
                open={open}
                onOpenChange={(next) => {
                    setOpen(next);
                    if (next) setDraft({ from: value.from, to: value.to });
                }}
            >
                <PopoverTrigger asChild>
                    <button type="button" className={itemClass(value.preset === 'custom')}>
                        <Calendar className="h-3.5 w-3.5" />
                        {t('dash.custom')}
                    </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 space-y-3 p-3">
                    <div className="space-y-1">
                        <label htmlFor="period-from" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {t('dash.from')}
                        </label>
                        <Input id="period-from" type="date" value={draft.from} onChange={(event) => setDraft((prev) => ({ ...prev, from: event.target.value }))} />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="period-to" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {t('dash.to')}
                        </label>
                        <Input id="period-to" type="date" value={draft.to} onChange={(event) => setDraft((prev) => ({ ...prev, to: event.target.value }))} />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <Button type="button" size="xs" variant="secondary" onClick={() => setOpen(false)}>
                            {t('dash.cancel')}
                        </Button>
                        <Button type="button" size="xs" variant="primary" onClick={applyCustom} disabled={!draft.from || !draft.to}>
                            {t('dash.apply')}
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
