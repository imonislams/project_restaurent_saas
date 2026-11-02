import { Head, usePage } from '@inertiajs/react';

export interface SeoProps {
    route?: string;
    title?: string;
    full_title?: string;
    description?: string;
    canonical?: string;
    robots?: string;
    brand?: string;
    og?: {
        title?: string;
        description?: string;
        type?: string;
        url?: string;
        image?: string;
        site_name?: string;
    };
    twitter?: { card?: string; title?: string; description?: string; image?: string };
    schema?: Array<Record<string, unknown>>;
}

export interface MarketingHeadProps {
    title: string;
    description: string;
    canonical?: string;
    ogType?: 'website' | 'article' | 'product';
    ogImage?: string;
    schema?: Record<string, unknown> | Array<Record<string, unknown>>;
    noindex?: boolean;
}

/**
 * Page metadata for the public site.
 *
 * The server already rendered these tags into the document head (see
 * ApplySeoMetadata and app.blade.php), so a crawler sees them without running
 * JavaScript. This component keeps them correct during client-side navigation,
 * using the same values — a page may still override any field it knows better.
 *
 * The title is emitted without the brand suffix on purpose: the Inertia title
 * callback appends it once. Appending it here as well is what produced titles like
 * "Pricing | Touch Dine - Touch Dine".
 */
export default function MarketingHead({
    title,
    description,
    canonical,
    ogType,
    ogImage,
    schema,
    noindex = false,
}: MarketingHeadProps) {
    const seo = (usePage().props as { seo?: SeoProps }).seo;

    const finalTitle = title || seo?.title || '';
    const finalDescription = description || seo?.description || '';
    const canonicalUrl = canonical || seo?.canonical || (typeof window !== 'undefined' ? window.location.href : '');
    const image = ogImage || seo?.og?.image || '/icon-512.png';
    const brand = seo?.brand ?? '';

    const schemas = [seo?.schema, schema]
        .flat()
        .filter((entry): entry is Record<string, unknown> => Boolean(entry));

    return (
        <Head>
            <title>{finalTitle}</title>
            <meta name="description" content={finalDescription} />
            <link rel="canonical" href={canonicalUrl} />

            {noindex ? (
                <meta name="robots" content="noindex, nofollow" />
            ) : (
                <meta name="robots" content={seo?.robots ?? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'} />
            )}

            <meta property="og:title" content={`${finalTitle}${brand ? ` - ${brand}` : ''}`} />
            <meta property="og:description" content={finalDescription} />
            <meta property="og:type" content={ogType ?? seo?.og?.type ?? 'website'} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:image" content={image} />
            <meta property="og:site_name" content={seo?.og?.site_name ?? brand} />

            <meta name="twitter:card" content={seo?.twitter?.card ?? 'summary_large_image'} />
            <meta name="twitter:title" content={`${finalTitle}${brand ? ` - ${brand}` : ''}`} />
            <meta name="twitter:description" content={finalDescription} />
            <meta name="twitter:image" content={image} />

            {schemas.map((entry, index) => (
                <script key={index} type="application/ld+json">
                    {JSON.stringify(entry)}
                </script>
            ))}
        </Head>
    );
}
