import StepFooter from '@/Components/Onboarding/StepFooter';
import ReceiptFields from '@/Components/Settings/ReceiptFields';
import type { SettingsOptions } from '@/Components/Settings/types';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ReceiptStep({ form, options }: { form: Record<string, any>; options: SettingsOptions }) {
    const { data, setData, post, processing, errors } = useForm(form);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.receipt'));
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <ReceiptFields data={data} setData={setData} errors={errors} options={options} />
            <StepFooter processing={processing} onSkip={() => post(route('onboarding.skip', 'receipt'))} />
        </form>
    );
}
