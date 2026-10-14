import StepFooter from '@/Components/Onboarding/StepFooter';
import { Badge, TextField } from '@/Components/ui';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Info, ShieldCheck, User } from 'lucide-react';

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

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

    const avatar = initials(data.name);

    return (
        <form onSubmit={submit} className="space-y-6">
            <div className="flex animate-fade-up items-center gap-4 rounded-xl border border-border bg-gradient-to-br from-primary/5 via-transparent to-transparent p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary ring-1 ring-inset ring-primary/15">
                    {avatar || <User className="h-6 w-6" />}
                </div>
                <div className="min-w-0">
                    <div className="truncate font-display text-base font-semibold tracking-tight text-foreground">
                        {data.name || 'Your name'}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{data.role_title || 'Account owner'}</div>
                </div>
                <Badge tone="brand" dot={false} className="ml-auto hidden shrink-0 sm:inline-flex">
                    Account owner
                </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="animate-fade-up" style={{ animationDelay: '40ms' }}>
                    <TextField
                        label="Your name"
                        value={data.name}
                        placeholder="Full name"
                        required
                        error={errors.name}
                        onChange={(v) => setData('name', v)}
                    />
                </div>
                <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
                    <TextField
                        label="Role / title"
                        value={data.role_title}
                        placeholder="e.g. Owner"
                        hint="Optional"
                        error={errors.role_title}
                        onChange={(v) => setData('role_title', v)}
                    />
                </div>

                {phoneEditable ? (
                    <div className="animate-fade-up sm:col-span-2" style={{ animationDelay: '120ms' }}>
                        <TextField
                            label="Mobile number"
                            type="tel"
                            value={data.phone}
                            placeholder="+8801XXXXXXXXX"
                            hint="Optional — used to reach you about your account."
                            error={errors.phone}
                            onChange={(v) => setData('phone', v)}
                        />
                    </div>
                ) : (
                    <div className="animate-fade-up sm:col-span-2" style={{ animationDelay: '120ms' }}>
                        <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold tracking-tight text-foreground">
                            Mobile number
                            <Badge tone="success" dot={false}>
                                Verified
                            </Badge>
                        </span>
                        <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm text-foreground">
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span className="tabular-nums">{data.phone || '—'}</span>
                        </div>
                        <span className="mt-1 block text-xs text-muted-foreground">Verified by one-time code — not editable here.</span>
                    </div>
                )}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>These details appear on receipts and help us reach you about your restaurant. You can change them later in Settings.</span>
            </div>

            <StepFooter processing={processing} />
        </form>
    );
}
