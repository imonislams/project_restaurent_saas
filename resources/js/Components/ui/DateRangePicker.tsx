import { cn } from './cn';

export interface DateRange {
    from: string;
    to: string;
    preset?: string;
}

export const RANGE_PRESETS: Array<{ key: string; label: string }> = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' },
    { key: 'month', label: 'This month' },
    { key: 'prev_month', label: 'Previous month' },
    { key: 'quarter', label: 'This quarter' },
    { key: 'year', label: 'This year' },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Resolve a preset key into a concrete from/to range (dates in the browser locale). */
export function resolvePreset(key: string): DateRange {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (key) {
        case 'today':
            return { from: iso(start), to: iso(start), preset: key };
        case '7d': {
            const from = new Date(start);
            from.setDate(from.getDate() - 6);
            return { from: iso(from), to: iso(start), preset: key };
        }
        case '30d': {
            const from = new Date(start);
            from.setDate(from.getDate() - 29);
            return { from: iso(from), to: iso(start), preset: key };
        }
        case 'month':
            return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(start), preset: key };
        case 'prev_month':
            return {
                from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
                to: iso(new Date(now.getFullYear(), now.getMonth(), 0)),
                preset: key,
            };
        case 'quarter': {
            const q = Math.floor(now.getMonth() / 3);
            return { from: iso(new Date(now.getFullYear(), q * 3, 1)), to: iso(start), preset: key };
        }
        case 'year':
            return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(start), preset: key };
        default:
            return { from: iso(start), to: iso(start) };
    }
}

export default function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
                {RANGE_PRESETS.map((preset) => (
                    <button
                        key={preset.key}
                        type="button"
                        onClick={() => onChange(resolvePreset(preset.key))}
                        className={cn(
                            'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                            value.preset === preset.key ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                        )}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-1">
                <input
                    type="date"
                    value={value.from}
                    onChange={(e) => onChange({ ...value, from: e.target.value, preset: undefined })}
                    className="rounded-md border-gray-300 text-xs"
                    aria-label="From date"
                />
                <span className="text-gray-400">–</span>
                <input
                    type="date"
                    value={value.to}
                    onChange={(e) => onChange({ ...value, to: e.target.value, preset: undefined })}
                    className="rounded-md border-gray-300 text-xs"
                    aria-label="To date"
                />
            </div>
        </div>
    );
}
