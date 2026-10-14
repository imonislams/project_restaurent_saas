import StepFooter from '@/Components/Onboarding/StepFooter';
import { FormSection, SelectField, TextField } from '@/Components/ui';
import type { SettingsOptions } from '@/Components/Settings/types';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface Props {
    form: Record<string, any>;
    options: SettingsOptions & { roles?: { value: string; label: string }[] };
}

export default function TeamStep({ form, options }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        email: form.email ?? '',
        name: form.name ?? '',
        role: form.role ?? 'branch_manager',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.team'));
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <FormSection title="Invite a teammate" description="They'll receive an email invitation to set a password and join your restaurant.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField
                        label="Email address"
                        type="email"
                        value={data.email}
                        placeholder="manager@example.com"
                        required
                        error={errors.email}
                        onChange={(v) => setData('email', v)}
                    />
                    <TextField
                        label="Name (optional)"
                        value={data.name}
                        placeholder="Full name"
                        error={errors.name}
                        onChange={(v) => setData('name', v)}
                    />
                    <SelectField
                        label="Role"
                        value={String(data.role)}
                        options={options.roles ?? []}
                        error={errors.role}
                        onChange={(v) => setData('role', v)}
                    />
                </div>
            </FormSection>
            <StepFooter processing={processing} onSkip={() => post(route('onboarding.skip', 'team'))} />
        </form>
    );
}
