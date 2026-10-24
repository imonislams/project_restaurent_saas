import { FaqSection, MarketingHead, MarketingLayout, Reveal, getCurrencySymbol, trackConversion } from '@/Components/Marketing';
import { PRODUCTS, productBySlug } from '@/Components/Marketing/Catalog/catalog';
import { BeforeAfter, Benefits, CtaBand, DefinitionList, Hero, LazyMount, ProductLink, ProductScene, Section, SectionTitle, StepsRail, breadcrumbSchema, faqSchema } from '@/Components/Marketing/Catalog/pageParts';
import { Link } from '@inertiajs/react';
import { useEffect } from 'react';

export default function ProductShow({ slug, canonical, platformCurrency = 'USD' }: { slug: string; canonical: string; platformCurrency?: string }) {
    const p = productBySlug(slug)!;
    const symbol = getCurrencySymbol(platformCurrency);
    const money = (n: number) => `${symbol}${n.toFixed(2)}`;
    const base = canonical.replace(/\/products\/.*$/, '');

    useEffect(() => {
        trackConversion('product_viewed', { product: slug, location: 'product_page' });
    }, [slug]);

    return (
        <MarketingLayout>
            <MarketingHead
                title={p.meta.title}
                description={p.meta.description}
                canonical={canonical}
                schema={{
                    '@context': 'https://schema.org',
                    '@graph': [
                        breadcrumbSchema([
                            { name: 'Home', url: `${base}/` },
                            { name: 'Products', url: `${base}/products` },
                            { name: p.name, url: canonical },
                        ]),
                        faqSchema(p.faqs),
                    ],
                }}
            />

            <Hero
                eyebrow={p.eyebrow}
                title={p.headline}
                lede={p.lede}
                secondary={{ href: '#how-it-works', label: 'See How It Works' }}
                scene={<ProductScene slug={slug} variant="hero" money={money} title={p.name} />}
            />

            <Reveal as="section" className="w-full bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="mx-auto max-w-6xl"><BeforeAfter {...p.problem} /></div>
            </Reveal>

            <Reveal as="section" className="w-full scroll-mt-20 bg-[#F3F2F2] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div id="how-it-works" className="mx-auto max-w-6xl">
                    <SectionTitle eyebrow="How it works" title={`${p.name} in four steps`} center />
                    <StepsRail steps={p.steps} />
                </div>
            </Reveal>

            <Reveal as="section" className="w-full bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="mx-auto max-w-6xl">
                    <SectionTitle eyebrow="Key features" title="What you get" />
                    <DefinitionList items={p.features} />
                </div>
            </Reveal>

            <Reveal as="section" className="w-full bg-[#F3F2F2] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="mx-auto max-w-6xl">
                    <SectionTitle eyebrow="Inside the product" title={p.showcase.title} lede={p.showcase.note} />
                    <div className="mt-8">
                        <LazyMount minHeight={600}>
                            <ProductScene slug={slug} variant="full" money={money} title={p.showcase.path} />
                        </LazyMount>
                    </div>
                </div>
            </Reveal>

            <Reveal as="section" className="w-full bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[1fr_1.4fr]">
                    <SectionTitle eyebrow="Workflow integration" title={`${p.name} works with the rest of Touch Dine`} lede="Each connection below is part of the product today, not a roadmap item." />
                    <div className="relative space-y-4 border-l-2 border-[#EC3013] pl-6">
                        {p.integrations.map((i) => {
                            const target = PRODUCTS.find((x) => x.slug === i.slug)!;
                            return <ProductLink key={i.slug} product={target} how={i.how} />;
                        })}
                    </div>
                </div>
            </Reveal>

            <Section tone="ink">
                <SectionTitle eyebrow="Benefits" title="What changes in daily service" />
                <Benefits items={p.benefits} />
            </Section>

            <FaqSection items={p.faqs} eyebrow="FAQ" title={`${p.name}: common questions`} subtitle="Specific answers about this module. For plans and billing, see the pricing page." />

            <section className="w-full px-4 pb-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl text-[15px] text-stone-600">Related: <Link href="/solutions" className="font-semibold text-[#EC3013] hover:underline">solutions by workflow</Link> · <Link href="/products" className="font-semibold text-[#EC3013] hover:underline">all products</Link> · <Link href="/pricing" className="font-semibold text-[#EC3013] hover:underline">pricing</Link></div></section>
            <CtaBand title={`Want to see ${p.name} with your menu?`} />
        </MarketingLayout>
    );
}
