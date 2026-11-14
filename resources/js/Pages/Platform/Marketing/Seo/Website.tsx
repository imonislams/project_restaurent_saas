import { Alert, Card, CardBody, CardHeader, FormSection, TextField, TextareaField, Button, Tabs } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Settings {
    default_title: string;
    default_description: string;
    canonical_host: string;
    default_og_image: string;
    google_verification: string;
    organization_name: string;
    organization_email: string;
}

export default function SeoWebsite({ settings, defaults }: { settings: Settings; defaults: Record<string, string> }) {
    const [tab, setTab] = useState('global');

    const form = useForm({
        default_title: settings.default_title,
        default_description: settings.default_description,
        canonical_host: settings.canonical_host,
        default_og_image: settings.default_og_image,
        google_verification: settings.google_verification,
        organization_name: settings.organization_name,
        organization_email: settings.organization_email,
    });

    const errors = form.errors as Record<string, string>;

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        form.post(route('platform.marketing.seo.website.update'), { preserveScroll: true });
    };

    return (
        <PlatformLayout
            title="Website SEO"
            description="The site-wide defaults every page inherits unless it overrides them."
        >
            <Head title="Website SEO" />

            <Alert variant="info" title="A blank field inherits the built-in default">
                Clearing a field does not leave the site without metadata — the resolution order is stored override, then
                these defaults, then the built-in fallback. Current fallbacks: title “{defaults.default_title || '(app name)'}”,
                host “{defaults.canonical_host}”.
            </Alert>

            <Tabs
                tabs={[
                    { key: 'global', label: 'Global defaults' },
                    { key: 'schema', label: 'Schema & brand' },
                    { key: 'social', label: 'Social' },
                    { key: 'verification', label: 'Verification' },
                ]}
                value={tab}
                onChange={setTab}
            />

            <form onSubmit={submit} className="space-y-6">
                {tab === 'global' && (
                    <FormSection title="Titles & descriptions" description="Used by pages that set neither of their own.">
                        <div className="space-y-4">
                            <TextField
                                label="Default title"
                                value={form.data.default_title}
                                onChange={(value) => form.setData('default_title', value)}
                                error={errors.default_title}
                                hint="Around 50–60 characters works best in a search result."
                            />
                            <TextareaField
                                label="Default description"
                                value={form.data.default_description}
                                onChange={(value) => form.setData('default_description', value)}
                                error={errors.default_description}
                                rows={3}
                                hint="Around 150–160 characters. This is the sentence a search engine shows under the title."
                            />
                            <TextField
                                label="Canonical host"
                                value={form.data.canonical_host}
                                onChange={(value) => form.setData('canonical_host', value)}
                                error={errors.canonical_host}
                                placeholder="https://example.com"
                                hint="The absolute origin used in canonical URLs, Open Graph tags and the sitemap. Leave blank to use APP_URL."
                            />
                        </div>
                    </FormSection>
                )}

                {tab === 'schema' && (
                    <FormSection
                        title="Organisation"
                        description="Emitted as Organization JSON-LD on the homepage, and used as the site name."
                    >
                        <div className="space-y-4">
                            <TextField
                                label="Organisation name"
                                value={form.data.organization_name}
                                onChange={(value) => form.setData('organization_name', value)}
                                error={errors.organization_name}
                                hint="Also the brand suffix on page titles."
                            />
                            <TextField
                                label="Support email"
                                type="email"
                                value={form.data.organization_email}
                                onChange={(value) => form.setData('organization_email', value)}
                                error={errors.organization_email}
                                hint="Included in the Organization schema when set. Not exposed anywhere else."
                            />
                        </div>
                    </FormSection>
                )}

                {tab === 'social' && (
                    <FormSection title="Open Graph" description="How a link to this site looks when shared.">
                        <div className="space-y-4">
                            <TextField
                                label="Default share image"
                                value={form.data.default_og_image}
                                onChange={(value) => form.setData('default_og_image', value)}
                                error={errors.default_og_image}
                                placeholder="/icon-512.png"
                                hint="Use an absolute URL or a path from the site root. PNG or JPEG of at least 200×200 — social scrapers do not render SVG."
                            />
                        </div>
                    </FormSection>
                )}

                {tab === 'verification' && (
                    <FormSection
                        title="Search engine verification"
                        description="Proves site ownership without uploading a file."
                    >
                        <div className="space-y-4">
                            <TextField
                                label="Google verification token"
                                value={form.data.google_verification}
                                onChange={(value) => form.setData('google_verification', value)}
                                error={errors.google_verification}
                                hint="Rendered as <meta name=“google-site-verification”>. Paste only the token itself, not the whole tag."
                            />
                        </div>
                    </FormSection>
                )}

                <Card>
                    <CardBody className="flex items-center justify-between gap-3 p-4">
                        <p className="text-xs text-muted-foreground">
                            Saving applies immediately — no cache to clear.
                        </p>
                        <Button type="submit" size="sm" loading={form.processing}>
                            Save settings
                        </Button>
                    </CardBody>
                </Card>
            </form>
        </PlatformLayout>
    );
}
