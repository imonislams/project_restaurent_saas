import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

const DAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

interface DayRow {
    day_of_week: number;
    is_closed: boolean;
    opens_at: string;
    closes_at: string;
}

export default function HoursStep({ form }: { form: Record<string, any> }) {
    const { data, setData, post, processing, errors } = useForm<{
        days: DayRow[];
    }>(form as { days: DayRow[] });

    const updateDay = (index: number, patch: Partial<DayRow>) => {
        const days = data.days.map((day, i) =>
            i === index ? { ...day, ...patch } : day,
        );
        setData('days', days);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.hours'));
    };

    const skip = () => post(route('onboarding.skip', 'hours'));

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="divide-y divide-gray-100 rounded-md border border-gray-200">
                {data.days.map((day, index) => (
                    <div
                        key={day.day_of_week}
                        className="flex flex-wrap items-center gap-4 px-4 py-3"
                    >
                        <div className="w-28 text-sm font-medium text-gray-700">
                            {DAYS[day.day_of_week]}
                        </div>

                        <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                checked={day.is_closed}
                                onChange={(e) =>
                                    updateDay(index, {
                                        is_closed: e.target.checked,
                                    })
                                }
                            />
                            Closed
                        </label>

                        <div className="flex items-center gap-2">
                            <input
                                type="time"
                                className="rounded-md border-gray-300 shadow-sm disabled:bg-gray-100 disabled:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                                value={day.opens_at ?? ''}
                                disabled={day.is_closed}
                                onChange={(e) =>
                                    updateDay(index, {
                                        opens_at: e.target.value,
                                    })
                                }
                            />
                            <span className="text-gray-400">to</span>
                            <input
                                type="time"
                                className="rounded-md border-gray-300 shadow-sm disabled:bg-gray-100 disabled:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                                value={day.closes_at ?? ''}
                                disabled={day.is_closed}
                                onChange={(e) =>
                                    updateDay(index, {
                                        closes_at: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>
                ))}
            </div>

            <InputError message={errors.days} className="text-sm" />

            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <SecondaryButton type="button" onClick={skip}>
                    Skip for now
                </SecondaryButton>
                <PrimaryButton disabled={processing}>
                    Save &amp; continue
                </PrimaryButton>
            </div>
        </form>
    );
}
