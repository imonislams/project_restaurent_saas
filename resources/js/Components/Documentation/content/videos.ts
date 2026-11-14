import type { VideoTutorial } from '../types';

const shot = (name: string) => `/documentation/screens/${name}.jpg`;
const clip = (name: string) => `/documentation/videos/${name}.mp4`;

/**
 * Recorded walkthroughs of the live application.
 *
 * Each MP4 is built from real captures of the demo restaurant (see
 * public/documentation/videos) and is served locally — no external hosting.
 * Durations are measured from the encoded files.
 */
export const VIDEOS: VideoTutorial[] = [
    {
        id: 'getting-started-tour',
        title: 'A first tour of the workspace',
        description:
            'The dashboard, the numbers that matter, the Orders ledger and the menu catalog — the four screens a new owner should know first.',
        module: 'Getting Started',
        category: 'Getting Started',
        src: clip('getting-started-tour'),
        poster: shot('dashboard'),
        duration: 10.5,
        chapters: [
            { label: 'Dashboard overview', at: 0 },
            { label: 'KPIs and charts', at: 3 },
            { label: 'Orders ledger', at: 5 },
            { label: 'Menu catalog', at: 8 },
        ],
        guideSlug: 'getting-started',
    },
    {
        id: 'pos-first-sale',
        title: 'Your first POS sale',
        description:
            'The terminal layout, adding a product to the cart, and the Payment & Checkout dialog with cash tender and change due.',
        module: 'POS & Checkout',
        category: 'POS & Checkout',
        src: clip('pos-first-sale'),
        poster: shot('pos'),
        duration: 8,
        chapters: [
            { label: 'Terminal overview', at: 0 },
            { label: 'Cart with an item', at: 3 },
            { label: 'Payment & Checkout', at: 5 },
        ],
        guideSlug: 'pos-checkout',
    },
    {
        id: 'orders-confirm-settle',
        title: 'Reading and settling an order',
        description:
            'The Orders ledger with real records, then the order detail page with its lifecycle badges, item lines and totals.',
        module: 'Orders',
        category: 'Orders',
        src: clip('orders-confirm-settle'),
        poster: shot('orders'),
        duration: 8,
        chapters: [
            { label: 'Order list', at: 0 },
            { label: 'Order detail', at: 3 },
            { label: 'Totals and lifecycle', at: 5 },
        ],
        guideSlug: 'orders',
    },
    {
        id: 'kitchen-line-setup',
        title: 'Setting up the kitchen line',
        description:
            'The live KDS board, the station filters that scope it, and the ticket columns the line works through.',
        module: 'Kitchen Display',
        category: 'Kitchen Display',
        src: clip('kitchen-line-setup'),
        poster: shot('kitchen'),
        duration: 8,
        chapters: [
            { label: 'Live board', at: 0 },
            { label: 'Station filter', at: 3 },
            { label: 'Ticket columns', at: 5 },
        ],
        guideSlug: 'kitchen-display',
    },
    {
        id: 'menu-catalog',
        title: 'Building a menu that sells correctly',
        description:
            'The product catalog, the category manager, and the product editor with per-channel prices and stock mode.',
        module: 'Products & Menu',
        category: 'Menu & Products',
        src: clip('menu-catalog'),
        poster: shot('menu'),
        duration: 8,
        chapters: [
            { label: 'Product catalog', at: 0 },
            { label: 'Category manager', at: 3 },
            { label: 'Product editor', at: 5 },
        ],
        guideSlug: 'menu-products',
    },
    {
        id: 'qr-table-setup',
        title: 'Turning on QR ordering',
        description:
            'Per-table QR cards with scan counts and status, then the QR analytics screen that reports scans and sessions.',
        module: 'QR Ordering',
        category: 'QR Ordering',
        src: clip('qr-table-setup'),
        poster: shot('qr-tables'),
        duration: 8,
        chapters: [
            { label: 'QR table cards', at: 0 },
            { label: 'More tables', at: 3 },
            { label: 'QR analytics', at: 5 },
        ],
        guideSlug: 'qr-ordering',
    },
    {
        id: 'roles-and-access',
        title: 'Roles, permissions and branch access',
        description:
            'The role list, selecting the Cashier role, and the grouped permission matrix with its slugs.',
        module: 'Staff & Permissions',
        category: 'Employee Management',
        src: clip('roles-and-access'),
        poster: shot('roles'),
        duration: 8,
        chapters: [
            { label: 'Role list', at: 0 },
            { label: 'Cashier permissions', at: 3 },
            { label: 'Permission groups', at: 5 },
        ],
        guideSlug: 'roles-permissions',
    },
    {
        id: 'reports-month-end',
        title: 'Month-end reporting',
        description:
            'The report families, switching from the sales summary to product performance, and the KPI breakdown below.',
        module: 'Reports',
        category: 'Reports',
        src: clip('reports-month-end'),
        poster: shot('reports'),
        duration: 8,
        chapters: [
            { label: 'Sales summary', at: 0 },
            { label: 'Product performance', at: 3 },
            { label: 'KPI breakdown', at: 5 },
        ],
        guideSlug: 'reports',
    },
];

export const VIDEO_CATEGORIES = Array.from(new Set(VIDEOS.map((video) => video.category)));

export const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
};
