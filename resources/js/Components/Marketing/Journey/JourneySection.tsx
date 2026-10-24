import { lazy, Suspense, useEffect, useRef, useState } from 'react';

const CustomerJourney = lazy(() => import('./CustomerJourney'));

/** Section shell; the heavy animation chunk loads only when the section nears the viewport. */
export default function JourneySection({ currency = '$' }: { currency?: string }) {
    const holder = useRef<HTMLDivElement>(null);
    const [load, setLoad] = useState(false);

    useEffect(() => {
        const el = holder.current;
        if (!el || typeof IntersectionObserver === 'undefined') {
            setLoad(true);
            return;
        }
        const io = new IntersectionObserver(([e]) => e.isIntersecting && (setLoad(true), io.disconnect()), { rootMargin: '500px 0px' });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <section id="how-it-works" className="w-full scroll-mt-20 bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-6xl">
                <div className="mx-auto max-w-3xl text-center">
                    <span className="mk-eyebrow">How Touch Dine works</span>
                    <h2 className="mk-h2 mt-3">From Table to Kitchen. Every Step Connected.</h2>
                    <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg">
                        From the moment a customer scans a QR code to the moment an order is served and paid for, Touch Dine keeps the restaurant workflow connected.
                    </p>
                </div>
                <div ref={holder} className="mt-12 min-h-[650px]">
                    {load && (
                        <Suspense fallback={<div className="min-h-[650px] rounded-3xl bg-[#201E1D]" />}>
                            <CustomerJourney currency={currency} />
                        </Suspense>
                    )}
                </div>
            </div>
        </section>
    );
}
