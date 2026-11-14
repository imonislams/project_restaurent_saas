import { Alert, Button, Card, CardBody, CardHeader, CheckboxField, FormSection } from '@/Components/ui';
import { formatDateTime } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Entry {
    path: string;
    url: string;
    priority: string;
    changefreq: string;
    lastmod: string | null;
    excluded: boolean;
}

export default function SeoSitemap({
    enabled,
    last_generated_at,
    url,
    entries,
    excluded_paths,
    preview,
}: {
    enabled: boolean;
    last_generated_at: string | null;
    url: string;
    entries: Entry[];
    excluded_paths: string[];
    preview: string;
}) {
    const [excluded, setExcluded] = useState<string[]>(excluded_paths);

    const form = useForm({ enabled, excluded: excluded_paths });

    const toggle = (path: string) => {
        const next = excluded.includes(path) ? excluded.filter((entry) => entry !== path) : [...excluded, path];
        setExcluded(next);
        form.setData('excluded', next);
    };

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        form.post(route('platform.marketing.seo.sitemap.update'), { preserveScroll: true });
    };

    return (
        <PlatformLayout
            title="Sitemap"
            description="Generated from the routes this site actually serves, with private areas excluded by construction."
        >
            <Head title="Sitemap" />

            <Alert variant={enabled ? 'success' : 'warning'} title={enabled ? 'Generation is on' : 'Generation is off'}>
                {enabled ? (
                    <p>
                        Serving <code className="font-mono text-xs">{url}</code> with {entries.length} URLs.
                        {last_generated_at ? ` Last regenerated ${formatDateTime(last_generated_at)}.` : ' Never regenerated since it was configured.'}
                    </p>
                ) : (
                    <p>
                        The static <code className="font-mono text-xs">public/sitemap.xml</code> is being served instead.
                        That file is not aware of this site's routes, so it can list pages that no longer exist.
                    </p>
                )}
            </Alert>

            <form onSubmit={submit}>
                <FormSection title="Included pages" description="Untick a page to leave it out. New pages are included automatically.">
                    <div className="space-y-2">
                        <CheckboxField
                            label="Generate the sitemap"
                            checked={form.data.enabled}
                            onChange={(value) => form.setData('enabled', value)}
                        />

                        <div className="max-h-80 overflow-y-auto rounded-md border border-border">
                            <ul className="divide-y divide-border">
                                {entries.map((entry) => (
                                    <li key={entry.path} className="flex items-center gap-3 px-3 py-2">
                                        <input
                                            id={`sitemap-${entry.path}`}
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-input"
                                            checked={!excluded.includes(entry.path)}
                                            onChange={() => toggle(entry.path)}
                                        />
                                        <label htmlFor={`sitemap-${entry.path}`} className="min-w-0 flex-1">
                                            <span className="block truncate font-mono text-[11px] text-foreground">{entry.path}</span>
                                            <span className="text-[11px] text-muted-foreground">
                                                priority {entry.priority} · {entry.changefreq}
                                                {entry.lastmod ? ` · lastmod ${entry.lastmod}` : ''}
                                            </span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            {excluded.length} page(s) excluded. Private areas (/platform, /dashboard, /pos, /qr,
                            /payments, /webhooks) are never candidates in the first place.
                        </p>
                    </div>
                </FormSection>

                <div className="flex justify-end">
                    <Button type="submit" size="sm" loading={form.processing}>
                        Save and regenerate
                    </Button>
                </div>
            </form>

            <Card>
                <CardHeader
                    title="Generated XML"
                    description="Exactly what a crawler receives — not a mock of it."
                    action={
                        <Button
                            size="xs"
                            variant="secondary"
                            type="button"
                            onClick={() => form.post(route('platform.marketing.seo.sitemap.regenerate'), { preserveScroll: true })}
                        >
                            Regenerate now
                        </Button>
                    }
                />
                <CardBody className="p-0">
                    <pre className="max-h-96 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {preview}
                    </pre>
                </CardBody>
            </Card>

            <p className="text-xs text-muted-foreground">
                Submitting the sitemap to Google happens in{' '}
                <Link href={route('platform.marketing.seo.performance')} className="font-semibold text-primary hover:underline">
                    Search Console
                </Link>
                ; this platform generates the file and keeps it accurate.
            </p>
        </PlatformLayout>
    );
}
