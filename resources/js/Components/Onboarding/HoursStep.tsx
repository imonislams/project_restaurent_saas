import StepFooter from '@/Components/Onboarding/StepFooter';
import HoursFields from '@/Components/Settings/HoursFields';
import type { SettingsOptions } from '@/Components/Settings/types';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function HoursStep({ form, options }: { form: Record<string, any>; options: SettingsOptions }) {
    const { data, setData, post, processing, errors } = useForm(form);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.hours'));
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <HoursFields data={data} setData={setData} errors={errors} options={options} />
            <StepFooter processing={processing} onSkip={() => post(route('onboarding.skip', 'hours'))} />
        </form>
    );
}
