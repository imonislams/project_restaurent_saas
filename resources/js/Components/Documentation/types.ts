import type { IconName } from '@/Components/Icon';

export type DocGroupId =
    | 'start'
    | 'operations'
    | 'catalog'
    | 'team'
    | 'stock'
    | 'money'
    | 'configure'
    | 'learn';

export interface DocGroup {
    id: DocGroupId;
    label: string;
    description: string;
}

/** `article` renders the guide; the others render a dedicated documentation page. */
export type DocKind = 'article' | 'journeys' | 'buttons' | 'videos' | 'roles';

export interface DocStep {
    title: string;
    detail: string;
}

export interface DocCallout {
    tone: 'info' | 'warning' | 'success';
    title: string;
    body?: string;
}

export interface DocTable {
    columns: string[];
    rows: string[][];
}

/** A real captured screenshot, optionally without annotations. */
export interface DocScreenshot {
    src: string;
    alt: string;
    caption: string;
}

export interface DocSection {
    id: string;
    title: string;
    body?: string;
    bullets?: string[];
    steps?: DocStep[];
    callout?: DocCallout;
    table?: DocTable;
    /** Slug of an annotated screenshot rendered inside this section. */
    annotated?: string;
    /** Plain captured screenshot rendered inside this section. */
    screenshot?: DocScreenshot;
    /** Renders the button-reference lookup filtered to this module. */
    buttonModule?: string;
}

export interface DocGuide {
    slug: string;
    title: string;
    group: DocGroupId;
    icon: IconName;
    summary: string;
    kind?: DocKind;
    permission?: string;
    routeName?: string;
    roles?: string[];
    sections: DocSection[];
    related?: string[];
    featured?: boolean;
    popular?: boolean;
    readMinutes?: number;
}

export interface ImageAnnotation {
    n: number;
    title: string;
    /** What the element does. */
    action: string;
    /** Where the user lands afterwards. */
    destination: string;
    /** What the user should see as the result. */
    result: string;
    permission?: string;
    /** Highlight rectangle as percentages of the screenshot. */
    target: { x: number; y: number; w: number; h: number };
}

export interface AnnotatedScreenshotData {
    src: string;
    alt: string;
    title: string;
    caption: string;
    /** Intrinsic size of the capture, used for the aspect ratio. */
    width: number;
    height: number;
    annotations: ImageAnnotation[];
}

export interface ButtonReference {
    id: string;
    label: string;
    module: string;
    purpose: string;
    action: string;
    destination: string;
    permission: string;
    result: string;
}

export interface VideoChapter {
    label: string;
    at: number;
}

export interface VideoTutorial {
    id: string;
    title: string;
    description: string;
    module: string;
    category: string;
    /** Recorded walkthrough, served from /public/documentation/videos. */
    src: string;
    /** Poster image shown before playback. */
    poster: string;
    /** Seconds, measured from the encoded file. */
    duration: number;
    chapters: VideoChapter[];
    guideSlug: string;
}

export type JourneyNodeKind = 'start' | 'step' | 'decision' | 'end';

export interface JourneyNode {
    id: string;
    title: string;
    detail?: string;
    kind: JourneyNodeKind;
    note?: string;
    branches?: { label: string; steps: JourneyNode[] }[];
}

export interface Journey {
    id: string;
    title: string;
    summary: string;
    audience: string;
    guideSlugs: string[];
    steps: JourneyNode[];
}

export interface RoleGuide {
    slug: string;
    name: string;
    summary: string;
    landing: string;
    permissions: string[];
    can: string[];
    cannot: string[];
}
