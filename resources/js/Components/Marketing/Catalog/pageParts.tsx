import { Link } from '@inertiajs/react';
import { ArrowRight, Check } from 'lucide-react';
import { ReactNode, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { trackConversion } from '../Telemetry';
import { useVisible } from '../Journey/shared';
import type { SceneDef } from '../Scenes/blocks';
import { Faq, PRODUCTS, Product } from './catalog';

const SceneHostLazy = lazy(() => import('../Scenes/blocks').then((m) => ({ default: m.SceneHost })));
const productScenes = () => import('../Scenes/productScenes');

export const DEMO_HREF = '/contact?topic=demo';

/** Mounts children once the placeholder nears the viewport, keeping the layout height stable. */
export function LazyMount({ minHeight, children, margin = '400px 0px' }: { minHeight: number; children: ReactNode; margin?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const near = useVisible(ref, margin);
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        if (near) setMounted(true);
    }, [near]);
    return (
        <div ref={ref} style={{ minHeight }}>
            {mounted ? children : null}
        </div>
    );
}

/** A product's own scene, loaded on demand. */
export function ProductScene({ slug, variant, money, title }: { slug: string; variant: 'hero' | 'full'; money: (n: number) => string; title: string }) {
    const [scene, setScene] = useState<SceneDef | null>(null);
    useEffect(() => {
        let live = true;
        productScenes().then((m) => live && setScene(m.PRODUCT_SCENES[slug] ?? null));
        return () => {
            live = false;
        };
    }, [slug]);
    return <SceneBox scene={scene} variant={variant} money={money} title={title} label={`${title} animation`} />;
}

export function SceneBox({ scene, variant, money, title, label }: { scene: SceneDef | null; variant: 'hero' | 'full'; money: (n: number) => string; title: string; label: string }) {
    const h = variant === 'full' ? 'min-h-[560px]' : 'min-h-[520px]';
    const fallback = <div className={`${h} rounded-[28px] bg-[#EADFD0]`} aria-hidden />;
    if (!scene) return fallback;
    return (
        <Suspense fallback={fallback}>
            <SceneHostLazy scene={scene} variant={variant} money={money} title={title} label={label} />
        </Suspense>
    );
}

export function DemoButton({ where, children = 'Book a Demo', className = '' }: { where: string; children?: ReactNode; className?: string }) {
    return (
        <Link
            href={DEMO_HREF}
            onClick={() => trackConversion('hero_cta_clicked', { location: where })}
            className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#EC3013] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#D02710] active:bg-[#A81E0C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC3013] focus-visible:ring-offset-2 ${className}`}
        >
            {children}
            <ArrowRight className="h-4 w-4" />
        </Link>
    );
}

export function GhostLink({ href, where, children, dark = false }: { href: string; where: string; children: ReactNode; dark?: boolean }) {
    const cls = `inline-flex items-center justify-center rounded-lg border px-6 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC3013] ${dark ? 'border-white/30 text-white hover:bg-white/10' : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'}`;
    const track = () => trackConversion('hero_cta_clicked', { location: where });
    return href.startsWith('#') ? (
        <a href={href} onClick={track} className={cls}>{children}</a>
    ) : (
        <Link href={href} onClick={track} className={cls}>{children}</Link>
    );
}

export function Hero({ eyebrow, title, lede, secondary, scene }: { eyebrow: string; title: string; lede: string; secondary: { href: string; label: string }; scene: ReactNode }) {
    return (
        <section className="relative w-full overflow-hidden bg-[#F3F2F2] px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
            <div aria-hidden className="mk-grid pointer-events-none absolute inset-0" />
            <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
                <div className="animate-fade-up">
                    <span className="mk-eyebrow">{eyebrow}</span>
                    <h1 className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight text-stone-900 sm:text-5xl">{title}</h1>
                    <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-600">{lede}</p>
                    <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
                        <DemoButton where="hero_book_demo" className="w-full sm:w-auto" />
                        <GhostLink href={secondary.href} where="hero_secondary">{secondary.label}</GhostLink>
                    </div>
                </div>
                <div className="min-w-0">{scene}</div>
            </div>
        </section>
    );
}

export function SectionTitle({ eyebrow, title, lede, center = false }: { eyebrow: string; title: string; lede?: string; center?: boolean }) {
    return (
        <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
            <span className="mk-eyebrow">{eyebrow}</span>
            <h2 className="mk-h2 mt-2">{title}</h2>
            {lede && <p className="mt-3 text-base leading-relaxed text-stone-600 sm:text-lg">{lede}</p>}
        </div>
    );
}

export const Section = ({ id, tone = 'white', children }: { id?: string; tone?: 'white' | 'stone' | 'ink'; children: ReactNode }) => (
    <section id={id} className={`w-full scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-20 ${tone === 'stone' ? 'bg-[#F3F2F2]' : tone === 'ink' ? 'bg-[#201E1D] text-white' : 'bg-white'}`}>
        <div className="mx-auto max-w-6xl">{children}</div>
    </section>
);

