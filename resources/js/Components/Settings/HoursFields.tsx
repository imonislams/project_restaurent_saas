import { FormSection } from '@/Components/ui';
import { useT } from '@/i18n';
import type { FieldProps } from './types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DayRow {
    day_of_week: number;
    is_closed: boolean;
    opens_at: string;
    closes_at: string;
}

export default function HoursFields({ data, setData, errors }: FieldProps) {
    const t = useT();
    const days: DayRow[] = data.days ?? [];

    const updateDay = (index: number, patch: Partial<DayRow>) => {
        setData('days', days.map((day, i) => (i === index ? { ...day, ...patch } : day)));
    };

    return (
        <FormSection title={t('settings.tab.hours')} description="Set the days and hours this branch is open. Closed days are skipped in reports.">
            <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
                {days.map((day, index) => (
                    <div key={day.day_of_week} className="flex flex-wrap items-center gap-4 px-4 py-3">
                        <div className="w-24 text-sm font-medium text-gray-700">{DAYS[day.day_of_week]}</div>
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input type="checkbox" className="rounded border-gray-300 text-indigo-600" checked={day.is_closed} onChange={(e) => updateDay(index, { is_closed: e.target.checked })} />
                            {t('settings.closed')}
                        </label>
                        <div className="flex items-center gap-2">
                            <input type="time" className="rounded-lg border-gray-300 text-sm disabled:bg-gray-50 disabled:text-gray-400" value={day.opens_at ?? ''} disabled={day.is_closed} onChange={(e) => updateDay(index, { opens_at: e.target.value })} />
                            <span className="text-gray-400">→</span>
                            <input type="time" className="rounded-lg border-gray-300 text-sm disabled:bg-gray-50 disabled:text-gray-400" value={day.closes_at ?? ''} disabled={day.is_closed} onChange={(e) => updateDay(index, { closes_at: e.target.value })} />
                        </div>
                    </div>
                ))}
            </div>
            {errors.days && <span className="block text-xs text-red-600">{errors.days}</span>}
        </FormSection>
    );
}
