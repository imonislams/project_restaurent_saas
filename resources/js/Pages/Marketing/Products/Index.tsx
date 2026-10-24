import { MarketingHead, MarketingLayout, Reveal, trackConversion } from '@/Components/Marketing';
import { PRODUCT_GROUPS, PRODUCTS } from '@/Components/Marketing/Catalog/catalog';
import { CtaBand, DemoButton, GhostLink, ProductLink, SectionTitle, breadcrumbSchema } from '@/Components/Marketing/Catalog/pageParts';
import { useVisible } from '@/Components/Marketing/Journey/shared';
import { useEffect, useRef, useState } from 'react';

const PATH = ['qr-ordering', 'order-management', 'kitchen-display', 'billing-payments', 'reports'];

/** The path an order takes through the modules; the connector draws in once. */
function OrderPath() {
    const ref = useRef<HTMLOListElement>(null);
    const v = useVisible(ref);
    const [seen, setSeen] = useState(false);
    useEffect(() => {
        if (v) setSeen(true);
    }, [v]);
    return (
        <div className="rounded-3xl bg-[#201E1D] p-6 text-white sm:p-8">
            <div className="text-[14px] font-bold text-stone-300">One order, five modules</div>
            <ol ref={ref} className="relative mt-5 space-y-3">
                <span aria-hidden className="absolute bottom-6 left-[19px] top-6 w-0.5 bg-white/15" />
                <span aria-hidden className={`absolute bottom-6 left-[19px] top-6 w-0.5 origin-top bg-[#EC3013] transition-transform duration-[1600ms] ease-out motion-reduce:transition-none ${seen ? 'scale-y-100' : 'scale-y-0'}`} />
                {PATH.map((s, i) => {
                    const p = PRODUCTS.find((x) => x.slug === s)!;
                    const Icon = p.icon;
                    return (
                        <li key={s} className={`relative flex items-center gap-3 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${seen ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0'}`} style={{ transitionDelay: `${i * 260}ms` }}>
                            <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#EC3013]"><Icon className="h-5 w-5" /></span>
                            <span className="text-[16px] font-bold">{p.name}</span>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

export default function ProductsIndex({ canonical }: { canonical: string }) {
    const base = canonical.replace(/\/products$/, '');
    return (
        <MarketingLayout>
            <MarketingHead
                title="Products: Ordering, Kitchen, Billing & Reports"
                description="Explore every Touch Dine module: QR ordering, digital menu, table and order management, kitchen display, billing and payments, reports, branches, staff and inventory."
                canonical={canonical}
                schema={{ '@context': 'https://schema.org', ...breadcrumbSchema([{ name: 'Home', url: `${base}/` }, { name: 'Products', url: canonical }]) }}
            />
            <section className="relative w-full overflow-hidden bg-[#F3F2F2] px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16">
                <div aria-hidden className="mk-grid pointer-events-none absolute inset-0" />
                <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
                    <div className="animate-fade-up">
                        <span className="mk-eyebrow">Touch Dine products</span>
                        <h1 className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight text-stone-900 sm:text-5xl">Every module a restaurant runs on, connected.</h1>
                        <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-600">Ten modules, one record of every order. Start with the ones you need and add the rest when you are ready.</p>
                        <div className="mt-8 flex flex-col gap-3.5 sm:flex-row"><DemoButton where="products_hero" className="w-full sm:w-auto" /><GhostLink href="/solutions" where="products_hero_solutions">Explore Solutions</GhostLink></div>
                    </div>
                    <OrderPath />
                </div>
            </section>
            <Reveal as="section" className="w-full bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="mx-auto max-w-6xl space-y-14">
                    {PRODUCT_GROUPS.map((g) => (
                        <div key={g}>
                            <SectionTitle eyebrow="Products" title={g} />
                            <div className="mt-6 grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {PRODUCTS.filter((p) => p.group === g).map((p) => <ProductLink key={p.slug} product={p} />)}
                            </div>
                        </div>
                    ))}
                    <p className="text-[15px] text-stone-600">Looking for the register, cash management, expenses, purchasing or customers? See <a className="font-semibold text-[#EC3013] hover:underline" href="/features" onClick={() => trackConversion('nav_cta_clicked', { location: 'products_features_link' })}>all features</a>.</p>
                </div>
            </Reveal>
            <CtaBand />
        </MarketingLayout>
    );
}
