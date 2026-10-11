import StepFooter from '@/Components/Onboarding/StepFooter';
import TaxFields from '@/Components/Settings/TaxFields';
import type { SettingsOptions } from '@/Components/Settings/types';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function TaxStep({ form, options }: { form: Record<string, any>; options: SettingsOptions }) {
    const { data, setData, post, processing, errors } = useForm(form);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.tax'));
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <TaxFields data={data} setData={setData} errors={errors} options={options} />
            <StepFooter processing={processing} onSkip={() => post(route('onboarding.skip', 'tax'))} />
        </form>
    );
}
