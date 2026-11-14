import { ArrowDown, ArrowRight, Circle, Flag, GitBranch, Play } from 'lucide-react';
import { cn } from '@/Components/ui/cn';
import Badge from '@/Components/ui/Badge';
import type { Journey, JourneyNode } from './types';

const NODE_STYLE: Record<JourneyNode['kind'], { ring: string; dot: string; label: string }> = {
    start: { ring: 'border-primary/40 bg-primary/[0.04]', dot: 'bg-primary text-primary-foreground', label: 'Start' },
    step: { ring: 'border-border bg-card', dot: 'bg-background text-muted-foreground border border-border', label: 'Step' },
    decision: { ring: 'border-amber-300/70 bg-amber-50/60 dark:bg-amber-950/20', dot: 'bg-amber-500 text-white', label: 'Decision' },
    end: { ring: 'border-emerald-300/70 bg-emerald-50/60 dark:bg-emerald-950/20', dot: 'bg-emerald-600 text-white', label: 'End' },
};

const NODE_ICON: Record<JourneyNode['kind'], typeof Play> = {
    start: Play,
    step: Circle,
    decision: GitBranch,
    end: Flag,
};

function Branch({ label, steps }: { label: string; steps: JourneyNode[] }) {
    return (
        <div className="rounded-lg border border-border/80 bg-background/80 p-3">
            <div className="mb-2 flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    {label}
                </span>
            </div>
            <ul className="space-y-2">
                {steps.map((step) => (
                    <li key={step.id} className="rounded-md border border-border/70 bg-card px-2.5 py-2">
                        <p className="text-xs font-semibold text-foreground">{step.title}</p>
                        {step.detail && (
                            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{step.detail}</p>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function FlowNode({ node, index }: { node: JourneyNode; index: number }) {
    const style = NODE_STYLE[node.kind];
    const Icon = NODE_ICON[node.kind];

    return (
        <li className="relative pl-9 sm:pl-11">
            <span className="absolute left-[13px] top-7 bottom-0 w-px bg-border sm:left-[17px]" aria-hidden="true" />
            <span
                className={cn(
                    'absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold shadow-sm sm:h-9 sm:w-9 sm:text-xs',
                    style.dot
                )}
                aria-hidden="true"
            >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>

            <div className={cn('mb-4 rounded-lg border px-3.5 py-3 shadow-sm', style.ring)}>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {String(index + 1).padStart(2, '0')}
                    </span>
                    <Badge
                        tone={
                            node.kind === 'decision'
                                ? 'warning'
                                : node.kind === 'end'
                                  ? 'success'
                                  : node.kind === 'start'
                                    ? 'brand'
                                    : 'neutral'
                        }
                        dot={false}
                    >
                        {style.label}
                    </Badge>
                </div>
                <h4 className="mt-1.5 text-sm font-semibold text-foreground">{node.title}</h4>
                {node.detail && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{node.detail}</p>
                )}
                {node.note && (
                    <p className="mt-1.5 rounded bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
                        {node.note}
                    </p>
                )}

                {node.branches && node.branches.length > 0 && (
                    <div className="mt-3">
                        <div className="mb-2 flex justify-center text-muted-foreground" aria-hidden="true">
                            <ArrowDown className="h-3.5 w-3.5" />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {node.branches.map((branch) => (
                                <Branch key={branch.label} label={branch.label} steps={branch.steps} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </li>
    );
}

export default function JourneyFlow({ journey }: { journey: Journey }) {
    return (
        <article id={journey.id} className="scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <header className="border-b border-border/60 px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold tracking-tight text-foreground">{journey.title}</h3>
                    <Badge tone="info" dot={false}>
                        {journey.steps.length} stages
                    </Badge>
                </div>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">{journey.summary}</p>
                <p className="mt-2 text-[11px] font-medium text-foreground/70">
                    Built for: <span className="font-normal text-muted-foreground">{journey.audience}</span>
                </p>
            </header>

            <ol className="space-y-0 px-3 py-4 sm:px-4">
                {journey.steps.map((node, index) => (
                    <FlowNode key={node.id} node={node} index={index} />
                ))}
            </ol>

            <footer className="border-t border-border/60 bg-muted/30 px-4 py-2.5 text-[11px] text-muted-foreground">
                Related guides:{' '}
                {journey.guideSlugs.map((slug, index) => (
                    <span key={slug}>
                        {index > 0 && ', '}
                        <a href={`/docs/${slug}`} className="font-medium text-primary hover:underline">
                            {slug.replace(/-/g, ' ')}
                        </a>
                    </span>
                ))}
            </footer>
        </article>
    );
}
