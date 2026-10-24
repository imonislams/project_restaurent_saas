import { Banknote, Bell, Check, ChefHat, ChevronLeft, ChevronRight, CreditCard, Pause, Play, Smartphone } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { ORDER_NO, PastaDish, PizzaDish, QrGlyph, usePageActive, useReducedMotion, useVisible } from './shared';

type SceneProps = { sub: number; money: (n: number) => string };

const T = 'transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none';
const show = (on: boolean, from = 'translate-y-3') => `${T} ${on ? 'translate-x-0 translate-y-0 opacity-100' : `${from} opacity-0`}`;

function Phone({ children }: { children: ReactNode }) {
    return (
        <div className="relative mx-auto h-[380px] w-[196px] shrink-0 rounded-[34px] bg-black p-[7px] shadow-[0_20px_30px_-18px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
            <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-white text-[#201E1D]">
                <div className="absolute left-1/2 top-2 z-10 h-[14px] w-[56px] -translate-x-1/2 rounded-full bg-black" />
                {children}
            </div>
        </div>
    );
}

function Card({ title, icon, children, className = '' }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl bg-[#F3F2F2] p-3.5 text-[#201E1D] ${className}`}>
            <div className="mb-2.5 flex items-center gap-1.5 text-[14px] font-extrabold">
                {icon}
                {title}
            </div>
            {children}
        </div>
    );
}

function Status({ tone, children }: { tone: 'new' | 'prep' | 'ready' | 'done'; children: ReactNode }) {
    const c = {
        new: 'bg-red-100 text-[#A81E0C]',
        prep: 'bg-amber-100 text-amber-800',
        ready: 'bg-sky-100 text-sky-800',
        done: 'bg-emerald-100 text-emerald-800',
    }[tone];
    return <span className={`inline-block rounded-md px-2 py-0.5 text-[13px] font-bold ${c}`}>{children}</span>;
}

/* ---------- Stage 1: scan & explore ---------- */
function Scan({ sub, money }: SceneProps) {
    return (
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            <div className="rounded-2xl bg-white p-4 text-center text-[#201E1D] shadow-xl" style={{ transform: 'rotate(-2deg)' }}>
                <div className="text-[14px] font-extrabold">Olive &amp; Ember · Table 7</div>
                <div className="relative mx-auto mt-2 w-fit">
                    <QrGlyph size={112} />
                    {sub === 0 && <span className="td-ring absolute -inset-1.5 rounded-lg border-2 border-[#EC3013]" />}
                </div>
                <div className="mt-2 text-[13px] font-bold text-[#EC3013]">Scan to order</div>
            </div>
            <Phone>
                <div className={`absolute inset-0 bg-[#2B2623] ${T} ${sub === 0 ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute inset-x-8 top-[120px] h-[130px] rounded-2xl border-2 border-white/70">
                        {sub === 0 && <span className="td-scan absolute inset-x-0 top-0 h-[3px] bg-[#EC3013]" />}
                    </div>
                    <div className="absolute inset-x-0 bottom-12 text-center text-[14px] font-bold text-white">Point at the QR code</div>
                </div>
                <div className={`absolute inset-0 px-3 pt-8 ${T} ${sub >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="text-[15px] font-extrabold leading-tight">Olive &amp; Ember</div>
                    <div className="flex gap-1.5 pt-2 text-[13px] font-bold">
                        {['Starters', 'Mains', 'Drinks'].map((c) => (
                            <span key={c} className={`rounded-full px-2.5 py-1 ${c === 'Mains' ? 'bg-[#201E1D] text-white' : 'bg-stone-100 text-stone-600'}`}>{c}</span>
                        ))}
                    </div>
                    {[{ n: 'Margherita', p: 14, d: <PizzaDish className="h-full w-full" /> }, { n: 'Spicy Rigatoni', p: 16.5, d: <PastaDish className="h-full w-full" /> }].map((it, i) => (
                        <div key={it.n} style={{ transitionDelay: sub >= 2 ? `${i * 160}ms` : '0ms' }} className={`mt-2.5 flex items-center gap-2 rounded-xl border border-stone-200 p-1.5 ${show(sub >= 2)}`}>
                            <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-lg">{it.d}</div>
                            <div className="min-w-0">
                                <div className="truncate text-[14px] font-bold">{it.n}</div>
                                <div className="text-[14px] font-semibold text-stone-600">{money(it.p)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Phone>
        </div>
    );
}

/* ---------- Stage 2: place an order ---------- */
function Order({ sub, money }: SceneProps) {
    const total = sub >= 1 ? 30.5 : 14;
    return (
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            <Phone>
                <div className="px-3 pt-8">
                    <div className="text-[15px] font-extrabold">Your order</div>
                    <div className="text-[13px] font-semibold text-stone-500">Table 7</div>
                    <div className="mt-3 space-y-2.5 text-[14px]">
                        <div className="flex items-center justify-between"><span className="font-bold">Margherita</span><span className="rounded-full bg-stone-100 px-2 font-bold">1×</span></div>
                        <div className={`flex items-center justify-between ${show(sub >= 1, 'translate-y-2')}`}><span className="font-bold">Spicy Rigatoni</span><span className="rounded-full bg-stone-100 px-2 font-bold">1×</span></div>
                    </div>
                    <div className="mt-4 flex justify-between border-t border-stone-200 pt-3 text-[15px] font-extrabold"><span>Total</span><span className="tabular-nums">{money(total)}</span></div>
                    <div className={`absolute inset-x-3 bottom-4 rounded-xl py-2.5 text-center text-[14px] font-bold text-white transition-colors duration-300 motion-reduce:transition-none ${sub >= 2 ? 'bg-emerald-600' : 'bg-[#EC3013]'}`}>
                        {sub >= 2 ? 'Order placed' : 'Confirm order'}
                    </div>
                </div>
            </Phone>
            <Card title="Orders · Live" className="w-full max-w-[300px]">
                <div className="space-y-2 text-[14px]">
                    <div className={`rounded-lg border-2 bg-white p-2.5 ${show(sub >= 2, '-translate-x-6')} ${sub >= 2 ? 'border-[#EC3013]' : 'border-transparent'}`}>
                        <div className="flex items-center justify-between font-extrabold"><span>{ORDER_NO}</span><Status tone="new">New</Status></div>
                        <div className="text-stone-600">Table 7 · Dine-in · 2 items · {money(30.5)}</div>
                    </div>
                    <div className="rounded-lg bg-white/70 p-2.5">
                        <div className="flex items-center justify-between font-bold"><span>#A-1041</span><Status tone="prep">Preparing</Status></div>
                        <div className="text-stone-600">Table 3 · Dine-in</div>
                    </div>
                    <div className="rounded-lg bg-white/70 p-2.5">
                        <div className="flex items-center justify-between font-bold"><span>#A-1040</span><Status tone="done">Served</Status></div>
                        <div className="text-stone-600">Table 5 · Dine-in</div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

/* ---------- Stage 3: kitchen ---------- */
function Ticket({ children, flash }: { children?: ReactNode; flash?: boolean }) {
    return (
        <div className={`rounded-lg bg-white p-2.5 text-[14px] shadow-sm ${flash ? 'ring-2 ring-[#EC3013]' : ''}`}>
            <div className="font-extrabold">{ORDER_NO} · Table 7</div>
            <div className="text-stone-700">1× Margherita</div>
            <div className="text-stone-700">1× Spicy Rigatoni</div>
            {children}
        </div>
    );
}

function Lane({ title, children }: { title: string; children?: ReactNode }) {
    return (
        <div className="min-h-[200px] rounded-xl bg-[#201E1D]/[0.06] p-2">
            <div className="mb-2 px-1 text-[13px] font-extrabold uppercase tracking-wide text-stone-600">{title}</div>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function Kitchen({ sub }: SceneProps) {
    return (
        <div className="mx-auto w-full max-w-[640px]">
            <Card title="Kitchen display" icon={<ChefHat className="h-4 w-4 text-[#EC3013]" />}>
                <div className="grid grid-cols-3 gap-2">
                    <Lane title="New">
                        <div className={show(sub === 0, '-translate-x-8')} style={{ display: sub >= 1 ? 'none' : undefined }}><Ticket flash><div className="mt-1"><Status tone="new">New</Status></div></Ticket></div>
                    </Lane>
                    <Lane title="Preparing">
                        <div className="rounded-lg bg-white/70 p-2.5 text-[14px]"><div className="font-bold">#A-1041 · Table 3</div><Status tone="prep">Preparing</Status></div>
                        {sub >= 1 && (
                            <div className="td-pop">
                                <Ticket><div className="mt-1 flex items-center gap-1.5"><Status tone="prep">Preparing</Status>{sub >= 2 && <span className="text-[13px] font-bold text-emerald-700">1/2 plated</span>}</div></Ticket>
                            </div>
                        )}
                    </Lane>
                    <Lane title="Ready" />
                </div>
            </Card>
        </div>
    );
}

/* ---------- Stage 4: ready & served ---------- */
function Served({ sub }: SceneProps) {
    return (
        <div className="mx-auto grid w-full max-w-[680px] gap-4 sm:grid-cols-2">
            <Card title="Kitchen display" icon={<ChefHat className="h-4 w-4 text-[#EC3013]" />}>
                <div className="grid grid-cols-2 gap-2">
                    <Lane title="Preparing">{sub < 1 && <Ticket><div className="mt-1"><Status tone="prep">Preparing</Status></div></Ticket>}</Lane>
                    <Lane title="Ready">{sub >= 1 && <div className="td-pop"><Ticket><div className="mt-1"><Status tone="ready">Ready</Status></div></Ticket></div>}</Lane>
                </div>
            </Card>
            <Card title="Front of house" icon={<Bell className="h-4 w-4 text-[#EC3013]" />}>
                <div className="rounded-lg bg-white p-2.5 text-[14px]">
                    <div className="flex items-center justify-between font-extrabold"><span>{ORDER_NO}</span>{sub >= 2 ? <Status tone="done">Served</Status> : sub >= 1 ? <Status tone="ready">Ready</Status> : <Status tone="prep">Preparing</Status>}</div>
                    <div className="text-stone-600">Table 7 · Dine-in</div>
                </div>
                <div className={`mt-2 flex items-center gap-2 rounded-lg bg-sky-50 p-2.5 text-[14px] font-bold text-sky-900 ${show(sub === 1)}`} style={{ display: sub >= 2 ? 'none' : undefined }}>
                    <Bell className="h-4 w-4" /> Ready to serve at Table 7
                </div>
                <div className={`mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-[14px] font-bold text-emerald-900 ${show(sub >= 2)}`}>
                    <Check className="h-4 w-4" /> Served to Table 7
                </div>
            </Card>
        </div>
    );
}

/* ---------- Stage 5: billing ---------- */
function Billing({ sub, money }: SceneProps) {
    const methods = [
        { n: 'Cash', i: <Banknote className="h-4 w-4" /> },
        { n: 'Card', i: <CreditCard className="h-4 w-4" /> },
        { n: 'Mobile', i: <Smartphone className="h-4 w-4" /> },
    ];
    return (
        <div className="mx-auto grid w-full max-w-[680px] gap-4 sm:grid-cols-2">
            <Card title={`Bill · Table 7`}>
                <div className="space-y-1.5 text-[14px]">
                    <div className="flex justify-between"><span>1× Margherita</span><span className="tabular-nums">{money(14)}</span></div>
                    <div className="flex justify-between"><span>1× Spicy Rigatoni</span><span className="tabular-nums">{money(16.5)}</span></div>
                    <div className="flex justify-between border-t border-stone-300 pt-2 text-[16px] font-extrabold"><span>Total</span><span className="tabular-nums">{money(30.5)}</span></div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[14px]">
                    <span className="font-semibold text-stone-600">Table 7</span>
                    <span className={`rounded-md px-2 py-0.5 text-[13px] font-bold transition-colors duration-500 motion-reduce:transition-none ${sub >= 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{sub >= 2 ? 'Available' : 'Occupied'}</span>
                </div>
            </Card>
            <Card title="Payment">
                <div className="grid grid-cols-3 gap-2">
                    {methods.map((m) => {
                        const on = sub >= 1 && m.n === 'Card';
                        return (
                            <div key={m.n} className={`flex flex-col items-center gap-1 rounded-lg border-2 py-2.5 text-[14px] font-bold transition-colors duration-300 motion-reduce:transition-none ${on ? 'border-[#EC3013] bg-white' : 'border-transparent bg-white/70'}`}>
                                {m.i}
                                {m.n}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-3 flex min-h-[56px] items-center justify-center">
                    {sub >= 2 ? (
                        <div className="td-pop flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-[15px] font-extrabold text-white">
                            <Check className="h-5 w-5" /> Paid · {money(30.5)}
                        </div>
                    ) : (
                        <div className="text-[14px] font-semibold text-stone-500">{sub >= 1 ? 'Processing card payment…' : 'Choose how to pay'}</div>
                    )}
                </div>
            </Card>
        </div>
    );
}

const STAGES = [
    { t: 'Scan & explore', s: 'Scan the table QR', d: 'The guest scans the code on the table. The menu opens in the browser with categories, photos and prices.', c: Scan },
    { t: 'Place an order', s: 'Order from the table', d: 'Dishes and totals update as the guest builds the order. Confirming sends it straight to order management.', c: Order },
    { t: 'Kitchen receives it', s: 'Ticket reaches the kitchen', d: 'A new ticket lands in the kitchen queue. Staff start it and the status moves from New to Preparing.', c: Kitchen },
    { t: 'Ready & served', s: 'Marked ready, then served', d: 'The kitchen marks it ready. Front of house sees the update and moves the order to served.', c: Served },
    { t: 'Bill & complete', s: 'Bill, payment, table free', d: 'The bill goes through the normal billing workflow. Once paid, the order completes and the table is available again.', c: Billing },
];

function useDesktop() {
    const [d, setD] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)');
        const f = () => setD(mq.matches);
        f();
        mq.addEventListener('change', f);
        return () => mq.removeEventListener('change', f);
    }, []);
    return d;
}

export default function CustomerJourney({ currency = '$' }: { currency?: string }) {
    const root = useRef<HTMLDivElement>(null);
    const reduced = useReducedMotion();
    const visible = useVisible(root);
    const active = usePageActive();
    const desktop = useDesktop();
    const [stage, setStage] = useState(0);
    const [sub, setSub] = useState(0);
    const [playing, setPlaying] = useState(true);
    const money = (n: number) => `${currency}${n.toFixed(2)}`;
    const autoplay = playing && desktop && !reduced;

    useEffect(() => {
        if (reduced) {
            setSub(2);
            return;
        }
        if (!visible || !active) return;
        let t: ReturnType<typeof setTimeout> | undefined;
        if (sub < 2) t = setTimeout(() => setSub((s) => s + 1), 1300);
        else if (autoplay)
            t = setTimeout(() => {
                setStage((s) => (s + 1) % STAGES.length);
                setSub(0);
            }, stage === STAGES.length - 1 ? 4200 : 2400);
        return () => clearTimeout(t);
    }, [sub, stage, visible, active, autoplay, reduced]);

    const go = (i: number) => {
        setStage((i + STAGES.length) % STAGES.length);
        setSub(reduced ? 2 : 0);
    };
    const fill = stage / (STAGES.length - 1);
    const finished = stage === STAGES.length - 1 && sub >= 2;

    return (
        <div ref={root} className="rounded-3xl bg-[#201E1D] p-4 text-white sm:p-8">
            <p className="sr-only" aria-live="polite">Stage {stage + 1} of {STAGES.length}: {STAGES[stage].t}</p>

            {/* progress thread */}
            <div className="relative">
                <div className="absolute left-[10%] right-[10%] top-[18px] hidden h-[3px] rounded bg-white/15 sm:block" />
                <div
                    className={`absolute left-[10%] right-[10%] top-[18px] hidden h-[3px] origin-left rounded transition-[transform,background-color] duration-700 ease-out motion-reduce:transition-none sm:block ${finished ? 'bg-emerald-500' : 'bg-[#EC3013]'}`}
                    style={{ transform: `scaleX(${fill})` }}
                />
                <ol className="relative grid grid-cols-5">
                    {STAGES.map((s, i) => (
                        <li key={s.t} className="flex justify-center">
                            <button
                                type="button"
                                onClick={() => go(i)}
                                aria-current={i === stage ? 'step' : undefined}
                                className="group flex flex-col items-center gap-2 rounded-lg px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC3013]"
                            >
                                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-extrabold transition-colors duration-300 motion-reduce:transition-none ${i < stage || (i === stage && finished) ? 'bg-emerald-500 text-white' : i === stage ? 'bg-[#EC3013] text-white' : 'bg-[#3a3634] text-stone-300'}`}>
                                    {i < stage || (i === stage && finished) ? <Check className="h-4 w-4" /> : i + 1}
                                </span>
                                <span className={`hidden text-center text-[14px] font-bold sm:block ${i === stage ? 'text-white' : 'text-stone-400'}`}>{s.t}</span>
                            </button>
                        </li>
                    ))}
                </ol>
                {/* the order, travelling along the thread */}
                <span
                    aria-hidden
                    className="pointer-events-none absolute top-[-14px] hidden -translate-x-1/2 rounded-md bg-white px-2 py-0.5 text-[13px] font-extrabold text-[#201E1D] transition-[left] duration-700 ease-out motion-reduce:transition-none sm:block"
                    style={{ left: `${10 + 80 * fill}%` }}
                >
                    {ORDER_NO}
                </span>
            </div>
            <div className="mt-3 text-center text-[15px] font-bold sm:hidden">{STAGES[stage].t}</div>

            {/* camera track */}
            <div className="mt-8 overflow-hidden">
                <div
                    className="flex transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                    style={{ transform: `translateX(-${stage * 100}%)` }}
                >
                    {STAGES.map((s, i) => {
                        const Scene = s.c;
                        const pane = i === stage ? sub : i < stage ? 2 : 0;
                        return (
                            <div
                                key={s.t}
                                aria-hidden={i !== stage}
                                {...(i !== stage ? ({ inert: '' } as object) : {})}
                                className="grid w-full shrink-0 items-center gap-6 lg:min-h-[420px] lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-10"
                            >
                                <div className="px-1 text-center lg:text-left">
                                    <div className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#EC3013]">Step {i + 1} of {STAGES.length}</div>
                                    <h3 className="mt-1.5 text-2xl font-extrabold">{s.s}</h3>
                                    <p className="mt-2 text-[15px] leading-relaxed text-stone-300">{s.d}</p>
                                </div>
                                <div className="flex min-h-[400px] min-w-0 items-center py-2"><div className="w-full"><Scene sub={pane} money={money} /></div></div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* controls */}
            <div className="mt-6 flex items-center justify-between gap-3">
                <button type="button" onClick={() => go(stage - 1)} aria-label="Previous step" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC3013]">
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3">
                    {desktop && !reduced && (
                        <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[14px] font-bold hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC3013]">
                            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            {playing ? 'Pause' : 'Play'}
                        </button>
                    )}
                    <span className="text-[14px] font-semibold text-stone-300">{stage + 1} / {STAGES.length}</span>
                </div>
                <button type="button" onClick={() => go(stage + 1)} aria-label="Next step" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC3013]">
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
