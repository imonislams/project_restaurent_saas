import { Check, ChefHat } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ORDER_NO, PastaDish, PizzaDish, QrGlyph, useFitScale, usePageActive, useReducedMotion, useVisible } from './shared';

const W = 480;
const H = 540;
const LAST = 7;
/** How long each step of the story holds, in ms. */
const HOLD = [1500, 1700, 1900, 2100, 2800, 2200, 2000, 4200];
const CAPTIONS = [
    'A table, a QR code',
    'Scan the table QR',
    'Camera reads the code',
    'The menu opens, no app',
    'Pick dishes, add to cart',
    'Order confirmed',
    'Kitchen gets the ticket',
    'Guest and kitchen stay in sync',
];

const EASE = 'duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none';

const phoneTransform = (s: number) => {
    if (s <= 1) return 'translate(300px, 330px) rotate(16deg) scale(0.4)';
    if (s === 2) return 'translate(168px, 150px) rotate(-3deg) scale(0.52)';
    if (s <= 5) return 'translate(130px, 36px) rotate(0deg) scale(1)';
    return 'translate(14px, 150px) rotate(0deg) scale(0.74)';
};

export default function HeroQrScene({ currency = '$' }: { currency?: string }) {
    const wrap = useRef<HTMLDivElement>(null);
    const scale = useFitScale(wrap, W);
    const reduced = useReducedMotion();
    const visible = useVisible(wrap);
    const active = usePageActive();
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (reduced) {
            setStep(LAST);
            return;
        }
        if (!visible || !active) return;
        const t = setTimeout(() => setStep((s) => (s >= LAST ? 0 : s + 1)), HOLD[step]);
        return () => clearTimeout(t);
    }, [step, visible, active, reduced]);

    const money = (n: number) => `${currency}${n.toFixed(2)}`;
    const onTable = step <= 2;
    const menuOn = step === 3 || step === 4;
    const doneOn = step >= 5;
    const cartOn = step >= 4;

    return (
        <div
            ref={wrap}
            role="img"
            aria-label="Animation: a guest scans the table QR code, browses the menu on their phone, places an order and the kitchen display receives the ticket."
            className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-[28px] bg-[#EADFD0] shadow-[0_24px_60px_-28px_rgba(32,30,29,0.45)] ring-1 ring-stone-900/10"
            style={{ aspectRatio: `${W} / ${H}` }}
        >
            {scale !== null && (
                <div
                    aria-hidden
                    className="absolute left-0 top-0"
                    style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: '0 0' }}
                >
                    {/* warm table light + linen edge */}
                    <div
                        className="absolute inset-0"
                        style={{ background: 'radial-gradient(ellipse 60% 55% at 30% 20%, #F6EEE2 0%, #EADFD0 70%)' }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[70px] bg-[#201E1D]/[0.06]" />

                    {/* table props */}
                    <div className={`absolute inset-0 transition-opacity ${EASE} ${onTable ? 'opacity-100' : 'opacity-30'}`}>
                        {/* QR table tent */}
                        <div
                            className="absolute left-[40px] top-[64px] h-[238px] w-[178px] rounded-2xl bg-white p-4 shadow-[0_14px_24px_-14px_rgba(32,30,29,0.5)]"
                            style={{ transform: 'rotate(-3deg)' }}
                        >
                            <div className="text-[15px] font-extrabold text-[#201E1D]">Olive &amp; Ember</div>
                            <div className="text-[13px] font-semibold text-stone-500">Table 7</div>
                            <div className="relative mt-3">
                                <QrGlyph size={146} />
                                {step === 1 && (
                                    <>
                                        <span className="td-ring absolute -inset-2 rounded-xl border-2 border-[#EC3013]" />
                                        {[
                                            'left-[-6px] top-[-6px] border-l-[3px] border-t-[3px]',
                                            'right-[-6px] top-[-6px] border-r-[3px] border-t-[3px]',
                                            'left-[-6px] bottom-[-6px] border-b-[3px] border-l-[3px]',
                                            'right-[-6px] bottom-[-6px] border-b-[3px] border-r-[3px]',
                                        ].map((c) => (
                                            <span key={c} className={`absolute h-5 w-5 border-[#EC3013] ${c}`} />
                                        ))}
                                    </>
                                )}
                            </div>
                            <div className="mt-2 text-center text-[13px] font-bold text-[#EC3013]">Scan to order</div>
                        </div>

                        {/* plate */}
                        <div className="absolute left-[232px] top-[286px] h-[190px] w-[190px]">
                            <svg viewBox="0 0 190 190" className="h-full w-full">
                                <ellipse cx="95" cy="168" rx="70" ry="9" fill="#201E1D" opacity=".12" />
                                <circle cx="95" cy="92" r="82" fill="#fff" />
                                <circle cx="95" cy="92" r="62" fill="#F4F1EC" />
                                <circle cx="95" cy="92" r="40" fill="#D9A05B" />
                                <circle cx="95" cy="92" r="33" fill="#C8321E" />
                                <path d="M70 86c10-12 24-8 28-18 10 8 26 6 32 18-2 14-12 28-30 28S72 100 70 86z" fill="#F4E4B5" />
                                <path d="M84 100c6-8 12-5 12 0-5 5-12 6-12 0zM104 78c6-6 13-3 12 1-4 5-10 5-12-1z" fill="#2F7D4F" />
                            </svg>
                        </div>
                        {/* glass */}
                        <div className="absolute right-[34px] top-[58px] h-[58px] w-[58px] rounded-full border-2 border-white/80 bg-white/40" />
                        <div className="absolute right-[48px] top-[72px] h-[30px] w-[30px] rounded-full bg-[#EC3013]/25" />
                        {/* cutlery */}
                        <div className="absolute left-[222px] top-[300px] h-[150px] w-[6px] rounded bg-stone-400/80" />
                        <div className="absolute left-[428px] top-[300px] h-[150px] w-[6px] rounded bg-stone-400/80" />
                    </div>

                    {/* connector between phone and kitchen */}
                    <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
                        <path
                            d="M196 292 C 250 292, 250 260, 296 260"
                            fill="none"
                            stroke="#EC3013"
                            strokeWidth="2.5"
                            strokeDasharray="5 6"
                            strokeLinecap="round"
                            className={`transition-opacity duration-500 motion-reduce:transition-none ${step >= 6 ? 'opacity-100' : 'opacity-0'}`}
                        />
                    </svg>
                    <span
                        className={`absolute left-0 top-0 h-3 w-3 rounded-full bg-[#EC3013] transition-[offset-distance,opacity] duration-[900ms] ease-in-out motion-reduce:transition-none ${step >= 6 ? 'opacity-100' : 'opacity-0'}`}
                        style={{
                            offsetPath: "path('M196 292 C 250 292, 250 260, 296 260')",
                            offsetDistance: step >= 7 ? '100%' : '0%',
                            marginLeft: -6,
                            marginTop: -6,
                        }}
                    />

                    {/* kitchen display */}
                    <div
                        className={`absolute left-[262px] top-[150px] w-[200px] rounded-2xl bg-[#201E1D] p-3 text-white shadow-[0_18px_30px_-16px_rgba(32,30,29,0.7)] transition-[opacity,transform] ${EASE} ${
                            step >= 6 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                        }`}
                    >
                        <div className="mb-2 flex items-center gap-1.5 text-[14px] font-bold">
                            <ChefHat className="h-4 w-4 text-[#EC3013]" /> Kitchen display
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[13px] font-semibold text-stone-300">
                            <div className="rounded-lg bg-white/[0.06] p-1.5">
                                New
                                <div className="mt-1.5 h-[92px]" />
                            </div>
                            <div className="rounded-lg bg-white/[0.06] p-1.5">
                                Preparing
                                <div className="mt-1.5 h-[92px]" />
                            </div>
                        </div>
                        {/* ticket slides from New to Preparing */}
                        <div
                            className={`absolute left-[16px] top-[64px] w-[78px] rounded-lg bg-white p-2 text-[#201E1D] transition-transform ${EASE}`}
                            style={{ transform: step >= 7 ? 'translateX(86px)' : step >= 6 ? 'translateX(0)' : 'translateX(-40px)' }}
                        >
                            <div className="text-[13px] font-extrabold">{ORDER_NO}</div>
                            <div className="text-[13px] leading-tight text-stone-600">Table 7</div>
                            <div className="text-[13px] leading-tight text-stone-600">2 dishes</div>
                            <div
                                className={`mt-1 inline-block rounded px-1.5 text-[13px] font-bold ${step >= 7 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-[#A81E0C]'}`}
                            >
                                {step >= 7 ? 'Preparing' : 'New'}
                            </div>
                        </div>
                    </div>

                    {/* phone */}
                    <div
                        className={`absolute left-0 top-0 h-[440px] w-[220px] origin-top-left rounded-[36px] bg-[#201E1D] p-[8px] shadow-[0_22px_34px_-14px_rgba(32,30,29,0.65)] transition-transform will-change-transform ${EASE}`}
                        style={{ transform: phoneTransform(step) }}
                    >
                        <div className="relative h-full w-full overflow-hidden rounded-[29px] bg-white">
                            <div className="absolute left-1/2 top-2 z-20 h-[16px] w-[64px] -translate-x-1/2 rounded-full bg-[#201E1D]" />

                            {/* camera */}
                            <div className={`absolute inset-0 bg-[#2B2623] transition-opacity duration-500 motion-reduce:transition-none ${onTable ? 'opacity-100' : 'opacity-0'}`}>
                                <div className="absolute inset-x-8 top-[150px] h-[140px] rounded-2xl border-2 border-white/70">
                                    {step === 2 && <span className="td-scan absolute inset-x-0 top-0 h-[3px] bg-[#EC3013]" />}
                                </div>
                                <div className="absolute inset-x-0 bottom-14 text-center text-[15px] font-bold text-white">
                                    {step === 2 ? 'Opening menu…' : 'Point at the QR code'}
                                </div>
                            </div>

                            {/* menu */}
                            <div className={`absolute inset-0 bg-white px-3 pt-8 transition-opacity duration-500 motion-reduce:transition-none ${menuOn ? 'opacity-100' : 'opacity-0'}`}>
                                <div className="text-[16px] font-extrabold leading-tight text-[#201E1D]">Olive &amp; Ember</div>
                                <div className="text-[13px] font-semibold text-stone-500">Table 7 · Dine-in</div>
                                <div className="mt-2 flex gap-1 text-[13px] font-bold">
                                    {['Starters', 'Mains', 'Drinks'].map((c) => (
                                        <span key={c} className={`rounded-full px-2 py-1 ${c === 'Mains' ? 'bg-[#201E1D] text-white' : 'bg-stone-100 text-stone-600'}`}>
                                            {c}
                                        </span>
                                    ))}
                                </div>
                                {[
                                    { n: 'Margherita', p: 14, d: <PizzaDish className="h-full w-full" />, delay: '250ms' },
                                    { n: 'Spicy Rigatoni', p: 16.5, d: <PastaDish className="h-full w-full" />, delay: '1000ms' },
                                ].map((it) => (
                                    <div key={it.n} className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-stone-200 p-2">
                                        <div className="h-[58px] w-[58px] shrink-0 overflow-hidden rounded-lg">{it.d}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-[14px] font-bold text-[#201E1D]">{it.n}</div>
                                            <div className="text-[14px] font-semibold text-stone-600">{money(it.p)}</div>
                                        </div>
                                        <span
                                            className={`flex h-7 w-7 items-center justify-center rounded-full text-[16px] font-bold transition-colors duration-300 motion-reduce:transition-none ${cartOn ? 'bg-[#EC3013] text-white' : 'bg-stone-100 text-[#201E1D]'}`}
                                            style={{ transitionDelay: cartOn ? it.delay : '0ms' }}
                                        >
                                            {cartOn ? <Check className="h-4 w-4" /> : '+'}
                                        </span>
                                    </div>
                                ))}
                                <div
                                    className={`absolute inset-x-3 bottom-4 flex items-center justify-between rounded-xl bg-[#EC3013] px-3 py-2.5 text-[14px] font-bold text-white transition-[transform,opacity] duration-500 motion-reduce:transition-none ${cartOn ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
                                    style={{ transitionDelay: cartOn ? '1200ms' : '0ms' }}
                                >
                                    <span>2 items</span>
                                    <span>Place order · {money(30.5)}</span>
                                </div>
                            </div>

                            {/* confirmation */}
                            <div className={`absolute inset-0 flex flex-col items-center bg-white px-4 pt-[84px] text-center transition-opacity duration-500 motion-reduce:transition-none ${doneOn ? 'opacity-100' : 'opacity-0'}`}>
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                                    {doneOn && (
                                        <svg key={step >= 5 ? 'on' : 'off'} viewBox="0 0 24 24" className="td-check h-9 w-9 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                                        </svg>
                                    )}
                                </div>
                                <div className="mt-3 text-[18px] font-extrabold text-[#201E1D]">Order placed</div>
                                <div className="mt-1 rounded-lg bg-stone-100 px-3 py-1 text-[17px] font-extrabold text-[#201E1D]">{ORDER_NO}</div>
                                <div className="mt-3 w-full space-y-1 text-left text-[14px] text-stone-700">
                                    <div className="flex justify-between"><span>1× Margherita</span><span>{money(14)}</span></div>
                                    <div className="flex justify-between"><span>1× Spicy Rigatoni</span><span>{money(16.5)}</span></div>
                                </div>
                                <div className={`mt-4 rounded-full px-3 py-1 text-[14px] font-bold ${step >= 7 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                    {step >= 7 ? 'Kitchen is preparing' : step >= 6 ? 'Sent to kitchen' : 'Received'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* caption */}
                    <div className="absolute inset-x-0 bottom-4 flex justify-center">
                        <div className="flex items-center gap-2 rounded-full bg-[#201E1D] px-4 py-2 text-[14px] font-semibold text-white shadow-lg">
                            <span className="text-[#EC3013]">{step + 1}/{LAST + 1}</span>
                            {CAPTIONS[step]}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