/** Before and after, with concrete examples. */
export function BeforeAfter({ title, before, after }: { title: string; before: string[]; after: string[] }) {
    return (
        <>
            <SectionTitle eyebrow="The challenge" title={title} />
            <div className="mt-10 grid items-stretch gap-6 md:grid-cols-2">
                <div className="flex flex-col rounded-2xl border border-stone-200 bg-stone-50 p-6">
                    <div className="text-[14px] font-extrabold uppercase tracking-wide text-stone-500">Without it</div>
                    <ul className="mt-4 flex-1 space-y-3 text-[16px] text-stone-700">
                        {before.map((b) => <li key={b} className="flex gap-3"><span className="mt-2.5 h-px w-4 shrink-0 bg-stone-400" />{b}</li>)}
                    </ul>
                </div>
                <div className="flex flex-col rounded-2xl border-2 border-[#201E1D] bg-white p-6">
                    <div className="text-[14px] font-extrabold uppercase tracking-wide text-[#EC3013]">With Touch Dine</div>
                    <ul className="mt-4 flex-1 space-y-3 text-[16px] text-stone-900">
                        {after.map((a) => <li key={a} className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />{a}</li>)}
                    </ul>
                </div>
            </div>
        </>
    );
}

/** Numbered steps whose connector draws as the section scrolls into view. */
export function StepsRail({ steps }: { steps: { t: string; d: string }[] }) {
    const ref = useRef<HTMLOListElement>(null);
    const [seen, setSeen] = useState(false);
    const v = useVisible(ref, '0px 0px -15% 0px');
    useEffect(() => {
        if (v) setSeen(true);
    }, [v]);
    return (
        <ol ref={ref} className="relative mt-10 grid gap-8 md:grid-cols-4 md:gap-5">
            <div aria-hidden className="absolute left-[19px] top-5 hidden h-[calc(100%-40px)] w-0.5 bg-stone-200 max-md:block" />
            <div aria-hidden className="absolute left-[10%] right-[10%] top-5 hidden h-0.5 bg-stone-200 md:block" />
            <div aria-hidden className={`absolute left-[10%] right-[10%] top-5 hidden h-0.5 origin-left bg-[#EC3013] transition-transform duration-[1400ms] ease-out motion-reduce:transition-none md:block ${seen ? 'scale-x-100' : 'scale-x-0'}`} />
            {steps.map((s, i) => (
                <li key={s.t} className={`relative flex gap-4 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none md:flex-col md:items-center md:text-center ${seen ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`} style={{ transitionDelay: `${i * 220}ms` }}>
                    <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#201E1D] text-[16px] font-extrabold text-white">{i + 1}</span>
                    <div><h3 className="text-[17px] font-extrabold text-stone-900">{s.t}</h3><p className="mt-1 text-[15px] leading-relaxed text-stone-600">{s.d}</p></div>
                </li>
            ))}
        </ol>
    );
}

export function DefinitionList({ items }: { items: { t: string; d: string }[] }) {
    return (
        <dl className="mt-10 grid gap-x-12 md:grid-cols-2">
            {items.map((f) => (
                <div key={f.t} className="border-t border-stone-200 py-5">
                    <dt className="flex items-center gap-2 text-[17px] font-extrabold text-stone-900"><span className="h-2 w-2 bg-[#EC3013]" />{f.t}</dt>
                    <dd className="mt-1 pl-4 text-[15px] leading-relaxed text-stone-600">{f.d}</dd>
                </div>
            ))}
        </dl>
    );
}

export function ProductLink({ product, how, dark = false }: { product: Product; how?: string; dark?: boolean }) {
    const Icon = product.icon;
    return (
        <Link
            href={`/products/${product.slug}`}
            onClick={() => trackConversion('product_viewed', { product: product.slug, location: 'internal_link' })}
            className={`group flex h-full items-start gap-3 rounded-xl border p-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC3013] ${dark ? 'border-white/15 hover:bg-white/5' : 'border-stone-200 bg-white hover:border-[#EC3013]'}`}
        >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${dark ? 'bg-white/10' : 'bg-stone-100 group-hover:bg-[#EC3013]/10 group-hover:text-[#EC3013]'}`}><Icon className="h-5 w-5" /></span>
            <span className="min-w-0">
                <span className="block text-[16px] font-extrabold">{product.name}</span>
                <span className={`mt-0.5 block text-[14px] leading-snug ${dark ? 'text-stone-300' : 'text-stone-600'}`}>{how ?? product.short}</span>
            </span>
        </Link>
    );
}

export function Benefits({ items }: { items: { t: string; d: string }[] }) {
    return (
        <div className="mt-10 grid gap-8 md:grid-cols-4">
            {items.map((b, i) => (
                <div key={b.t}>
                    <div className="text-[40px] font-extrabold leading-none text-[#EC3013]">{String(i + 1).padStart(2, '0')}</div>
                    <h3 className="mt-3 text-[18px] font-extrabold">{b.t}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-stone-300">{b.d}</p>
                </div>
            ))}
        </div>
    );
}

export function CtaBand({ title = 'See Touch Dine in your restaurant', body = 'Book a short demo and we will walk through your own menu, tables and workflow.' }: { title?: string; body?: string }) {
    return (
        <section className="w-full bg-[#201E1D] px-4 py-16 text-white sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                <div className="max-w-xl"><h2 className="text-3xl font-extrabold tracking-tight">{title}</h2><p className="mt-2 text-stone-300">{body}</p></div>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <DemoButton where="cta_band_book_demo" />
                    <GhostLink href="/contact" where="cta_band_talk" dark>Talk to Our Team</GhostLink>
                </div>
            </div>
        </section>
    );
}

export function faqSchema(faqs: Faq[]) {
    return { '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
    return { '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })) };
}

export const productBySlugSafe = (slug: string) => PRODUCTS.find((p) => p.slug === slug);
