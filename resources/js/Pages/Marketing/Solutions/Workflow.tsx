import { FaqSection, MarketingHead, MarketingLayout, Reveal, getCurrencySymbol, trackConversion } from '@/Components/Marketing';
import { PRODUCTS, solutionWorkflowBySlug } from '@/Components/Marketing/Catalog/catalog';
import { Benefits, CtaBand, Hero, LazyMount, ProductLink, Section, SceneBox, SectionTitle, breadcrumbSchema, faqSchema } from '@/Components/Marketing/Catalog/pageParts';
import { solutionScene } from '@/Components/Marketing/Scenes/Flow';
import { Link } from '@inertiajs/react';
import { ArrowRight, Check } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

/** Vertical timeline: each step lights up as it scrolls into the middle of the screen. */
function ScrollTimeline({ steps, modules }: { steps: { t: string; d: string }[]; modules: (string | undefined)[] }) {
    const [active, setActive] = useState(-1);
    const refs = useRef<(HTMLLIElement | null)[]>([]);
    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') {
            setActive(steps.length);
            return;
        }
        const io = new IntersectionObserver(
            (entries) => entries.forEach((e) => e.isIntersecting && setActive((a) => Math.max(a, Number((e.target as HTMLElement).dataset.i)))),
            { rootMargin: '-35% 0px -45% 0px' },
        );
        refs.current.forEach((el) => el && io.observe(el));
        return () => io.disconnect();
    }, [steps.length]);
    return (
        <ol className="relative mt-10 space-y-2">
            <span aria-hidden className="absolute bottom-4 left-[19px] top-4 w-0.5 bg-stone-200" />
            <span aria-hidden className="absolute left-[19px] top-4 w-0.5 origin-top bg-[#EC3013] transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ height: 'calc(100% - 32px)', transform: `scaleY(${active < 0 ? 0 : Math.min(1, active / Math.max(1, steps.length - 1))})` }} />
            {steps.map((s, i) => {
                const prod = PRODUCTS.find((p) => p.slug === modules[i]);
                const on = i <= active;
                return (
                    <li key={s.t} data-i={i} ref={(el) => (refs.current[i] = el)} className={`relative flex gap-4 py-3 transition-opacity duration-500 motion-reduce:transition-none ${on ? 'opacity-100' : 'opacity-50'}`}>
                        <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[16px] font-extrabold transition-colors duration-500 motion-reduce:transition-none ${i < active ? 'bg-emerald-600 text-white' : on ? 'bg-[#EC3013] text-white' : 'bg-stone-200 text-stone-700'}`}>{i < active ? <Check className="h-5 w-5" /> : i + 1}</span>
                        <div className="min-w-0">
                            <h3 className="text-[18px] font-extrabold text-stone-900">{s.t}</h3>
                            <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-stone-600">{s.d}</p>
                            {prod && <Link href={`/products/${prod.slug}`} className="mt-1.5 inline-flex items-center gap-1 text-[14px] font-bold text-[#EC3013] hover:underline">{prod.name}<ArrowRight className="h-3.5 w-3.5" /></Link>}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

export default function SolutionWorkflow({ slug, canonical, platformCurrency = 'USD' }: { slug: string; canonical: string; platformCurrency?: string }) {
    const s = solutionWorkflowBySlug(slug)!;
    const scene = useMemo(() => solutionScene(s), [s]);
    const money = (n: number) => `${getCurrencySymbol(platformCurrency)}${n.toFixed(2)}`;
    const base = canonical.replace(/\/solutions\/.*$/, '');
    const modulesForSteps = s.compare ? s.workflowSteps.map((_, i) => s.modules[i]?.slug) : s.workflowSteps.map((_, i) => s.flow[i]?.module ?? s.flow[Math.min(i, s.flow.length - 1)]?.module);

    useEffect(() => {
        trackConversion('solution_viewed', { solution: slug, location: 'solution_page' });
    }, [slug]);

    return (
        <MarketingLayout>
            <MarketingHead
                title={s.meta.title}
                description={s.meta.description}
                canonical={canonical}
                schema={{ '@context': 'https://schema.org', '@graph': [breadcrumbSchema([{ name: 'Home', url: `${base}/` }, { name: 'Solutions', url: `${base}/solutions` }, { name: s.name, url: canonical }]), faqSchema(s.faqs)] }}
            />
            <Hero
                eyebrow={s.eyebrow}
                title={s.headline}
                lede={s.lede}
                secondary={{ href: '#workflow', label: 'See How It Works' }}
                scene={<SceneBox scene={scene} variant="hero" money={money} title={s.name} label={`${s.name} workflow animation`} />}
            />

            <Reveal as="section" className="w-full bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1fr]">
                    <div>
                        <SectionTitle eyebrow="The restaurant challenge" title={s.challenge.title} />
                        <p className="mt-4 text-[17px] leading-relaxed text-stone-600">{s.challenge.body}</p>
                    </div>
                    <ul className="space-y-3 self-center">
                        {s.challenge.points.map((p) => <li key={p} className="flex gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-[16px] text-stone-800"><span className="mt-2.5 h-px w-4 shrink-0 bg-[#EC3013]" />{p}</li>)}
                    </ul>
                </div>
            </Reveal>

            <Reveal as="section" className="w-full bg-[#F3F2F2] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="mx-auto max-w-6xl">
                    <SectionTitle eyebrow="The Touch Dine solution" title="Modules that hand the order to each other" lede="Each module does one job, and the order moves between them without being re-entered." center />
                    <ol className="mt-10 grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {s.modules.map((m, i) => {
                            const p = PRODUCTS.find((x) => x.slug === m.slug)!;
                            return (
                                <li key={m.slug} className="relative flex flex-col rounded-2xl bg-white p-5 ring-1 ring-stone-900/10">
                                    <span className="text-[13px] font-extrabold uppercase tracking-wide text-[#EC3013]">Step {i + 1}</span>
                                    <span className="mt-2 flex items-center gap-2 text-[17px] font-extrabold"><p.icon className="h-5 w-5" aria-hidden />{p.name}</span>
                                    <span className="mt-1 text-[15px] text-stone-600">{m.role}</span>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </Reveal>

            <Reveal as="section" className="w-full scroll-mt-20 bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div id="workflow" className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[1fr_1.1fr]">
                    <div className="lg:sticky lg:top-24">
                        <SectionTitle eyebrow="Animated workflow" title="Start to finish" lede="Scroll to follow the order through each step. Every step names the module that handles it." />
                        <div className="mt-6 hidden lg:block">
                            <LazyMount minHeight={520}>
                                <SceneBox scene={scene} variant="full" money={money} title={s.name} label={`${s.name} full workflow`} />
                            </LazyMount>
                        </div>
                    </div>
                    <ScrollTimeline steps={s.workflowSteps} modules={modulesForSteps} />
                </div>
            </Reveal>

            <Reveal as="section" className="w-full bg-[#F3F2F2] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="mx-auto max-w-6xl">
                    <SectionTitle eyebrow="Relevant features" title="The products behind this solution" />
                    <div className="mt-8 grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {s.modules.map((m) => <ProductLink key={m.slug} product={PRODUCTS.find((p) => p.slug === m.slug)!} how={m.role} />)}
                    </div>
                </div>
            </Reveal>

            <Section tone="ink">
                <SectionTitle eyebrow="Business benefits" title="What it means for the business" />
                <Benefits items={s.benefits} />
                <p className="mt-8 text-[14px] text-stone-400">Results depend on how your restaurant operates. We do not promise specific figures.</p>
            </Section>

            <FaqSection items={s.faqs} title={`${s.name}: common questions`} subtitle="Answers specific to this workflow." />
            <CtaBand title={`Talk through ${s.name.toLowerCase()} with our team`} />
        </MarketingLayout>
    );
}
