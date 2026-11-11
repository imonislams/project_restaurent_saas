export * from './nav';
export * from './guides';
export * from './journeys';
export * from './buttons';
export * from './videos';
export * from './roles';
export * from './screens';

import { DOC_GROUPS } from './nav';
import { GUIDES } from './guides';
import { JOURNEYS } from './journeys';
import { BUTTONS } from './buttons';
import { VIDEOS } from './videos';

import type { DocGroup, DocGuide } from '../types';

export interface DocNavSection {
    group: DocGroup;
    items: DocGuide[];
}

export const DOC_NAV: DocNavSection[] = DOC_GROUPS.map((group) => ({
    group,
    items: GUIDES.filter((guide) => guide.group === group.id),
})).filter((section) => section.items.length > 0);

export const FLAT_DOCS: DocGuide[] = DOC_NAV.flatMap((section) => section.items);

export const docHref = (slug: string): string => {
    if (typeof route !== 'undefined') {
        return route('docs.show', slug);
    }
    return `/docs/${slug}`;
};

export const docsHome = (): string => {
    if (typeof route !== 'undefined') {
        return route('docs.index');
    }
    return '/docs';
};

export const findDoc = (slug: string): DocGuide | undefined =>
    GUIDES.find((guide) => guide.slug === slug);

export const adjacentDocs = (slug: string): { prev?: DocGuide; next?: DocGuide } => {
    const index = FLAT_DOCS.findIndex((doc) => doc.slug === slug);
    if (index === -1) {
        return {};
    }
    return {
        prev: index > 0 ? FLAT_DOCS[index - 1] : undefined,
        next: index < FLAT_DOCS.length - 1 ? FLAT_DOCS[index + 1] : undefined,
    };
};

export interface SearchEntry {
    id: string;
    type: 'Guide' | 'Section' | 'Button' | 'Journey' | 'Video';
    title: string;
    subtitle: string;
    href: string;
    haystack: string;
}

const buildSearchIndex = (): SearchEntry[] => {
    const entries: SearchEntry[] = [];

    GUIDES.forEach((guide) => {
        entries.push({
            id: `guide-${guide.slug}`,
            type: 'Guide',
            title: guide.title,
            subtitle: guide.summary,
            href: docHref(guide.slug),
            haystack: [guide.title, guide.summary, guide.group, guide.sections.map((s) => s.title).join(' ')]
                .join(' ')
                .toLowerCase(),
        });

        guide.sections.forEach((section) => {
            entries.push({
                id: `section-${guide.slug}-${section.id}`,
                type: 'Section',
                title: section.title,
                subtitle: guide.title,
                href: `${docHref(guide.slug)}#${section.id}`,
                haystack: [section.title, section.body ?? '', (section.bullets ?? []).join(' '), guide.title]
                    .join(' ')
                    .toLowerCase(),
            });
        });
    });

    BUTTONS.forEach((button) => {
        entries.push({
            id: `button-${button.id}`,
            type: 'Button',
            title: button.label,
            subtitle: `${button.module} — ${button.purpose}`,
            href: `${docHref('button-reference')}#${button.id}`,
            haystack: [button.label, button.module, button.purpose, button.action, button.result]
                .join(' ')
                .toLowerCase(),
        });
    });

    JOURNEYS.forEach((journey) => {
        entries.push({
            id: `journey-${journey.id}`,
            type: 'Journey',
            title: journey.title,
            subtitle: journey.summary,
            href: `${docHref('journeys')}#${journey.id}`,
            haystack: [journey.title, journey.summary, journey.audience, journey.steps.map((s) => s.title).join(' ')]
                .join(' ')
                .toLowerCase(),
        });
    });

    VIDEOS.forEach((video) => {
        entries.push({
            id: `video-${video.id}`,
            type: 'Video',
            title: video.title,
            subtitle: `${video.module} — ${video.description}`,
            href: `${docHref('videos')}#${video.id}`,
            haystack: [video.title, video.description, video.module, video.category].join(' ').toLowerCase(),
        });
    });

    return entries;
};

export const SEARCH_INDEX: SearchEntry[] = buildSearchIndex();

export const searchDocs = (query: string, limit = 12): SearchEntry[] => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) {
        return [];
    }

    const terms = trimmed.split(/\s+/);

    return SEARCH_INDEX.map((entry) => {
        let score = 0;
        terms.forEach((term) => {
            if (entry.title.toLowerCase().includes(term)) {
                score += 6;
            }
            if (entry.subtitle.toLowerCase().includes(term)) {
                score += 2;
            }
            if (entry.haystack.includes(term)) {
                score += 1;
            }
        });
        return { entry, score };
    })
        .filter((result) => result.score > 0)
        .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
        .slice(0, limit)
        .map((result) => result.entry);
};

export const FEATURED_DOCS = GUIDES.filter((guide) => guide.featured);
export const POPULAR_DOCS = GUIDES.filter((guide) => guide.popular);
