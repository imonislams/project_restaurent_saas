import { Button, Card, CardBody, CardDescription, CardHeader, CardTitle, CheckboxField, SelectField, TextField } from '@/Components/ui';
import { useT } from '@/i18n';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface Requirement {
    key: string;
    label: string;
    ok: boolean;
    detail: string;
    required: boolean;
}

interface StepMeta {
    value: string;
    label: string;
    done: boolean;
}

export default function InstallShow({
    step,
    steps,
    requirements,
    requirementsMet,
    form,
    options,
}: {
    step: string;
    steps: StepMeta[];
    requirements: Requirement[];
    requirementsMet: boolean;
    form: Record<string, any>;
    options: { drivers: string[]; timezones: string[] };
}) {
    const t = useT();

    const dbForm = useForm({
        driver: (form.driver as string) ?? 'mysql',
        host: (form.host as string) ?? '127.0.0.1',
        port: String(form.port ?? 3306),
        database: (form.database as string) ?? '',
        username: (form.username as string) ?? '',
        password: (form.password as string) ?? '',
        confirm_existing: Boolean(form.confirm_existing),
    });

    const appForm = useForm({
        name: (form.name as string) ?? 'Touch Dine',
        url: (form.url as string) ?? '',
        timezone: (form.timezone as string) ?? 'UTC',
    });

    const adminForm = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        create_owner: false,
        restaurant_name: '',
        owner_name: '',
        owner_email: '',
        owner_password: '',
        owner_password_confirmation: '',
    });

    const submit: (form: ReturnType<typeof useForm>) => FormEventHandler = (form) => (e) => {
        e.preventDefault();
        form.post(route('install.store', step));
    };

    const index = steps.findIndex((s) => s.value === step);
    const previous = index > 0 ? steps[index - 1] : null;

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
            <Head title={t('install.title')} />

            <div className="w-full max-w-2xl">
                <div className="mb-6 text-center">
                    <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{t('install.title')}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t('install.subtitle')}</p>
                </div>

                <ol className="mb-5 flex flex-wrap items-center justify-center gap-2">
                    {steps.map((s) => (
                        <li
                            key={s.value}
                            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                                s.value === step
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : s.done
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : 'border-input bg-background text-muted-foreground'
                            }`}
                        >
                            {t(`install.step.${s.value}`)}
                        </li>
                    ))}
                </ol>

                <Card>
                    <CardHeader>
                        <CardTitle>{t(`install.step.${step}`)}</CardTitle>
                        <CardDescription>{t(`install.${step}.description`)}</CardDescription>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        {step === 'requirements' && (
                            <>
                                <ul className="divide-y divide-border rounded-md border border-border">
                                    {requirements.map((r) => (
                                        <li key={r.key} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                            <span className="text-foreground">{r.label}</span>
                                            <span className={`text-xs font-semibold ${r.ok ? 'text-emerald-600' : 'text-destructive'}`}>
                                                {r.ok ? t('install.req.ok') : r.detail}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <form onSubmit={submit(dbForm)}>
                                    <div className="flex justify-end">
                                        <Button type="submit" variant="primary" disabled={!requirementsMet || dbForm.processing}>
                                            {t('install.continue')}
                                        </Button>
                                    </div>
                                </form>
                            </>
                        )}

                        {step === 'database' && (
                            <form onSubmit={submit(dbForm)} className="space-y-4">
                                <SelectField
                                    label={t('install.database.driver')}
                                    value={dbForm.data.driver}
                                    onChange={(v) => dbForm.setData('driver', v)}
                                    options={options.drivers.map((d) => ({ value: d, label: d }))}
                                    error={dbForm.errors.driver}
                                />
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <TextField
                                        label={t('install.database.host')}
                                        value={dbForm.data.host}
                                        onChange={(v) => dbForm.setData('host', v)}
                                        error={dbForm.errors.host}
                                        className="sm:col-span-2"
                                    />
                                    <TextField
                                        label={t('install.database.port')}
                                        value={dbForm.data.port}
                                        onChange={(v) => dbForm.setData('port', v)}
                                        error={dbForm.errors.port}
                                    />
                                </div>
                                <TextField
                                    label={t('install.database.database')}
                                    value={dbForm.data.database}
                                    onChange={(v) => dbForm.setData('database', v)}
                                    error={dbForm.errors.database}
                                />
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <TextField
                                        label={t('install.database.username')}
                                        value={dbForm.data.username}
                                        onChange={(v) => dbForm.setData('username', v)}
                                        error={dbForm.errors.username}
                                    />
                                    <TextField
                                        label={t('install.database.password')}
                                        type="password"
                                        value={dbForm.data.password}
                                        onChange={(v) => dbForm.setData('password', v)}
                                        error={dbForm.errors.password}
                                    />
                                </div>
                                <CheckboxField
                                    label={t('install.database.confirm_existing')}
                                    checked={dbForm.data.confirm_existing}
                                    onChange={(v) => dbForm.setData('confirm_existing', v)}
                                    hint={t('install.database.confirm_existing_hint')}
                                />
                                <StepActions previous={previous} processing={dbForm.processing} />
                            </form>
                        )}

                        {step === 'application' && (
                            <form onSubmit={submit(appForm)} className="space-y-4">
                                <TextField
                                    label={t('install.application.name')}
                                    value={appForm.data.name}
                                    onChange={(v) => appForm.setData('name', v)}
                                    error={appForm.errors.name}
                                />
                                <TextField
                                    label={t('install.application.url')}
                                    value={appForm.data.url}
                                    onChange={(v) => appForm.setData('url', v)}
                                    error={appForm.errors.url}
                                    hint={t('install.application.url_hint')}
                                />
                                <SelectField
                                    label={t('install.application.timezone')}
                                    value={appForm.data.timezone}
                                    onChange={(v) => appForm.setData('timezone', v)}
                                    options={options.timezones.map((tz) => ({ value: tz, label: tz }))}
                                    error={appForm.errors.timezone}
                                />
                                <StepActions previous={previous} processing={appForm.processing} />
                            </form>
                        )}

                        {step === 'administrator' && (
                            <form onSubmit={submit(adminForm)} className="space-y-4">
                                <TextField
                                    label={t('install.administrator.name')}
                                    value={adminForm.data.name}
                                    onChange={(v) => adminForm.setData('name', v)}
                                    error={adminForm.errors.name}
                                />
                                <TextField
                                    label={t('install.administrator.email')}
                                    type="email"
                                    value={adminForm.data.email}
                                    onChange={(v) => adminForm.setData('email', v)}
                                    error={adminForm.errors.email}
                                />
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <TextField
                                        label={t('install.administrator.password')}
                                        type="password"
                                        value={adminForm.data.password}
                                        onChange={(v) => adminForm.setData('password', v)}
                                        error={adminForm.errors.password}
                                    />
                                    <TextField
                                        label={t('install.administrator.password_confirm')}
                                        type="password"
                                        value={adminForm.data.password_confirmation}
                                        onChange={(v) => adminForm.setData('password_confirmation', v)}
                                    />
                                </div>

                                <CheckboxField
                                    label={t('install.administrator.create_owner')}
                                    checked={adminForm.data.create_owner}
                                    onChange={(v) => adminForm.setData('create_owner', v)}
                                    hint={t('install.administrator.create_owner_hint')}
                                />

                                {adminForm.data.create_owner && (
                                    <div className="space-y-4 rounded-md border border-border p-4">
                                        <TextField
                                            label={t('install.administrator.restaurant_name')}
                                            value={adminForm.data.restaurant_name}
                                            onChange={(v) => adminForm.setData('restaurant_name', v)}
                                            error={adminForm.errors.restaurant_name}
                                        />
                                        <TextField
                                            label={t('install.administrator.owner_name')}
                                            value={adminForm.data.owner_name}
                                            onChange={(v) => adminForm.setData('owner_name', v)}
                                            error={adminForm.errors.owner_name}
                                        />
                                        <TextField
                                            label={t('install.administrator.owner_email')}
                                            type="email"
                                            value={adminForm.data.owner_email}
                                            onChange={(v) => adminForm.setData('owner_email', v)}
                                            error={adminForm.errors.owner_email}
                                        />
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <TextField
                                                label={t('install.administrator.owner_password')}
                                                type="password"
                                                value={adminForm.data.owner_password}
                                                onChange={(v) => adminForm.setData('owner_password', v)}
                                                error={adminForm.errors.owner_password}
                                            />
                                            <TextField
                                                label={t('install.administrator.owner_password_confirm')}
                                                type="password"
                                                value={adminForm.data.owner_password_confirmation}
                                                onChange={(v) => adminForm.setData('owner_password_confirmation', v)}
                                            />
                                        </div>
                                    </div>
                                )}

                                <StepActions
                                    previous={previous}
                                    processing={adminForm.processing}
                                    submitLabel={t('install.finish')}
                                />
                            </form>
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}

function StepActions({
    previous,
    processing,
    submitLabel,
}: {
    previous: StepMeta | null;
    processing: boolean;
    submitLabel?: string;
}) {
    const t = useT();

    return (
        <div className="flex items-center justify-between pt-2">
            {previous ? (
                <Link
                    href={route('install.show', previous.value)}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                    {t('install.back')}
                </Link>
            ) : (
                <span />
            )}
            <Button type="submit" variant="primary" loading={processing}>
                {submitLabel ?? t('install.continue')}
            </Button>
        </div>
    );
}
