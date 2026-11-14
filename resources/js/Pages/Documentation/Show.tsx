import { Head } from '@inertiajs/react';
import PageHeader from '@/Components/ui/PageHeader';
import Badge from '@/Components/ui/Badge';
import { cn } from '@/Components/ui/cn';
import DocsLayout, { DocMeta } from '@/Components/Documentation/DocsLayout';
import DocsShell from '@/Components/Documentation/DocsShell';
import AnnotatedScreenshot, { ScreenshotFigure } from '@/Components/Documentation/AnnotatedScreenshot';
import JourneyFlow from '@/Components/Documentation/JourneyFlow';
import ButtonReferenceTable, { ButtonReferenceInline } from '@/Components/Documentation/ButtonReferenceTable';
import VideoLibrary from '@/Components/Documentation/VideoLibrary';
import {
    ANNOTATED_SCREENS,
    JOURNEYS,
    ROLE_GUIDES,
    findDoc,
    docsHome,
} from '@/Components/Documentation/content';
import type { DocSection, DocGuide } from '@/Components/Documentation/types';

const CALLOUT_TONE: Record<string, string> = {
    info: 'border-sky-200 bg-sky-50/70 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100',
    warning: 'border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100',
    success: 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100',
};

function Section({ section }: { section: DocSection }) {
    return (
        <section id={section.id} className="scroll-mt-24 space-y-3">
            <h2 className="text-[17px] font-semibold tracking-tight text-foreground">{section.title}</h2>

            {section.body && (
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{section.body}</p>
            )}

            {section.bullets && section.bullets.length > 0 && (
                <ul className="max-w-3xl space-y-1.5">
                    {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                            <span>{bullet}</span>
                        </li>
                    ))}
                </ul>
            )}

            {section.steps && section.steps.length > 0 && (
                <ol className="space-y-2">
                    {section.steps.map((step, index) => (
                        <li
                            key={step.title}
                            className="flex gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-xs"
                        >
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                {index + 1}
                            </span>
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-foreground">{step.title}</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            {section.table && (
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[520px] border-collapse text-left">
                        <thead className="bg-muted/60">
                            <tr>
                                {section.table.columns.map((column) => (
                                    <th
                                        key={column}
                                        className="border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                                    >
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {section.table.rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="align-top">
                                    {row.map((cell, cellIndex) => (
                                        <td
                                            key={cellIndex}
                                            className={cn(
                                                'border-b border-border/60 px-3 py-2 text-[11.5px] leading-relaxed',
                                                cellIndex === 0
                                                    ? 'font-medium text-foreground'
                                                    : 'text-muted-foreground'
                                            )}
                                        >
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {section.callout && (
                <div
                    className={cn(
                        'max-w-3xl rounded-lg border px-3.5 py-3',
                        CALLOUT_TONE[section.callout.tone] ?? CALLOUT_TONE.info
                    )}
                >
                    <p className="text-xs font-semibold">{section.callout.title}</p>
                    {section.callout.body && (
                        <p className="mt-1 text-[11.5px] leading-relaxed opacity-90">{section.callout.body}</p>
                    )}
                </div>
            )}

            {section.screenshot && <ScreenshotFigure {...section.screenshot} />}

            {section.annotated && ANNOTATED_SCREENS[section.annotated] && (
                <AnnotatedScreenshot data={ANNOTATED_SCREENS[section.annotated]} />
            )}

            {section.buttonModule && <ButtonReferenceInline moduleFilter={section.buttonModule} />}
        </section>
    );
}

function RoleLibrary() {
    return (
        <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-3">
                <p className="text-xs font-semibold text-foreground">Ten tenant roles exist in this build</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                    A role is only a bundle of permission slugs, so a custom role behaves exactly like a built-in one.
                    Owners can change the grants per restaurant, which means the definitive list always lives in
                    Roles & Permissions — this page describes the intended access.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {ROLE_GUIDES.map((role) => (
                    <article
                        key={role.slug}
                        id={role.slug}
                        className="scroll-mt-24 rounded-xl border border-border bg-card p-4 shadow-sm"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-foreground">{role.name}</h3>
                            <Badge tone={role.slug.includes('owner') || role.slug.includes('admin') ? 'brand' : 'neutral'} dot={false}>
                                {role.landing}
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{role.summary}</p>

                        <div className="mt-3 flex flex-wrap gap-1">
                            {role.permissions.map((permission) => (
                                <code
                                    key={permission}
                                    className="rounded bg-muted px-1.5 py-0.5 text-[9.5px] font-medium text-muted-foreground"
                                >
                                    {permission}
                                </code>
                            ))}
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                    Can
                                </p>
                                <ul className="mt-1 space-y-0.5">
                                    {role.can.map((item) => (
                                        <li key={item} className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                    Cannot
                                </p>
                                <ul className="mt-1 space-y-0.5">
                                    {role.cannot.map((item) => (
                                        <li key={item} className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-400" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}

function GuideBody({ guide }: { guide: DocGuide }) {
    if (guide.kind === 'buttons') {
        return (
            <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-3">
                    <p className="text-xs font-semibold text-foreground">How to use this reference</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                        Filter by module or search a label. Every row records what the control does, where it sends
                        the user, the permission the server enforces and the result to expect. Rows without a
                        screenshot are marked so in the full build.
                    </p>
                </div>
                <ButtonReferenceTable />
            </div>
        );
    }

    if (guide.kind === 'journeys') {
        return (
            <div className="space-y-5">
                <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-3">
                    <p className="text-xs font-semibold text-foreground">Three end-to-end journeys</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                        Each flow shows the real route through the app, including the decision points that change the
                        next step. Branching boxes are the alternatives; the rest is the happy path.
                    </p>
                </div>
                {JOURNEYS.map((journey) => (
                    <JourneyFlow key={journey.id} journey={journey} />
                ))}
            </div>
        );
    }

    if (guide.kind === 'videos') {
        return <VideoLibrary />;
    }

    if (guide.kind === 'roles') {
        return <RoleLibrary />;
    }

    return (
        <div className="space-y-7">
            {guide.sections.map((section) => (
                <Section key={section.id} section={section} />
            ))}
        </div>
    );
}

export default function DocumentationShow({ page }: { page: string }) {
    const guide = findDoc(page);

    if (!guide) {
        return (
            <DocsShell>
                <div className="mx-auto max-w-3xl px-4 py-16 text-center">
                    <p className="text-sm text-muted-foreground">This documentation page does not exist.</p>
                    <a href={docsHome()} className="mt-2 inline-block text-sm font-medium text-primary">
                        Back to the documentation home
                    </a>
                </div>
            </DocsShell>
        );
    }

    return (
        <DocsShell>
            <Head title={`${guide.title} · Documentation`} />
            <DocsLayout
                currentSlug={guide.slug}
                wide={guide.sections.some((section) => section.annotated || section.screenshot)}
                toc={guide.sections.map((section) => ({ id: section.id, title: section.title }))}
                breadcrumb={[{ label: guide.title }]}
            >
                <div className="space-y-5">
                    <PageHeader title={guide.title} description={guide.summary} actions={<DocMeta guide={guide} />} />

                    <GuideBody guide={guide} />
                </div>
            </DocsLayout>
        </DocsShell>
    );
}
