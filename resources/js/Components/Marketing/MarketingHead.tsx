import { Head } from '@inertiajs/react';

export interface MarketingHeadProps {
    title: string;
    description: string;
    canonical?: string;
    ogType?: 'website' | 'article' | 'product';
    ogImage?: string;
    schema?: Record<string, unknown> | Array<Record<string, unknown>>;
    noindex?: boolean;
}

export default function MarketingHead({
    title,
    description,
    canonical,
    ogType = 'website',
    ogImage = '/favicon.svg',
    schema,
    noindex = false,
}: MarketingHeadProps) {
    const fullTitle = `${title} | Restrly — Restaurant OS`;
    const canonicalUrl = canonical || (typeof window !== 'undefined' ? window.location.href : 'https://restrly.com');

    return (
        <Head>
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={canonicalUrl} />

            {/* Robots */}
            {noindex ? (
                <meta name="robots" content="noindex, nofollow" />
            ) : (
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
            )}

            {/* Open Graph */}
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:type" content={ogType} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:site_name" content="Restrly — Restaurant OS" />
            <meta property="og:image" content={ogImage} />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={ogImage} />

            {/* Structured JSON-LD Data for SEO & Answer Engines */}
            {schema && (
                <script type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            )}
        </Head>
    );
}
