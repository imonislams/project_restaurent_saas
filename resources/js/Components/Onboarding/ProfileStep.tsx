import StepFooter from '@/Components/Onboarding/StepFooter';
import { FormSection, TextField } from '@/Components/ui';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ProfileStep({ form }: { form: Record<string, any> }) {
    const phoneEditable = Boolean(form.phone_editable ?? true);

    const { data, setData, post, processing, errors } = useForm({
        name: form.name ?? '',
        phone: form.phone ?? '',
        role_title: form.role_title ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.profile'));
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <FormSection title="Your details" description="Confirm who owns this account. We'll use these details on receipts and to reach you about your restaurant.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField
                        label="Your name"
                        value={data.name}
                        placeholder="Full name"
                        required
                        error={errors.name}
                        onChange={(v) => setData('name', v)}
                    />
                    <TextField
                        label="Role / title (optional)"
                        value={data.role_title}
                        placeholder="e.g. Owner"
                        error={errors.role_title}
                        onChange={(v) => setData('role_title', v)}
                    />
                    {phoneEditable ? (
                        <TextField
                            label="Mobile number (optional)"
                            value={data.phone}
                            placeholder="+8801XXXXXXXXX"
                            hint="Add a number so we can reach you about your account."
                            error={errors.phone}
                            onChange={(v) => setData('phone', v)}
                        />
                    ) : (
                        <div className="block">
                            <span className="mb-1.5 block text-xs font-semibold tracking-tight text-foreground">Mobile number (verified)</span>
                            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 py-1 text-sm text-foreground">
                                {data.phone || '—'}
                            </div>
                            <span className="mt-1 block text-xs text-muted-foreground">Verified by one-time code — this cannot be changed here.</span>
                        </div>
                    )}
                </div>
            </FormSection>
            <StepFooter processing={processing} />
        </form>
    );
}
