import MarketingFooter from '@/Components/Marketing/MarketingFooter';
import MarketingNavbar from '@/Components/Marketing/MarketingNavbar';
import { PropsWithChildren, ReactNode, useEffect, useRef } from 'react';

export interface MarketingLayoutProps extends PropsWithChildren {
    announcement?: ReactNode;
    className?: string;
}

/**
 * Gives every marketing page the same motion language: a branded hero,
 * sections that fade up on scroll, and cards that stagger in.
 */
function useMarketingMotion(main: React.RefObject<HTMLElement>) {
    useEffect(() => {
        const root = main.current;
        if (!root) return;

        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const sections = Array.from(root.querySelectorAll<HTMLElement>(':scope section, :scope > div > section'));
        const hero = sections.find((s) => !s.closest('.mk-reveal') && !s.querySelector('.mk-grid'));

        // Branded hero treatment on the first section of pages that do not supply their own.
        const firstSection = root.querySelector<HTMLElement>('section');
        if (hero && hero === firstSection && !root.querySelector('.mk-grid')) {
            hero.classList.add('mk-hero');
        }
        if (reduce || typeof IntersectionObserver === 'undefined') return;

        const targets: HTMLElement[] = [];
        sections.forEach((section) => {
            if (section === hero && section.classList.contains('mk-hero')) return;
            if (section.closest('.mk-reveal') || section.classList.contains('mk-reveal')) return;
            const grid = Array.from(section.querySelectorAll<HTMLElement>('.grid')).find(
                (g) => g.children.length >= 2 && !g.closest('.mk-reveal') && g.children.length <= 24,
            );
            if (grid) {
                Array.from(grid.children).forEach((child, i) => {
                    const el = child as HTMLElement;
                    el.style.transitionDelay = `${Math.min(i, 5) * 70}ms`;
                    targets.push(el);
                });
            } else {
                targets.push(section);
            }
        });

        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const el = entry.target as HTMLElement;
                    el.classList.add('is-visible');
                    io.unobserve(el);
                    // Hand control back so hover transitions on cards keep working.
                    window.setTimeout(() => {
                        el.classList.remove('mk-reveal', 'is-visible');
                        el.style.transitionDelay = '';
                    }, 1100);
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
        );

        targets.forEach((el) => {
            el.classList.add('mk-reveal');
            io.observe(el);
        });

        return () => io.disconnect();
    }, [main]);
}

export default function MarketingLayout({ children, announcement, className = '' }: MarketingLayoutProps) {
    const main = useRef<HTMLElement>(null);
    useMarketingMotion(main);

    return (
        <div className={`min-h-screen flex flex-col bg-white mk-root text-stone-900 antialiased selection:bg-[#EC3013] selection:text-white ${className}`}>
            {announcement && (
                <div className="bg-[#201E1D] px-4 py-2 text-center text-xs font-medium text-stone-200 border-b border-stone-800">
                    {announcement}
                </div>
            )}

            <MarketingNavbar />

            <main ref={main} className="flex-1 w-full">
                {children}
            </main>

            <MarketingFooter />
        </div>
    );
}
