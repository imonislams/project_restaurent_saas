import { CSSProperties, ElementType, PropsWithChildren, useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Fires once when the element scrolls into view. */
function useInView<T extends Element>(threshold = 0.15) {
    const ref = useRef<T>(null);
    const [seen, setSeen] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || seen) return;
        if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
            setSeen(true);
            return;
        }
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setSeen(true);
                    io.disconnect();
                }
            },
            { threshold, rootMargin: '0px 0px -8% 0px' },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [seen, threshold]);

    return [ref, seen] as const;
}

interface RevealProps extends PropsWithChildren {
    as?: ElementType;
    delay?: number;
    className?: string;
}

/** Fades and lifts its children in as they enter the viewport. */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children }: RevealProps) {
    const [ref, seen] = useInView<HTMLElement>();
    const style: CSSProperties = { transitionDelay: `${delay}ms` };

    return (
        <Tag ref={ref} style={style} className={`mk-reveal ${seen ? 'is-visible' : ''} ${className}`}>
            {children}
        </Tag>
    );
}

interface CountUpProps {
    to: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    duration?: number;
    className?: string;
}

/** Animates a number from 0 once it scrolls into view. */
export function CountUp({ to, prefix = '', suffix = '', decimals = 0, duration = 1400, className }: CountUpProps) {
    const [ref, seen] = useInView<HTMLSpanElement>(0.4);
    const [value, setValue] = useState(prefersReducedMotion() ? to : 0);

    useEffect(() => {
        if (!seen || prefersReducedMotion()) {
            if (seen) setValue(to);
            return;
        }
        let raf = 0;
        const start = performance.now();
        const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            setValue(to * (1 - Math.pow(1 - p, 3)));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [seen, to, duration]);

    return (
        <span ref={ref} className={`tabular-nums ${className ?? ''}`}>
            {prefix}
            {value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
            {suffix}
        </span>
    );
}

/** Decorative drifting squares that echo the Touch Dine mark. */
export function BrandSquares({ className = '', tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
    const squares = [
        { s: 56, x: '6%', y: '14%', d: 0, red: false },
        { s: 28, x: '14%', y: '62%', d: 1.4, red: true },
        { s: 40, x: '88%', y: '18%', d: 0.6, red: true },
        { s: 64, x: '92%', y: '58%', d: 2, red: false },
        { s: 22, x: '78%', y: '82%', d: 1, red: false },
        { s: 34, x: '28%', y: '86%', d: 2.4, red: false },
    ];

    return (
        <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
            <div className={`mk-grid absolute inset-0 ${tone === 'dark' ? 'mk-grid-dark' : ''}`} />
            {squares.map((q, i) => (
                <span
                    key={i}
                    className={`mk-float absolute ${q.red ? 'bg-[#EC3013]/90' : tone === 'dark' ? 'bg-white/[0.06]' : 'bg-[#201E1D]/[0.07]'}`}
                    style={{ width: q.s, height: q.s, left: q.x, top: q.y, animationDelay: `${q.d}s` }}
                />
            ))}
        </div>
    );
}
