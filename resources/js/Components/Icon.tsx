import { SVGProps } from 'react';

export type IconName =
    | 'grid' | 'cart' | 'receipt' | 'fire' | 'table' | 'book' | 'cube' | 'truck'
    | 'trash' | 'transfer' | 'wallet' | 'chart' | 'users' | 'user' | 'cog'
    | 'crown' | 'bell' | 'search' | 'menu' | 'logout' | 'chevron' | 'store';

const common: SVGProps<SVGSVGElement> = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
};

const PATHS: Record<IconName, JSX.Element> = {
    grid: (
        <>
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </>
    ),
    cart: (
        <>
            <path d="M4 5h2l2 11h10l2-8H7" />
            <circle cx="9" cy="19.5" r="1.3" />
            <circle cx="17" cy="19.5" r="1.3" />
        </>
    ),
    receipt: (
        <>
            <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
            <path d="M9 8h6M9 12h6" />
        </>
    ),
    fire: <path d="M12 3c1 3-3 4-3 8a3 3 0 006 0c0-1-.4-2-1-2.6.6 3-1 3.6-2 3.6 0-2 2-3.4 0-9z" />,
    table: (
        <>
            <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
            <path d="M12 4.5v15M3.5 12h17" />
        </>
    ),
    book: (
        <>
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M8 9h8M8 13h8M8 17h5" />
        </>
    ),
    cube: (
        <>
            <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
            <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
        </>
    ),
    truck: (
        <>
            <rect x="2.5" y="6.5" width="11" height="8" rx="1.5" />
            <path d="M13.5 9.5h4l3 3v2h-7z" />
            <circle cx="7" cy="17" r="1.6" />
            <circle cx="17" cy="17" r="1.6" />
        </>
    ),
    trash: (
        <>
            <path d="M4.5 7h15M9 7V5h6v2M6.5 7l1 12h9l1-12" />
            <path d="M10 11v5M14 11v5" />
        </>
    ),
    transfer: (
        <>
            <path d="M4 9h13l-3-3M20 15H7l3 3" />
        </>
    ),
    wallet: (
        <>
            <rect x="3.5" y="6" width="17" height="12" rx="2" />
            <path d="M3.5 10h17M16 14h1.5" />
        </>
    ),
    chart: (
        <>
            <path d="M4 20V4" />
            <path d="M4 20h16" />
            <path d="M8 20v-6M12 20v-10M16 20v-4" />
        </>
    ),
    users: (
        <>
            <circle cx="9" cy="8.5" r="3" />
            <path d="M3.5 19a5.5 5.5 0 0111 0" />
            <path d="M16 6.5a3 3 0 010 5.4M17.5 19a5.5 5.5 0 00-2-4.2" />
        </>
    ),
    user: (
        <>
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20a7 7 0 0114 0" />
        </>
    ),
    cog: (
        <>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
        </>
    ),
    crown: <path d="M4 18h16l-1.2-8-3.3 2.6L12 7 8.5 12.6 5.2 10 4 18z" />,
    bell: <path d="M7 17h10l-1.4-1.4A2 2 0 0115 14.2V11a3 3 0 10-6 0v3.2c0 .5-.2 1-.6 1.4L7 17zm3 0a2 2 0 004 0" />,
    search: (
        <>
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-4.3-4.3" />
        </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    logout: (
        <>
            <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3" />
            <path d="M10 8l-4 4 4 4M6 12h9" />
        </>
    ),
    chevron: <path d="M9 6l6 6-6 6" />,
    store: (
        <>
            <path d="M4 9l1-4h14l1 4a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-4 0z" />
            <path d="M5 11v9h14v-9M9 20v-5h6v5" />
        </>
    ),
};

export default function Icon({
    name,
    className = 'h-5 w-5',
}: {
    name: IconName;
    className?: string;
}) {
    return (
        <svg {...common} className={className} aria-hidden="true">
            {PATHS[name]}
        </svg>
    );
}
