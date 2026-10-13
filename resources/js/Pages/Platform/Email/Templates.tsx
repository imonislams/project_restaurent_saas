import { Badge, Button, Card, CardBody, CardHeader, CheckboxField, ConfirmDialog, RichTextEditor, TextField, formatDateTime } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';

interface TemplateRow {
    key: string;
    name: string;
    subject: string;
    body: string;
    variables: string[];
    is_active: boolean;
    updated_at: string | null;
}

export default function EmailTemplates({
    templates,
    selected_key,
    preview,
}: {
    templates: TemplateRow[];
    selected_key: string;
    preview: { subject: string; body: string } | null;
}) {
    const selected = templates.find((t) => t.key === selected_key) ?? templates[0];
    const [tab, setTab] = useState<'preview' | 'edit'>('preview');
    const [confirmReset, setConfirmReset] = useState(false);
    const [previewWidth, setPreviewWidth] = useState<'full' | 'mobile'>('full');
    const [showSource, setShowSource] = useState(false);

    const form = useForm({ name: '', subject: '', body: '', is_active: true });
    const test = useForm({ email: '' });

    useEffect(() => {
        if (selected) {
            form.setData({ name: selected.name, subject: selected.subject, body: selected.body, is_active: selected.is_active });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected_key]);

    const save: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('platform.email.templates.update', selected.key), { preserveScroll: true, onSuccess: () => setTab('preview') });
    };

    const sendTest: FormEventHandler = (e) => {
        e.preventDefault();
        test.post(route('platform.email.templates.test', selected.key), { preserveScroll: true });
    };

    const tabClass = (active: boolean) =>
        'rounded-md px-3 py-1 text-xs font-medium transition ' + (active ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground');

    return (
        <PlatformLayout
            title="Email Templates"
            description="Edit the platform's transactional emails. The design stays consistent — you edit the text, we wrap it in your branded, email-safe layout."
        >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
                <Card className="lg:col-span-1">
                    <CardHeader title="Templates" description={`${templates.length} available`} />
                    <CardBody className="space-y-1">
                        {templates.map((template) => (
                            <Link
                                key={template.key}
                                href={route('platform.email.templates', { template: template.key })}
                                className={
                                    'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition ' +
                                    (template.key === selected_key ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted/60')
                                }
                            >
                                <span className="truncate">{template.name}</span>
                                {!template.is_active && <Badge tone="neutral">off</Badge>}
                            </Link>
                        ))}
                    </CardBody>
                </Card>

                <Card className="lg:col-span-3">
                    <CardHeader
                        title={selected?.name ?? ''}
                        description={selected ? `Key: ${selected.key}${selected.updated_at ? ` · updated ${formatDateTime(selected.updated_at)}` : ''}` : undefined}
                        action={
                            <div className="flex gap-2">
                                <div className="inline-flex rounded-lg bg-muted p-0.5">
                                    <button type="button" onClick={() => setTab('preview')} className={tabClass(tab === 'preview')}>Preview</button>
                                    <button type="button" onClick={() => setTab('edit')} className={tabClass(tab === 'edit')}>Edit</button>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(true)}>Reset</Button>
                                <Button size="sm" loading={form.processing} onClick={save}>Save</Button>
                            </div>
                        }
                    />
                    <CardBody>
                        {tab === 'preview' ? (
                            <>
                                <div className="mb-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                                    <span className="text-muted-foreground">Subject:</span> <span className="font-medium text-foreground">{preview?.subject ?? '—'}</span>
                                </div>
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">Preview uses sample data and reflects the saved template.</p>
                                    <div className="inline-flex rounded-lg border border-border p-0.5">
                                        <button type="button" onClick={() => setPreviewWidth('full')} className={tabClass(previewWidth === 'full')}>Desktop</button>
                                        <button type="button" onClick={() => setPreviewWidth('mobile')} className={tabClass(previewWidth === 'mobile')}>Mobile</button>
                                    </div>
                                </div>
                                <div className="flex justify-center rounded-lg bg-muted/30 p-3">
                                    <iframe
                                        title="Email preview"
                                        className="h-[560px] rounded-lg border border-border bg-background transition-all"
                                        style={{ width: previewWidth === 'mobile' ? 375 : '100%', maxWidth: '100%' }}
                                        srcDoc={preview?.body ?? ''}
                                    />
                                </div>
                            </>
                        ) : (
                            <form onSubmit={save} className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <TextField label="Name" value={form.data.name} error={form.errors.name} onChange={(v) => form.setData('name', v)} />
                                    <TextField label="Subject" value={form.data.subject} error={form.errors.subject} onChange={(v) => form.setData('subject', v)} />
                                </div>

                                <div>
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">Email content</span>
                                        <button type="button" onClick={() => setShowSource((v) => !v)} className="text-xs font-medium text-primary hover:underline">
                                            {showSource ? 'Use rich editor' : 'Edit HTML source'}
                                        </button>
                                    </div>
                                    {showSource ? (
                                        <textarea
                                            rows={16}
                                            value={form.data.body}
                                            onChange={(e) => form.setData('body', e.target.value)}
                                            className="block w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        />
                                    ) : (
                                        <RichTextEditor value={form.data.body} variables={selected?.variables ?? []} onChange={(html) => form.setData('body', html)} />
                                    )}
                                    {form.errors.body && <span className="mt-1 block text-xs text-destructive">{form.errors.body}</span>}
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Formatting is saved as inline styles so it renders in every email client.
                                    </p>
                                </div>

                                <CheckboxField label="Active" checked={form.data.is_active} onChange={(v) => form.setData('is_active', v)} hint="Inactive templates are not used for delivery." />
                            </form>
                        )}
                    </CardBody>
                </Card>
            </div>

            <Card className="mt-5">
                <CardHeader title="Send a test" description="Sends the saved template with sample data" />
                <CardBody>
                    <form onSubmit={sendTest} className="flex flex-wrap items-end gap-3">
                        <TextField label="Recipient" type="email" className="w-72" value={test.data.email} error={test.errors.email} onChange={(v) => test.setData('email', v)} />
                        <Button type="submit" size="sm" variant="secondary" loading={test.processing}>Send test email</Button>
                    </form>
                </CardBody>
            </Card>

            <ConfirmDialog
                show={confirmReset}
                title={`Reset ${selected?.name ?? ''}?`}
                description="This restores the built-in designed default for this template."
                confirmLabel="Reset template"
                onConfirm={() => {
                    if (selected) router.delete(route('platform.email.templates.reset', selected.key), { preserveScroll: true, onFinish: () => setConfirmReset(false) });
                }}
                onClose={() => setConfirmReset(false)}
            />
        </PlatformLayout>
    );
}
