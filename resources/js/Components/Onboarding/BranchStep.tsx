import StepFooter from '@/Components/Onboarding/StepFooter';
import BranchFields from '@/Components/Settings/BranchFields';
import type { SettingsOptions } from '@/Components/Settings/types';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function BranchStep({ form, options }: { form: Record<string, any>; options: SettingsOptions }) {
    const { data, setData, post, processing, errors } = useForm(form);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.branch'));
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <BranchFields data={data} setData={setData} errors={errors} options={options} />
            <StepFooter processing={processing} />
        </form>
    );
}
