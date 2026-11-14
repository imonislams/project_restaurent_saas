import { Alert, Button, Card, CardBody, CardHeader, FormSection } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

export default function SeoRobots({
    enabled,
    is_custom,
    content,
    default: defaultContent,
    validation,
    url,
    sitemap_url,
}: {
    enabled: boolean;
    is_custom: boolean;
    content: string;
    default: string;
    validation: { errors: string[]; warnings: string[] };
    url: string;
    sitemap_url: string;
}) {
    const [text, setText] = useState(content);

    const form = useForm({ enabled, content });

    const save = (value: string) => {
        setText(value);
        form.setData('content', value);
    };

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        form.post(route('platform.marketing.seo.robots.update'), { preserveScroll: true });
    };

    return (
        <PlatformLayout
            title="robots.txt"
            description="Served at the site root. A generated default is used until you customise it."
        >
            <Head title="robots.txt" />

            <Alert
                variant={validation.errors.length > 0 ? 'danger' : validation.warnings.length > 0 ? 'warning' : 'success'}
                title={
                    validation.errors.length > 0
                        ? `${validation.errors.length} problem(s) would stop this file being saved`
                        : validation.warnings.length > 0
                          ? `${validation.warnings.length} thing(s) worth checking`
                          : 'Valid'
                }
            >
                <ul className="space-y-1">
                    {[...validation.errors, ...validation.warnings].map((line) => (
                        <li key={line}>{line}</li>
                    ))}
                    {validation.errors.length === 0 && validation.warnings.length === 0 && (
                        <li>Every line is a recognised directive.</li>
                    )}
                </ul>
            </Alert>

            <Alert variant="info" title="What this file does not do">
                It asks well-behaved crawlers to stay out of private areas. It is not access control — the platform,
                dashboard and payment routes are protected by authentication, and robots.txt never replaces that.
            </Alert>

            <form onSubmit={submit}>
                <FormSection title="Content" description={`Currently served at ${url}.`}>
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 text-sm">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-input"
                                checked={form.data.enabled}
                                onChange={(event) => form.setData('enabled', event.target.checked)}
                            />
                            <span className="font-medium text-foreground">
                                Serve robots.txt from this platform
                            </span>
                        </label>

                        <textarea
                            value={text}
                            onChange={(event) => save(event.target.value)}
                            spellCheck={false}
                            rows={20}
                            aria-label="robots.txt content"
                            className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />

                        <p className="text-xs text-muted-foreground">
                            {is_custom ? 'Custom file.' : 'Currently the generated default.'} Clearing the box restores the
                            default, which already disallows /platform, /dashboard, /pos, /qr/, /payments/, /webhooks/ and
                            the authentication pages, and points at {sitemap_url}.
                        </p>

                        <div className="flex flex-wrap gap-2">
                            <Button type="button" size="xs" variant="secondary" onClick={() => save(defaultContent)}>
                                Load the generated default
                            </Button>
                            <Button type="button" size="xs" variant="ghost" onClick={() => save('')}>
                                Clear (inherit default)
                            </Button>
                        </div>
                    </div>
                </FormSection>

                <div className="flex justify-end">
                    <Button type="submit" size="sm" loading={form.processing} disabled={validation.errors.length > 0}>
                        Save robots.txt
                    </Button>
                </div>
            </form>

            <Card>
                <CardHeader title="Preview" description="The file as it will be served." />
                <CardBody className="p-0">
                    <pre className="max-h-80 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {text}
                    </pre>
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
