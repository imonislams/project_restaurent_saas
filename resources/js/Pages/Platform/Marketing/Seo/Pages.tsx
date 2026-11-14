import { Alert, Button, Card, CardBody, CardHeader, TextField, TextareaField } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface PageRow {
    route: string;
    path: string;
    title: string;
    description: string;
    canonical: string;
    robots: string;
    has_override: boolean;
}

/** A rough search-result preview, so length problems are visible rather than theoretical. */
function GooglePreview({ title, description, url }: { title: string; description: string; url: string }) {
    const displayTitle = title.length > 60 ? `${title.slice(0, 57)}…` : title;
    const displayDescription = description.length > 160 ? `${description.slice(0, 157)}…` : description;

    return (
        <div className="rounded-md border border-border bg-card p-4">
            <p className="truncate text-xs text-muted-foreground">{url}</p>
            <p className="mt-1 text-base font-medium leading-snug text-[#1a0dab]">{displayTitle || '(no title)'}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{displayDescription || '(no description)'}</p>
        </div>
    );
}

export default function SeoPages({
    pages,
    limits,
    host,
}: {
    pages: PageRow[];
    limits: { title: { min: number; max: number }; description: { min: number; max: number } };
    host: string;
}) {
    const [editing, setEditing] = useState<PageRow | null>(null);

    const form = useForm({
        title: '',
        description: '',
        canonical: '',
        og_title: '',
        og_description: '',
        og_image: '',
        robots: '',
    });

    const errors = form.errors as Record<string, string>;

    const open = (page: PageRow) => {
        setEditing(page);
        form.setData({
            title: page.title,
            description: page.description,
            canonical: page.canonical,
            og_title: '',
            og_description: '',
            og_image: '',
            robots: page.robots,
        });
        form.clearErrors();
    };

    const submit: FormEventHandler = (event) => {
        event.preventDefault();

        if (!editing) return;

        form.post(route('platform.marketing.seo.pages.update', { route: editing.route }), {
            preserveScroll: true,
            onSuccess: () => {
                setEditing(null);
                form.reset();
            },
        });
    };

    const titleState = (value: string) => {
        const length = value.length;

        if (length === 0) return { tone: 'text-muted-foreground', note: 'inherits the default' };
        if (length < limits.title.min) return { tone: 'text-amber-600', note: `${length} — a little short` };
        if (length > limits.title.max) return { tone: 'text-rose-600', note: `${length} — will be truncated` };

        return { tone: 'text-emerald-600', note: `${length}` };
    };

    return (
        <PlatformLayout
            title="Page meta tags"
            description="Per-page overrides. Anything left blank inherits the site defaults."
        >
            <Head title="Page meta tags" />

            <Alert variant="info" title="Overrides are stored, defaults are inherited">
                {pages.filter((page) => page.has_override).length} of {pages.length} pages currently override anything. The
                search preview below is an approximation of a result — it shows truncation, not Google's final rendering.
            </Alert>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader title="Pages" description="Pick one to edit its metadata." />
                    <CardBody className="max-h-[32rem] overflow-y-auto p-0">
                        <ul className="divide-y divide-border">
                            {pages.map((page) => (
                                <li key={page.route}>
                                    <button
                                        type="button"
                                        onClick={() => open(page)}
                                        className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                            editing?.route === page.route ? 'bg-accent/60' : ''
                                        }`}
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate font-mono text-[11px] text-muted-foreground">
                                                {page.path}
                                            </span>
                                            <span className="mt-0.5 block truncate text-sm font-medium text-foreground">
                                                {page.title || '(no title)'}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                                            {page.has_override ? 'override' : 'default'}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </CardBody>
                </Card>

                <div className="space-y-4">
                    {editing ? (
                        <form onSubmit={submit}>
                            <Card>
                                <CardHeader
                                    title={editing.route}
                                    description={`Saving writes an override for ${editing.path}.`}
                                    action={
                                        <Button size="xs" variant="ghost" type="button" onClick={() => setEditing(null)}>
                                            Close
                                        </Button>
                                    }
                                />
                                <CardBody className="space-y-4">
                                    <div>
                                        <TextField
                                            label="SEO title"
                                            value={form.data.title}
                                            onChange={(value) => form.setData('title', value)}
                                            error={errors.title}
                                        />
                                        <p className={`mt-1 text-xs ${titleState(form.data.title).tone}`}>
                                            {titleState(form.data.title).note}
                                        </p>
                                    </div>

                                    <div>
                                        <TextareaField
                                            label="Meta description"
                                            value={form.data.description}
                                            onChange={(value) => form.setData('description', value)}
                                            error={errors.description}
                                            rows={3}
                                        />
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {form.data.description.length} characters (aim for {limits.description.min}–
                                            {limits.description.max})
                                        </p>
                                    </div>

                                    <TextField
                                        label="Canonical URL"
                                        value={form.data.canonical}
                                        onChange={(value) => form.setData('canonical', value)}
                                        error={errors.canonical}
                                        hint="Absolute URL. Blank uses the page's own address."
                                    />

                                    <TextField
                                        label="Robots directive"
                                        value={form.data.robots}
                                        onChange={(value) => form.setData('robots', value)}
                                        error={errors.robots}
                                        hint="e.g. index, follow — or noindex, nofollow to keep a page out of search."
                                    />

                                    <div className="flex justify-end gap-2">
                                        <Button type="submit" size="sm" loading={form.processing}>
                                            Save metadata
                                        </Button>
                                    </div>
                                </CardBody>
                            </Card>

                            <Card className="mt-4">
                                <CardHeader title="Search preview" />
                                <CardBody>
                                    <GooglePreview
                                        title={form.data.title}
                                        description={form.data.description}
                                        url={form.data.canonical || `${host}${editing.path}`}
                                    />
                                </CardBody>
                            </Card>
                        </form>
                    ) : (
                        <Card>
                            <CardBody>
                                <p className="text-sm text-muted-foreground">
                                    Select a page to edit its title, description, canonical and robots directive.
                                </p>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>
        </PlatformLayout>
    );
}
