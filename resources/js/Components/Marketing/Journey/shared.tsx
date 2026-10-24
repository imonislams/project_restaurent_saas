import { RefObject, useEffect, useMemo, useState } from 'react';

/** Tracks the user's reduced-motion preference. */
export function useReducedMotion() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        if (!mq) return;
        setReduced(mq.matches);
        const onChange = () => setReduced(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return reduced;
}

/** Live visibility flag, so loops can pause while off screen. */
export function useVisible(ref: RefObject<Element>, rootMargin = '0px') {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === 'undefined') {
            setVisible(true);
            return;
        }
        const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin });
        io.observe(el);
        return () => io.disconnect();
    }, [ref, rootMargin]);
    return visible;
}

/** True while the tab is in the foreground. */
export function usePageActive() {
    const [active, setActive] = useState(true);
    useEffect(() => {
        const on = () => setActive(!document.hidden);
        document.addEventListener('visibilitychange', on);
        return () => document.removeEventListener('visibilitychange', on);
    }, []);
    return active;
}

/** Scale factor that fits a fixed-size stage into its container width. */
export function useFitScale(ref: RefObject<HTMLElement>, baseWidth: number) {
    const [scale, setScale] = useState<number | null>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const update = () => setScale(el.clientWidth / baseWidth);
        update();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref, baseWidth]);
    return scale;
}

/** Decorative demonstration QR code (not a real code). */
export function QrGlyph({ size = 100, className = '' }: { size?: number; className?: string }) {
    const cells = useMemo(() => {
        const n = 21;
        let seed = 7;
        const rnd = () => {
            seed = (seed * 16807) % 2147483647;
            return seed / 2147483647;
        };
        const finder = (x: number, y: number) =>
            [
                [0, 0],
                [n - 7, 0],
                [0, n - 7],
            ].some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
        const out: [number, number][] = [];
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!finder(x, y) && rnd() > 0.52) out.push([x, y]);
        return out;
    }, []);
    const finderAt = (x: number, y: number) => (
        <g key={`${x}-${y}`}>
            <rect x={x} y={y} width="7" height="7" fill="#201E1D" />
            <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
            <rect x={x + 2} y={y + 2} width="3" height="3" fill="#201E1D" />
        </g>
    );
    return (
        <svg viewBox="0 0 21 21" width={size} height={size} className={className} shapeRendering="crispEdges" aria-hidden>
            <rect width="21" height="21" fill="#fff" />
            {cells.map(([x, y]) => (
                <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#201E1D" />
            ))}
            {finderAt(0, 0)}
            {finderAt(14, 0)}
            {finderAt(0, 14)}
        </svg>
    );
}

/** Illustrated dishes (vector, so there are no image requests or layout shifts). */
export function PizzaDish({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 80 80" className={className} aria-hidden>
            <rect width="80" height="80" fill="#EFE6D8" />
            <circle cx="40" cy="40" r="34" fill="#fff" />
            <circle cx="40" cy="40" r="29" fill="#D9A05B" />
            <circle cx="40" cy="40" r="25" fill="#C8321E" />
            <path d="M20 36c6-8 14-6 18-12 6 6 16 4 22 12-2 10-8 20-20 20S22 46 20 36z" fill="#F4E4B5" />
            <circle cx="32" cy="38" r="4" fill="#fff" opacity=".7" />
            <circle cx="48" cy="46" r="5" fill="#fff" opacity=".7" />
            <circle cx="50" cy="32" r="3" fill="#fff" opacity=".7" />
            <path d="M30 48c4-5 8-3 8 0-3 3-8 4-8 0zM44 30c4-4 9-2 8 1-3 3-7 3-8-1z" fill="#2F7D4F" />
        </svg>
    );
}

export function PastaDish({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 80 80" className={className} aria-hidden>
            <rect width="80" height="80" fill="#EFE6D8" />
            <circle cx="40" cy="40" r="34" fill="#fff" />
            <circle cx="40" cy="40" r="26" fill="#F1F0EE" />
            <g fill="none" stroke="#E2B35A" strokeWidth="4" strokeLinecap="round">
                <path d="M22 40c4-14 32-14 36 0" />
                <path d="M24 46c6-10 26-10 32 0" />
                <path d="M28 36c6-8 18-8 24 0" />
                <path d="M26 52c8-6 20-6 28 0" />
            </g>
            <circle cx="36" cy="38" r="3.4" fill="#C8321E" />
            <circle cx="46" cy="44" r="3.4" fill="#C8321E" />
            <circle cx="41" cy="33" r="3" fill="#C8321E" />
            <path d="M38 41c3-4 6-2 5 1-2 2-5 2-5-1z" fill="#2F7D4F" />
        </svg>
    );
}

export const ORDER_NO = '#A-1042';

export function DessertDish({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 80 80" className={className} aria-hidden>
            <rect width="80" height="80" fill="#EFE6D8" />
            <circle cx="40" cy="44" r="32" fill="#fff" />
            <rect x="22" y="30" width="36" height="9" rx="2" fill="#F1DDB0" />
            <rect x="22" y="39" width="36" height="8" rx="2" fill="#6B4331" />
            <rect x="22" y="47" width="36" height="9" rx="2" fill="#F1DDB0" />
            <rect x="22" y="26" width="36" height="5" rx="2" fill="#3b2a22" />
            <circle cx="48" cy="24" r="3" fill="#EC3013" />
        </svg>
    );
}
