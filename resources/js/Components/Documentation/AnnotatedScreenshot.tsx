import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { cn } from '@/Components/ui/cn';
import Badge from '@/Components/ui/Badge';
import type { AnnotatedScreenshotData, ImageAnnotation } from './types';

const MARKER = 26;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function AnnotatedStage({
    data,
    active,
    onSelect,
    zoomed,
}: {
    data: AnnotatedScreenshotData;
    active: number | null;
    onSelect: (n: number) => void;
    zoomed: boolean;
}) {
    const stageRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const markerId = `shot-arrow-${data.src.replace(/[^a-z0-9]/gi, '')}`;

    useLayoutEffect(() => {
        const element = stageRef.current;
        if (!element) {
            return;
        }
        const update = () => setSize({ width: element.clientWidth, height: element.clientHeight });
        update();
        const observer = new ResizeObserver(update);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const toPx = (x: number, y: number) => ({
        x: (x / 100) * size.width,
        y: (y / 100) * size.height,
    });

    const markerFor = (annotation: ImageAnnotation) =>
        toPx(
            clamp(annotation.target.x + annotation.target.w / 2, 1.2, 98.8),
            clamp(annotation.target.y - 2.6, 1, 98)
        );

    return (
        <div
            className={cn(
                'relative w-full overflow-hidden rounded-md border border-border bg-white',
                zoomed ? 'min-w-[1280px]' : 'min-w-[720px]'
            )}
        >
            <div ref={stageRef} className="relative">
                <img
                    src={data.src}
                    alt={data.alt}
                    width={data.width}
                    height={data.height}
                    className="block h-auto w-full select-none"
                    draggable={false}
                />

                <div className="pointer-events-none absolute inset-0 z-20">
                    <svg className="absolute inset-0 h-full w-full text-primary">
                        <defs>
                            <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                                <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
                            </marker>
                        </defs>
                        {data.annotations.map((annotation) => {
                            const target = toPx(annotation.target.x, annotation.target.y);
                            const targetW = (annotation.target.w / 100) * size.width;
                            const targetH = (annotation.target.h / 100) * size.height;
                            const marker = markerFor(annotation);
                            const endX = clamp(marker.x, target.x, target.x + targetW);
                            const endY = clamp(marker.y, target.y, target.y + targetH);
                            const dx = endX - marker.x;
                            const dy = endY - marker.y;
                            const distance = Math.hypot(dx, dy);
                            const isActive = active === annotation.n;

                            if (distance < MARKER) {
                                return null;
                            }

                            const trim = MARKER / 2 + 2;

                            return (
                                <line
                                    key={annotation.n}
                                    x1={marker.x + (dx / distance) * trim}
                                    y1={marker.y + (dy / distance) * trim}
                                    x2={endX}
                                    y2={endY}
                                    stroke="currentColor"
                                    strokeWidth={isActive ? 2 : 1.4}
                                    strokeDasharray={isActive ? undefined : '5 3'}
                                    opacity={active === null ? 0.65 : isActive ? 1 : 0.25}
                                    markerEnd={`url(#${markerId})`}
                                />
                            );
                        })}
                    </svg>

                    {data.annotations.map((annotation) => {
                        const isActive = active === annotation.n;
                        const marker = markerFor(annotation);
                        const rect = toPx(annotation.target.x, annotation.target.y);

                        return (
                            <div key={annotation.n}>
                                <div
                                    className={cn(
                                        'absolute rounded-[3px] border-2 transition-colors',
                                        isActive
                                            ? 'border-primary bg-primary/10 shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]'
                                            : 'border-primary/45 bg-primary/[0.05]',
                                        active !== null && !isActive && 'opacity-40'
                                    )}
                                    style={{
                                        left: rect.x - 2,
                                        top: rect.y - 2,
                                        width: (annotation.target.w / 100) * size.width + 4,
                                        height: (annotation.target.h / 100) * size.height + 4,
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => onSelect(annotation.n)}
                                    aria-label={`Annotation ${annotation.n}: ${annotation.title}`}
                                    aria-pressed={isActive}
                                    className={cn(
                                        'pointer-events-auto absolute z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-md transition-all',
                                        isActive
                                            ? 'scale-110 bg-primary ring-2 ring-primary/30'
                                            : 'bg-slate-900 hover:scale-105 hover:bg-primary',
                                        active !== null && !isActive && 'opacity-55'
                                    )}
                                    style={{ left: marker.x, top: marker.y, width: MARKER, height: MARKER }}
                                >
                                    {annotation.n}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function AnnotatedScreenshot({ data }: { data: AnnotatedScreenshotData }) {
    const [active, setActive] = useState<number | null>(data.annotations[0]?.n ?? null);
    const [zoomed, setZoomed] = useState(false);

    useEffect(() => {
        setActive(data.annotations[0]?.n ?? null);
    }, [data.src, data.annotations]);

    useEffect(() => {
        if (!zoomed) {
            return;
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setZoomed(false);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [zoomed]);

    const ordered = useMemo(
        () => [...data.annotations].sort((a, b) => a.n - b.n),
        [data.annotations]
    );

    const activeIndex = ordered.findIndex((annotation) => annotation.n === active);
    const current = ordered.find((annotation) => annotation.n === active);

    const step = (delta: number) => {
        if (ordered.length === 0) {
            return;
        }
        const nextIndex = activeIndex === -1 ? 0 : (activeIndex + delta + ordered.length) % ordered.length;
        setActive(ordered[nextIndex].n);
    };

    return (
        <figure className="not-prose my-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{data.title}</span>
                        <Badge tone="success" dot={false}>
                            Actual screenshot
                        </Badge>
                    </div>
                    <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{data.caption}</p>
                </div>
                <button
                    type="button"
                    onClick={() => setZoomed(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-accent"
                >
                    <Maximize2 className="h-3.5 w-3.5" />
                    Open full size
                </button>
            </div>

            <div className="overflow-x-auto bg-muted/20 p-2 sm:p-3">
                <AnnotatedStage data={data} active={active} onSelect={setActive} zoomed={false} />
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                    {ordered.length} annotated controls
                    <span className="sm:hidden"> · swipe to inspect</span>
                    <span className="hidden sm:inline"> · open full size for detail</span>
                </p>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => step(-1)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2 text-[11px] font-medium shadow-xs hover:bg-accent"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" /> Previous
                    </button>
                    <button
                        type="button"
                        onClick={() => step(1)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2 text-[11px] font-medium shadow-xs hover:bg-accent"
                    >
                        Next <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {current && (
                <div className="border-t border-border/60 bg-background px-4 py-3">
                    <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {current.n}
                        </span>
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-semibold text-foreground">{current.title}</h4>
                                {current.permission && (
                                    <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                        {current.permission}
                                    </code>
                                )}
                            </div>
                            <dl className="grid gap-2 text-xs sm:grid-cols-3">
                                <div>
                                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        What it does
                                    </dt>
                                    <dd className="mt-0.5 text-foreground/90">{current.action}</dd>
                                </div>
                                <div>
                                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Where it goes
                                    </dt>
                                    <dd className="mt-0.5 text-foreground/90">{current.destination}</dd>
                                </div>
                                <div>
                                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Expected result
                                    </dt>
                                    <dd className="mt-0.5 text-foreground/90">{current.result}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>
            )}

            <figcaption className="sr-only">{data.caption}</figcaption>

            <ol className="divide-y divide-border/60 border-t border-border/60">
                {ordered.map((annotation) => {
                    const isActive = annotation.n === active;
                    return (
                        <li key={annotation.n}>
                            <button
                                type="button"
                                onClick={() => setActive(annotation.n)}
                                aria-pressed={isActive}
                                className={cn(
                                    'flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors',
                                    isActive ? 'bg-primary/[0.04]' : 'hover:bg-muted/50'
                                )}
                            >
                                <span
                                    className={cn(
                                        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                                        isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground'
                                    )}
                                >
                                    {annotation.n}
                                </span>
                                <span className="min-w-0">
                                    <span
                                        className={cn(
                                            'block text-xs font-semibold',
                                            isActive ? 'text-primary' : 'text-foreground'
                                        )}
                                    >
                                        {annotation.title}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                                        {annotation.action}{' '}
                                        <span className="text-foreground/70">→ {annotation.destination}</span>
                                    </span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ol>

            {zoomed && (
                <div
                    className="fixed inset-0 z-[60] flex items-start justify-center overflow-auto bg-black/75 p-3 sm:p-6"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${data.title} full size`}
                    onClick={() => setZoomed(false)}
                >
                    <div
                        className="relative w-full max-w-[1600px] rounded-lg bg-card p-2 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-2 flex items-center justify-between gap-3 px-1">
                            <p className="text-xs font-semibold text-foreground">
                                {data.title}
                                <span className="ml-2 font-normal text-muted-foreground">
                                    {ordered.length} annotations · click a marker
                                </span>
                            </p>
                            <button
                                type="button"
                                onClick={() => setZoomed(false)}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2 text-[11px] font-medium hover:bg-accent"
                            >
                                <X className="h-3.5 w-3.5" /> Close
                            </button>
                        </div>
                        <div className="max-h-[86vh] overflow-auto">
                            <AnnotatedStage data={data} active={active} onSelect={setActive} zoomed />
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 px-1">
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => step(-1)}
                                    className="inline-flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2 text-[11px] font-medium hover:bg-accent"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => step(1)}
                                    className="inline-flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2 text-[11px] font-medium hover:bg-accent"
                                >
                                    Next <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            {current && (
                                <p className="truncate text-[11px] text-muted-foreground">
                                    <span className="font-semibold text-foreground">{current.n}. {current.title}</span>
                                    {' — '}
                                    {current.action}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </figure>
    );
}

export function ScreenshotFigure({
    src,
    alt,
    caption,
}: {
    src: string;
    alt: string;
    caption: string;
}) {
    return (
        <figure className="not-prose my-5 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <a href={src} target="_blank" rel="noopener noreferrer" className="group block">
                <img src={src} alt={alt} loading="lazy" className="block h-auto w-full" />
            </a>
            <figcaption className="flex flex-wrap items-center gap-2 border-t border-border/60 px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Actual screenshot
                </span>
                <span className="min-w-0 flex-1">{caption}</span>
                <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                    Open full size
                </a>
            </figcaption>
        </figure>
    );
}
