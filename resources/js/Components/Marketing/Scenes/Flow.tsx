import { ArrowLeftRight, Check } from 'lucide-react';
import { FlowNode, Lane, Solution } from '../Catalog/catalog';
import { SceneDef, SceneProps } from './blocks';

const LANE_TONE: Record<Lane, string> = {
    Guest: 'bg-amber-100 text-amber-900',
    'Front of house': 'bg-sky-100 text-sky-900',
    Kitchen: 'bg-red-100 text-[#A81E0C]',
    Cashier: 'bg-emerald-100 text-emerald-900',
    Owner: 'bg-stone-200 text-stone-800',
};

const ROW = 62;

/** Swimlane: lanes are columns, steps run top to bottom, and connectors draw as the order moves. */
function Swimlane({ lanes, flow, step }: { lanes: Lane[]; flow: FlowNode[]; step: number }) {
    const pt = (i: number) => [lanes.indexOf(flow[i].lane) * 100 + 50, i * ROW + ROW / 2] as const;
    return (
        <div>
            <div className="hidden sm:block">
                <div className="grid text-center text-[13px] font-extrabold uppercase tracking-wide text-stone-600" style={{ gridTemplateColumns: `repeat(${lanes.length}, 1fr)` }}>
                    {lanes.map((l) => <div key={l} className="pb-2">{l}</div>)}
                </div>
                <div className="relative">
                    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${lanes.length}, 1fr)` }} aria-hidden>
                        {lanes.map((l, i) => <div key={l} className={i % 2 ? 'bg-stone-900/[0.04]' : ''} />)}
                    </div>
                    <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${lanes.length * 100} ${flow.length * ROW}`} preserveAspectRatio="none" aria-hidden>
                        {flow.slice(1).map((_, k) => {
                            const [x1, y1] = pt(k);
                            const [x2, y2] = pt(k + 1);
                            const my = (y1 + y2) / 2;
                            const d = `M${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
                            return (
                                <g key={k}>
                                    <path d={d} fill="none" stroke="#d6d3d1" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="4 5" />
                                    <path d={d} fill="none" stroke="#EC3013" strokeWidth="2.5" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1" strokeDashoffset={step > k ? 0 : 1} style={{ transition: 'stroke-dashoffset 700ms ease-out' }} />
                                </g>
                            );
                        })}
                    </svg>
                    <div className="relative grid" style={{ gridTemplateColumns: `repeat(${lanes.length}, 1fr)`, gridTemplateRows: `repeat(${flow.length}, ${ROW}px)` }}>
                        {flow.map((n, i) => {
                            const li = lanes.indexOf(n.lane);
                            const start = Math.min(li, lanes.length - 2);
                            return (
                            <div key={i} className={`flex items-center px-1 ${li === start ? 'justify-start' : 'justify-end'}`} style={{ gridColumn: `${start + 1} / span 2`, gridRow: i + 1 }}>
                                <div className={`flex min-h-[46px] w-full max-w-[200px] items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-bold leading-tight transition-[opacity,background-color,box-shadow] duration-500 motion-reduce:transition-none ${i === step ? 'bg-white shadow-md ring-2 ring-[#EC3013]' : i < step ? 'bg-white ring-1 ring-stone-900/10' : 'bg-white/60 opacity-50'}`}>
                                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] ${i < step ? 'bg-emerald-600 text-white' : i === step ? 'bg-[#EC3013] text-white' : 'bg-stone-300'}`}>{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>
                                    {n.label}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <List flow={flow} step={step} className="sm:hidden" />
        </div>
    );
}

function List({ flow, step, className = '', muted = false, lanes = true }: { flow: FlowNode[]; step: number; className?: string; muted?: boolean; lanes?: boolean }) {
    return (
        <ol className={`space-y-2 ${className}`}>
            {flow.map((n, i) => (
                <li key={i} className={`flex items-center gap-2 rounded-lg bg-white p-2 text-[14px] font-bold transition-[opacity,box-shadow] duration-500 motion-reduce:transition-none ${i === step ? 'shadow-md ring-2 ring-[#EC3013]' : i < step ? 'ring-1 ring-stone-900/10' : 'opacity-50'}`}>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] ${i < step ? (muted ? 'bg-stone-500 text-white' : 'bg-emerald-600 text-white') : i === step ? 'bg-[#EC3013] text-white' : 'bg-stone-300'}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
                    <span className="min-w-0 flex-1">{n.label}</span>
                    {n.handoff && <span className="flex shrink-0 items-center gap-1 rounded-md bg-amber-100 px-1.5 text-[13px] text-amber-900"><ArrowLeftRight className="h-3.5 w-3.5" aria-hidden /><span className="sr-only sm:not-sr-only">Relay</span></span>}
                    {lanes && <span className={`rounded-md px-1.5 text-[13px] ${LANE_TONE[n.lane]}`}>{n.lane}</span>}
                </li>
            ))}
        </ol>
    );
}

function Compare({ sol, step }: { sol: Solution; step: number }) {
    const a = sol.compare!.flow;
    const b = sol.flow;
    const count = (f: FlowNode[]) => f.filter((n) => n.handoff).length;
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div>
                <div className="mb-2 text-[14px] font-extrabold text-stone-700">{sol.compare!.label}</div>
                <List flow={a} step={Math.min(step, a.length)} muted lanes={false} />
                <div className="mt-2 text-[14px] font-bold text-amber-900">Information relays between people: {count(a)}</div>
            </div>
            <div>
                <div className="mb-2 text-[14px] font-extrabold text-[#EC3013]">With Touch Dine</div>
                <List flow={b} step={Math.min(step, b.length)} lanes={false} />
                <div className="mt-2 text-[14px] font-bold text-emerald-800">Information relays between people: {count(b)}</div>
            </div>
            <p className="text-[13px] font-semibold text-stone-500 sm:col-span-2">Illustrative workflow. Not measured results.</p>
        </div>
    );
}

/** Builds a scene definition for a solution's workflow. */
export function solutionScene(sol: Solution): SceneDef {
    const n = Math.max(sol.flow.length, sol.compare?.flow.length ?? 0);
    const labels = sol.compare ? sol.compare.flow.map((f, i) => sol.flow[i]?.label ?? f.label).concat([]).slice(0, n) : sol.flow.map((f) => f.label);
    const Component = ({ step }: SceneProps) => (sol.compare ? <Compare sol={sol} step={step} /> : <Swimlane lanes={sol.lanes} flow={sol.flow} step={step} />);
    return { steps: sol.compare ? sol.compare.flow.map((f) => f.label) : labels, hold: 1900, Component };
}
