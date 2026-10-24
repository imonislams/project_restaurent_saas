import { ArrowRight, Bell, Building2, Check, ChefHat, Flag, Lock, Printer, QrCode, Receipt } from 'lucide-react';
import { ReactNode } from 'react';
import { DessertDish, ORDER_NO, PastaDish, PizzaDish, QrGlyph } from '../Journey/shared';
import { Chip, Panel, Phone, SceneDef, SceneProps, Tone, reveal, T } from './blocks';

const Row = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <div className={`flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[14px] ${className}`}>{children}</div>
);

/* ------------------------------------------------------------------ QR ordering */
function QrOrdering({ step, money }: SceneProps) {
    const status: [Tone, string] =
        step < 2 ? ['stone', 'No orders yet'] : step === 2 ? ['amber', 'Pending approval'] : step === 3 ? ['green', 'Accepted'] : step === 4 ? ['sky', 'Preparing'] : ['violet', 'Bill requested'];
    return (
        <div className="flex flex-wrap items-center justify-center gap-6">
            <Phone>
                <div className={`absolute inset-0 bg-[#2B2623] ${T} ${step === 0 ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute inset-x-8 top-[120px] h-[130px] rounded-2xl border-2 border-white/70">
                        <span className="td-scan absolute inset-x-0 top-0 h-[3px] bg-[#EC3013]" />
                    </div>
                    <div className="absolute inset-x-0 bottom-12 text-center text-[14px] font-bold text-white">Scan the table code</div>
                </div>
                <div className={`absolute inset-0 px-3 pt-8 ${T} ${step === 1 ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="text-[15px] font-extrabold">Olive &amp; Ember</div>
                    <div className="text-[13px] font-semibold text-stone-500">Table 7</div>
                    {[['Margherita', 14, <PizzaDish key="a" className="h-full w-full" />], ['Spicy Rigatoni', 16.5, <PastaDish key="b" className="h-full w-full" />]].map(([n, p, d]) => (
                        <div key={n as string} className="mt-2.5 flex items-center gap-2 rounded-xl border border-stone-200 p-1.5">
                            <div className="h-[50px] w-[50px] shrink-0 overflow-hidden rounded-lg">{d}</div>
                            <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-bold">{n as string}</div><div className="text-[14px] text-stone-600">{money(p as number)}</div></div>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EC3013] text-white">+</span>
                        </div>
                    ))}
                    <div className="absolute inset-x-3 bottom-4 rounded-xl bg-[#EC3013] py-2.5 text-center text-[14px] font-bold text-white">Place order · {money(30.5)}</div>
                </div>
                <div className={`absolute inset-0 px-3 pt-9 ${T} ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="text-[15px] font-extrabold">Order {ORDER_NO}</div>
                    <div className="text-[13px] font-semibold text-stone-500">Table 7</div>
                    <div className="mt-3 space-y-2">
                        {['Received', 'Preparing', 'Ready'].map((l, i) => {
                            const done = step >= 3 && i <= (step >= 4 ? 1 : 0);
                            return (
                                <div key={l} className="flex items-center gap-2 text-[14px] font-bold">
                                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] transition-colors duration-300 motion-reduce:transition-none ${done ? 'bg-emerald-600 text-white' : step === 2 && i === 0 ? 'bg-amber-200 text-amber-900' : 'bg-stone-200 text-stone-600'}`}>{done ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
                                    {l}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 rounded-lg bg-stone-100 p-2 text-[13px] font-semibold text-stone-700">{step === 2 ? 'Waiting for the restaurant to accept' : step === 5 ? 'Bill requested. Staff are on the way.' : 'Updates automatically'}</div>
                    <div className={`absolute inset-x-3 bottom-4 rounded-xl py-2.5 text-center text-[14px] font-bold transition-colors duration-300 motion-reduce:transition-none ${step === 5 ? 'bg-emerald-600 text-white' : 'bg-[#201E1D] text-white'}`}>{step === 5 ? 'Bill requested' : 'Request the bill'}</div>
                </div>
            </Phone>
            <Panel title="Orders · Staff view" icon={<QrCode className="h-4 w-4 text-[#EC3013]" />} className="w-full max-w-[290px]">
                <div className={`rounded-lg border-2 bg-stone-50 p-2.5 ${step === 2 ? 'border-[#EC3013]' : 'border-transparent'} ${reveal(step >= 2)}`}>
                    <Row className="font-extrabold"><span>{ORDER_NO}</span><Chip tone={status[0]}>{status[1]}</Chip></Row>
                    <div className="text-[14px] text-stone-600">Table 7 · QR order · {money(30.5)}</div>
                    {step === 2 && (
                        <div className="mt-2 flex gap-2 text-[14px] font-bold">
                            <span className="rounded-md bg-[#201E1D] px-3 py-1 text-white">Accept</span>
                            <span className="rounded-md bg-stone-200 px-3 py-1">Reject</span>
                        </div>
                    )}
                </div>
                <div className="mt-2 rounded-lg bg-stone-50 p-2.5 text-[14px] text-stone-600"><b className="text-[#201E1D]">Table 7</b> · {step >= 5 ? 'Billing' : step >= 2 ? 'Occupied' : 'Available'}</div>
                {step === 5 && <div className="td-pop mt-2 flex items-center gap-2 rounded-lg bg-sky-50 p-2.5 text-[14px] font-bold text-sky-900"><Bell className="h-4 w-4" /> Table 7 asked for the bill</div>}
            </Panel>
        </div>
    );
}

/* ------------------------------------------------------------------ Digital menu */
function DigitalMenu({ step, money }: SceneProps) {
    const price = step >= 2 ? 15 : 14;
    return (
        <div className="flex flex-wrap items-center justify-center gap-6">
            <Panel title="Menu manager" className="w-full max-w-[320px]">
                <div className="flex gap-1.5 text-[13px] font-bold">
                    {['Starters', 'Mains'].map((c) => <span key={c} className="rounded-full bg-stone-100 px-2.5 py-1">{c}</span>)}
                    <span className={`rounded-full bg-[#201E1D] px-2.5 py-1 text-white ${reveal(step >= 0, '-translate-x-2')}`}>Desserts</span>
                </div>
                <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 rounded-lg bg-stone-50 p-2"><div className="h-10 w-10 overflow-hidden rounded"><PizzaDish className="h-full w-full" /></div><div className="flex-1 text-[14px] font-bold">Margherita</div><span className={`rounded px-1.5 text-[14px] font-extrabold tabular-nums transition-colors duration-500 ${step === 2 ? 'bg-amber-100' : ''}`}>{money(price)}</span></div>
                    <div className={`flex items-center gap-2 rounded-lg bg-stone-50 p-2 ${reveal(step >= 1)}`}><div className="h-10 w-10 overflow-hidden rounded"><DessertDish className="h-full w-full" /></div><div className="flex-1 text-[14px] font-bold">Tiramisu</div><span className="text-[14px] font-extrabold">{money(8)}</span></div>
                </div>
                <div className={`mt-3 rounded-lg border border-dashed border-stone-300 p-2.5 text-[14px] ${reveal(step >= 2)}`}>
                    <div className="font-extrabold">Modifier groups on Margherita</div>
                    <div className="mt-1 flex flex-wrap gap-1.5"><Chip tone="stone">Crust · choose one</Chip><Chip tone="stone">Extras · choose many</Chip></div>
                </div>
            </Panel>
            <ArrowRight className="hidden h-6 w-6 text-[#EC3013] sm:block" aria-hidden />
            <Phone>
                <div className="px-3 pt-8">
                    <div className="text-[15px] font-extrabold">Olive &amp; Ember</div>
                    <div className="mt-2 flex gap-1 text-[13px] font-bold">
                        <span className="rounded-full bg-stone-100 px-2 py-1">Mains</span>
                        <span className={`rounded-full bg-[#201E1D] px-2 py-1 text-white ${reveal(true)}`}>Desserts</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-stone-200 p-1.5"><div className="h-[50px] w-[50px] overflow-hidden rounded-lg"><PizzaDish className="h-full w-full" /></div><div><div className="text-[14px] font-bold">Margherita</div><div className="text-[14px] font-semibold tabular-nums">{money(price)}</div></div></div>
                    <div className={`mt-2.5 flex items-center gap-2 rounded-xl border border-stone-200 p-1.5 ${reveal(step >= 1)}`}><div className="h-[50px] w-[50px] overflow-hidden rounded-lg"><DessertDish className="h-full w-full" /></div><div><div className="text-[14px] font-bold">Tiramisu</div><div className="text-[14px] font-semibold">{money(8)}</div></div></div>
                </div>
                <div className={`absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-3 shadow-[0_-12px_24px_-10px_rgba(32,30,29,0.35)] ${reveal(step >= 3, 'translate-y-full')}`}>
                    <div className="text-[15px] font-extrabold">Margherita · {money(15)}</div>
                    <div className="mt-2 text-[13px] font-bold text-stone-500">Crust · choose one</div>
                    {['Classic', 'Thin'].map((o, i) => <div key={o} className="mt-1 flex items-center gap-2 text-[14px] font-semibold"><span className={`h-4 w-4 rounded-full border-2 ${i === 0 ? 'border-[#EC3013] bg-[#EC3013] shadow-[inset_0_0_0_3px_#fff]' : 'border-stone-300'}`} />{o}</div>)}
                    <div className="mt-2 text-[13px] font-bold text-stone-500">Extras · choose many</div>
                    {['Extra basil', 'Chilli oil'].map((o, i) => <div key={o} className="mt-1 flex items-center gap-2 text-[14px] font-semibold"><span className={`flex h-4 w-4 items-center justify-center rounded border-2 ${i === 0 ? 'border-[#EC3013] bg-[#EC3013] text-white' : 'border-stone-300'}`}>{i === 0 && <Check className="h-3 w-3" />}</span>{o}</div>)}
                </div>
            </Phone>
        </div>
    );
}

/* ------------------------------------------------------------------ Table management */
type TableT = { n: string; s: string; tone: Tone; note?: string };
function TableManagement({ step }: SceneProps) {
    const tables: TableT[] = [
        { n: 'T1', s: step >= 4 ? 'Occupied' : 'Available', tone: step >= 4 ? 'red' : 'green', note: step >= 4 ? ORDER_NO : undefined },
        { n: 'T2', s: step === 0 ? 'Occupied' : step <= 1 ? 'Occupied' : step === 2 ? 'Billing' : 'Available', tone: step <= 1 ? 'red' : step === 2 ? 'amber' : 'green', note: step <= 1 ? '#A-1039' : step === 2 ? '#A-1039' : undefined },
        { n: 'T3', s: 'Reserved', tone: 'violet' },
        { n: 'T4', s: step >= 1 ? 'Occupied' : 'Available', tone: step >= 1 ? 'red' : 'green', note: step >= 1 ? ORDER_NO.replace('1042', '1043') : undefined },
        { n: 'T5', s: step >= 4 ? 'Cleaning' : 'Occupied', tone: step >= 4 ? 'sky' : 'red', note: step >= 4 ? undefined : ORDER_NO },
        { n: 'T6', s: 'Cleaning', tone: 'sky' },
    ];
    const note = ['Floor at a glance', 'Guests seated at T4, order attached', 'T2 asked for the bill', 'T2 settled and cleaned, available again', `Transfer: ${ORDER_NO} moved from T5 to T1`][step];
    return (
        <Panel title="Tables · Main floor" className="mx-auto max-w-[520px]">
            <div className="grid grid-cols-3 gap-2.5">
                {tables.map((t) => (
                    <div key={t.n} className={`rounded-xl border-2 p-2.5 transition-colors duration-500 motion-reduce:transition-none ${(step === 1 && t.n === 'T4') || (step === 2 && t.n === 'T2') || (step === 4 && (t.n === 'T1' || t.n === 'T5')) ? 'border-[#EC3013]' : 'border-transparent'} bg-stone-50`}>
                        <div className="text-[16px] font-extrabold">{t.n}</div>
                        <Chip tone={t.tone}>{t.s}</Chip>
                        <div className="mt-1 min-h-[20px] text-[14px] font-semibold text-stone-600">{t.note ?? ''}</div>
                    </div>
                ))}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-stone-100 p-2.5 text-[14px] font-bold">{step === 4 && <ArrowRight className="h-4 w-4 text-[#EC3013]" />}{note}</div>
        </Panel>
    );
}

/* ------------------------------------------------------------------ Order management */
function OrderManagement({ step, money }: SceneProps) {
    const [tone, label]: [Tone, string] = [
        ['amber', 'Pending approval'], ['red', 'New · accepted'], ['amber', 'Preparing'], ['sky', 'Ready'], ['green', 'Served'], ['green', 'Completed · paid'],
    ][step] as [Tone, string];
    const tl = ['Order placed', 'Accepted by staff', 'Kitchen preparing', 'Marked ready', 'Served to the table', 'Settled and receipted'];
    return (
        <div className="grid items-start gap-4 sm:grid-cols-[1.15fr_1fr]">
            <Panel title="Orders">
                <div className="mb-2 flex flex-wrap gap-1.5 text-[13px] font-bold">{['Dine-in', 'Takeaway', 'Delivery', 'Counter'].map((c, i) => <span key={c} className={`rounded-full px-2.5 py-1 ${i === 0 ? 'bg-[#201E1D] text-white' : 'bg-stone-100'}`}>{c}</span>)}</div>
                <div className="space-y-2">
                    <div className="rounded-lg border-2 border-[#EC3013] bg-stone-50 p-2.5"><Row className="font-extrabold"><span>{ORDER_NO}</span><Chip tone={tone}>{label}</Chip></Row><div className="text-[14px] text-stone-600">Table 7 · Dine-in · {money(30.5)}</div></div>
                    <div className="rounded-lg bg-stone-50 p-2.5"><Row className="font-bold"><span>#A-1041</span><Chip tone="amber">Preparing</Chip></Row><div className="text-[14px] text-stone-600">Table 3 · Dine-in</div></div>
                    <div className="rounded-lg bg-stone-50 p-2.5"><Row className="font-bold"><span>#A-1040</span><Chip tone="sky">Ready</Chip></Row><div className="text-[14px] text-stone-600">Takeaway · Pickup</div></div>
                </div>
            </Panel>
            <Panel title={`Order ${ORDER_NO}`}>
                <ol className="space-y-2">
                    {tl.map((t, i) => (
                        <li key={t} className={`flex items-center gap-2 text-[14px] font-bold ${T} ${i <= step ? 'opacity-100' : 'opacity-40'}`}>
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${i <= step ? 'bg-emerald-600 text-white' : 'bg-stone-200'}`}>{i <= step && <Check className="h-3 w-3" />}</span>{t}
                        </li>
                    ))}
                </ol>
                <div className="mt-3 flex gap-2 text-[14px] font-bold">
                    {step === 0 && <span className="rounded-md bg-[#201E1D] px-3 py-1 text-white">Accept</span>}
                    {step === 4 && <span className="rounded-md bg-[#EC3013] px-3 py-1 text-white">Settle payment</span>}
                    {step === 5 && <span className="flex items-center gap-1 rounded-md bg-stone-100 px-3 py-1"><Receipt className="h-4 w-4" /> Receipt</span>}
                    {[1, 2, 3].includes(step) && <span className="rounded-md bg-stone-100 px-3 py-1 text-stone-600">Following the kitchen…</span>}
                </div>
            </Panel>
        </div>
    );
}

/* ------------------------------------------------------------------ Kitchen display */
function KitchenDisplay({ step }: SceneProps) {
    const lane = step <= 1 ? 0 : step <= 3 ? 1 : 2;
    const item = (i: number): [Tone, string] => (step <= 1 ? ['stone', 'Pending'] : step === 2 ? (i === 0 ? ['amber', 'Preparing'] : ['stone', 'Pending']) : step === 3 ? (i === 0 ? ['green', 'Ready'] : ['amber', 'Preparing']) : ['green', 'Ready']);
    const ticket = (
        <div key="t" className="td-pop rounded-lg bg-white p-2 text-[14px] normal-case tracking-normal text-[#201E1D]">
            <Row className="font-extrabold"><span>{ORDER_NO}</span>{step >= 1 && <Flag className="h-4 w-4 text-[#EC3013]" aria-label="Priority" />}</Row>
            {['1× Margherita', '1× Rigatoni'].map((n, i) => <Row key={n} className="mt-1.5"><span>{n}</span><Chip tone={item(i)[0]}>{item(i)[1]}</Chip></Row>)}
            <div className="mt-1.5 flex items-center gap-1.5 text-[13px] font-bold text-stone-600">{step >= 1 && <Chip tone="red">Rush</Chip>}{step === 5 ? 'Handed over' : step === 4 ? 'Ticket ready' : ''}</div>
        </div>
    );
    return (
        <Panel dark title="Kitchen display" icon={<ChefHat className="h-4 w-4 text-[#EC3013]" />} className="mx-auto max-w-[620px]">
            <div className="grid grid-cols-3 gap-2 text-[13px] font-extrabold uppercase tracking-wide text-stone-300">
                {['New', 'Preparing', 'Ready'].map((l, i) => (
                    <div key={l} className="min-h-[230px] rounded-xl bg-white/[0.07] p-2">
                        <div className="mb-2 px-1">{l}</div>
                        {i === 0 && <div className="mb-2 rounded-lg bg-white/90 p-2 text-[14px] normal-case tracking-normal text-[#201E1D]"><Row className="font-bold"><span>#A-1041 · T3</span></Row><div className="text-stone-600">2 items · Preparing</div></div>}
                        {i === lane && ticket}
                    </div>
                ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[14px] font-semibold text-stone-300"><Printer className="h-4 w-4" /> Print view available for every ticket</div>
        </Panel>
    );
}

/* ------------------------------------------------------------------ Billing & payments */
function BillingPayments({ step, money }: SceneProps) {
    const methods = ['Cash', 'Card', 'Mobile', 'Online'];
    return (
        <div className="grid items-start gap-4 sm:grid-cols-2">
            <div className="space-y-3">
                <div className={`${reveal(step === 0, '-translate-y-2')} ${step === 0 ? '' : 'hidden'} flex items-center gap-2 rounded-xl bg-sky-50 p-3 text-[14px] font-bold text-sky-900`}><Bell className="h-4 w-4" /> Table 7 requested the bill</div>
                <Panel title="Bill · Table 7">
                    <Row><span>1× Margherita</span><span className="tabular-nums">{money(14)}</span></Row>
                    <Row className="mt-1"><span>1× Spicy Rigatoni</span><span className="tabular-nums">{money(16.5)}</span></Row>
                    <Row className="mt-2 border-t border-stone-200 pt-2 text-[16px] font-extrabold"><span>Total</span><span className="tabular-nums">{money(30.5)}</span></Row>
                    <div className="mt-2 flex items-center gap-2 text-[14px] font-semibold text-stone-600">Table 7 <Chip tone={step >= 3 ? 'sky' : 'amber'}>{step >= 3 ? 'Cleaning' : 'Billing'}</Chip></div>
                </Panel>
            </div>
            <div className="space-y-3">
                <Panel title="Payment">
                    <div className="grid grid-cols-2 gap-1.5">
                        {methods.map((m) => (
                            <div key={m} className={`rounded-lg border-2 py-2 text-center text-[13px] font-bold transition-colors duration-300 motion-reduce:transition-none ${step >= 2 && m === 'Card' ? 'border-[#EC3013] bg-white' : 'border-transparent bg-stone-100'}`}>{m}</div>
                        ))}
                    </div>
                    <div className="mt-3 flex min-h-[44px] items-center">
                        {step >= 3 ? <Chip tone="green" className="td-pop"><Check className="mr-1 inline h-4 w-4" />Paid · {money(30.5)}</Chip> : <span className="text-[14px] font-semibold text-stone-500">{step === 2 ? 'Recording card payment…' : 'Choose how the guest pays'}</span>}
                    </div>
                </Panel>
                <div className={`rounded-xl bg-white p-3 text-[14px] shadow-[0_12px_24px_-16px_rgba(32,30,29,0.5)] ring-1 ring-stone-900/10 ${reveal(step >= 4)}`}>
                    <Row className="font-extrabold"><span className="flex items-center gap-1.5"><Receipt className="h-4 w-4" />Receipt {ORDER_NO}</span><span className="tabular-nums">{money(30.5)}</span></Row>
                    <div className="mt-1 text-stone-600">Paid by card · Table 7</div>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ Reports */
const SALES = { today: [38, 52, 61, 44, 72, 66, 80], week: [48, 70, 56, 82, 64, 90, 76], month: [60, 74, 68, 88, 79, 94, 85] };
const PAY = [46, 38, 16];
function Reports({ step, money }: SceneProps) {
    const period = step <= 1 ? 'today' : step === 2 ? 'week' : 'month';
    const payments = step >= 3;
    const vals = payments ? PAY : SALES[step >= 2 ? (step === 2 ? 'week' : 'month') : 'today'];
    const labels = payments ? ['Cash', 'Card', 'Mobile'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const gross = { today: 1240, week: 8620, month: 34180 }[period];
    return (
        <Panel title="Reports" className="mx-auto max-w-[580px]">
            <div className="flex flex-wrap gap-1.5 text-[13px] font-bold">
                {['Sales', 'Payments collected', 'Orders', 'Products'].map((t, i) => <span key={t} className={`rounded-full px-2.5 py-1 transition-colors duration-300 ${(payments ? i === 1 : i === 0) ? 'bg-[#201E1D] text-white' : 'bg-stone-100'}`}>{t}</span>)}
                <span className="ml-auto flex gap-1.5">{['today', 'week', 'month'].map((p) => <span key={p} className={`rounded-full px-2.5 py-1 capitalize transition-colors duration-300 ${period === p && step >= 1 ? 'bg-[#EC3013] text-white' : 'bg-stone-100'}`}>{p === 'today' ? 'Today' : p === 'week' ? 'This week' : 'This month'}</span>)}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
                {[['Gross sales', money(gross)], ['Net sales', money(Math.round(gross * 0.91))], ['Orders', String(Math.round(gross / 29))]].map(([l, v]) => <div key={l} className="rounded-lg bg-stone-50 p-2"><div className="text-[13px] font-semibold text-stone-600">{l}</div><div className="text-[18px] font-extrabold tabular-nums">{v}</div></div>)}
            </div>
            <div className="mt-3 flex h-[130px] items-end gap-2 rounded-lg bg-stone-50 p-3">
                {vals.map((v, i) => (
                    <div key={`${payments}-${i}`} className="flex h-full flex-1 flex-col justify-end"><div className="h-full origin-bottom rounded-t bg-[#EC3013] transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `scaleY(${v / 100})` }} /></div>
                ))}
            </div>
            <div className="mt-1 flex gap-2 text-[13px] font-semibold text-stone-600">{labels.map((l) => <span key={l} className="flex-1 text-center">{l}</span>)}</div>
            <Row className="mt-3"><span className="text-[13px] font-semibold text-stone-500">Sample data for illustration</span><span className={`rounded-md px-3 py-1 text-[14px] font-bold transition-colors duration-300 ${step === 4 ? 'bg-emerald-600 text-white' : 'bg-stone-100'}`}>{step === 4 ? 'CSV downloaded' : 'Export CSV'}</span></Row>
        </Panel>
    );
}

/* ------------------------------------------------------------------ Branch management */
function Branches({ step, money }: SceneProps) {
    const branches = [['Downtown', 'Primary'], ['Riverside', 'Active'], ['Airport kiosk', 'Inactive']];
    const sel = step === 0 ? -1 : 1;
    const stat = sel === 1 ? [money(2140), '74'] : [money(5380), '188'];
    const tstat: [Tone, string] = step === 3 ? ['green', 'Received'] : step === 2 ? ['sky', 'Dispatched'] : ['stone', 'Draft'];
    return (
        <div className="grid items-start gap-4 sm:grid-cols-[1fr_1.2fr]">
            <Panel title="Branches" icon={<Building2 className="h-4 w-4 text-[#EC3013]" />}>
                <div className="space-y-2">
                    {branches.map(([n, s], i) => (
                        <div key={n} className={`flex items-center justify-between rounded-lg border-2 p-2.5 text-[14px] font-bold transition-colors duration-300 motion-reduce:transition-none ${sel === i ? 'border-[#EC3013] bg-white' : 'border-transparent bg-stone-50'}`}>
                            <span>{n}</span><Chip tone={s === 'Primary' ? 'violet' : s === 'Active' ? 'green' : 'stone'}>{s}</Chip>
                        </div>
                    ))}
                </div>
            </Panel>
            <div className="space-y-3">
                <Panel title={step === 0 ? 'All branches' : 'Riverside overview'}>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-stone-50 p-2"><div className="text-[13px] font-semibold text-stone-600">Gross sales today</div><div className="text-[18px] font-extrabold tabular-nums">{stat[0]}</div></div>
                        <div className="rounded-lg bg-stone-50 p-2"><div className="text-[13px] font-semibold text-stone-600">Orders</div><div className="text-[18px] font-extrabold tabular-nums">{stat[1]}</div></div>
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-stone-500">Sample data</div>
                </Panel>
                <div className={reveal(step >= 2)}>
                    <Panel title="Stock transfer">
                        <Row><span>20 kg flour · Downtown → Riverside</span></Row>
                        <div className="mt-1.5 flex gap-1.5"><Chip tone="stone">Approved</Chip><Chip tone={tstat[0]}>{tstat[1]}</Chip></div>
                    </Panel>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ Staff & roles */
function StaffRoles({ step }: SceneProps) {
    const perms = [['orders.view', true], ['orders.void', false], ['menu.view', true], ['reports.view', false], ['tables.view', true]] as const;
    const on = (p: string, base: boolean) => (step >= 2 && p === 'orders.void' ? false : step >= 2 && p === 'reports.view' ? false : base);
    const nav = [['Orders', true], ['Menu', true], ['Tables', true], ['Reports', false], ['Settings', false]] as const;
    return (
        <div className="grid items-start gap-3 sm:grid-cols-3">
            <Panel title="Invite staff">
                <div className="rounded-lg bg-stone-50 p-2.5 text-[14px] font-semibold">sam@olive-ember.example</div>
                <div className={`mt-2 ${reveal(step >= 0)}`}><Chip tone="amber">Invitation sent</Chip></div>
                <div className={`mt-3 rounded-lg border-2 p-2.5 text-[14px] font-bold ${step >= 1 ? 'border-[#EC3013]' : 'border-transparent bg-stone-50'} ${T}`}>Role: {step >= 1 ? 'Server' : 'Choose a role'}</div>
            </Panel>
            <Panel title="Role: Server">
                <div className="space-y-1.5">
                    {perms.map(([p, base]) => {
                        const v = step >= 1 ? on(p, base) : false;
                        return <Row key={p}><span className="font-semibold">{p}</span><span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors duration-300 motion-reduce:transition-none ${v ? 'bg-emerald-600' : 'bg-stone-300'}`}><i className={`h-4 w-4 rounded-full bg-white transition-transform duration-300 motion-reduce:transition-none ${v ? 'translate-x-4' : ''}`} /></span></Row>;
                    })}
                </div>
            </Panel>
            <Panel title="What Sam sees">
                <div className="space-y-1.5">
                    {nav.map(([n, v]) => <Row key={n} className={`rounded-md bg-stone-50 px-2 py-1.5 font-semibold ${T} ${step >= 3 ? (v ? 'opacity-100' : 'opacity-40') : 'opacity-100'}`}><span>{n}</span>{step >= 3 && !v && <Lock className="h-3.5 w-3.5" aria-label="No access" />}</Row>)}
                </div>
            </Panel>
        </div>
    );
}

/* ------------------------------------------------------------------ Inventory */
function Inventory({ step }: SceneProps) {
    const base = [['Mozzarella', 80, 'kg'], ['Tomato sauce', 62, 'L'], ['Flour', 24, 'kg'], ['Rigatoni', 55, 'kg']] as const;
    const level = (n: string, v: number) => {
        let x = v;
        if (step >= 1 && (n === 'Mozzarella' || n === 'Flour')) x -= 6;
        if (step >= 2 && n === 'Flour') x -= 6;
        if (step >= 3 && n === 'Flour') x += 50;
        if (step >= 4 && n === 'Mozzarella') x -= 8;
        return Math.max(x, 4);
    };
    return (
        <div className="grid items-start gap-4 sm:grid-cols-[1.4fr_1fr]">
            <Panel title="Ingredients · stock">
                <div className="space-y-3">
                    {base.map(([n, v, u]) => {
                        const x = level(n, v);
                        const low = x < 15;
                        return (
                            <div key={n}>
                                <Row className="font-bold"><span>{n}</span><span className="flex items-center gap-1.5">{low && <Chip tone="red">Low</Chip>}<span className="tabular-nums">{Math.round(x / 4)} {u}</span></span></Row>
                                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-stone-200"><div className={`h-full origin-left rounded-full transition-transform duration-700 ease-out motion-reduce:transition-none ${low ? 'bg-[#EC3013]' : 'bg-[#201E1D]'}`} style={{ width: '100%', transform: `scaleX(${x / 100})` }} /></div>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-2 text-[13px] font-semibold text-stone-500">Sample quantities</div>
            </Panel>
            <div className="space-y-3">
                <div className={`rounded-xl bg-white p-3 text-[14px] ring-1 ring-stone-900/10 ${reveal(step === 1)} ${step === 1 ? '' : 'hidden'}`}><b>{ORDER_NO}</b> sold · recipe uses mozzarella and flour</div>
                <div className={`rounded-xl bg-white p-3 text-[14px] ring-1 ring-stone-900/10 ${reveal(step >= 3)} ${step >= 3 ? '' : 'hidden'}`}><Row className="font-extrabold"><span>Purchase order PO-12</span><Chip tone={step >= 3 ? 'green' : 'stone'}>Received</Chip></Row><div className="text-stone-600">50 kg flour from supplier</div></div>
                <div className={`rounded-xl bg-white p-3 text-[14px] ring-1 ring-stone-900/10 ${reveal(step >= 4)} ${step >= 4 ? '' : 'hidden'}`}><Row className="font-extrabold"><span>Waste log</span><Chip tone="amber">Awaiting approval</Chip></Row><div className="text-stone-600">Mozzarella · expired</div></div>
            </div>
        </div>
    );
}

export const PRODUCT_SCENES: Record<string, SceneDef> = {
    'qr-ordering': { steps: ['Guest scans the QR', 'Browses the menu', 'Order awaits approval', 'Staff accept it', 'Guest tracks progress', 'Guest asks for the bill'], hold: 2400, Component: QrOrdering },
    'digital-menu': { steps: ['Add a category', 'Add a dish with a photo', 'Set price and modifiers', 'Guests see it live'], hold: 2600, Component: DigitalMenu },
    'table-management': { steps: ['Floor at a glance', 'Guests seated', 'Bill requested', 'Table cleared', 'Order transferred'], hold: 2300, Component: TableManagement },
    'order-management': { steps: ['Order arrives', 'Accepted', 'Preparing', 'Ready', 'Served', 'Settled'], hold: 2100, Component: OrderManagement },
    'kitchen-display': { steps: ['Ticket arrives', 'Flagged as rush', 'Cooking starts', 'Items plated', 'Ticket ready', 'Handed over'], hold: 2100, Component: KitchenDisplay },
    'billing-payments': { steps: ['Bill requested', 'Bill reviewed', 'Method chosen', 'Payment recorded', 'Receipt ready'], hold: 2300, Component: BillingPayments },
    reports: { steps: ['Pick a report', 'Set the period', 'Chart updates', 'Payments by method', 'Export to CSV'], hold: 2300, Component: Reports },
    'branch-management': { steps: ['All branches', 'Switch branch', 'Transfer dispatched', 'Transfer received'], hold: 2500, Component: Branches },
    'staff-roles': { steps: ['Invite a team member', 'Assign a role', 'Fine-tune permissions', 'Access applies'], hold: 2500, Component: StaffRoles },
    inventory: { steps: ['Ingredients and stock', 'A sale uses ingredients', 'Low stock flagged', 'Purchase order received', 'Waste logged'], hold: 2400, Component: Inventory },
};
