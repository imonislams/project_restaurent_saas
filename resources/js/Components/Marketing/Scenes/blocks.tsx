import { Pause, Play, RotateCcw } from 'lucide-react';
import { ComponentType, ReactNode, useEffect, useRef, useState } from 'react';
import { usePageActive, useReducedMotion, useVisible } from '../Journey/shared';

export const EASE = 'duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none';
export const T = `transition-[opacity,transform] ${EASE}`;
export const reveal = (on: boolean, from = 'translate-y-3') => `${T} ${on ? 'translate-x-0 translate-y-0 opacity-100' : `${from} opacity-0`}`;

/** Realistic smartphone frame. */
export function Phone({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`relative mx-auto h-[380px] w-[196px] shrink-0 rounded-[34px] bg-[#201E1D] p-[7px] shadow-[0_20px_30px_-18px_rgba(32,30,29,0.7)] ${className}`}>
            <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-white text-[#201E1D]">
                <div className="absolute left-1/2 top-2 z-10 h-[14px] w-[56px] -translate-x-1/2 rounded-full bg-[#201E1D]" />
                {children}
            </div>
        </div>
    );
}

/** App panel with a title. */
export function Panel({ title, icon, children, className = '', dark = false }: { title: string; icon?: ReactNode; children: ReactNode; className?: string; dark?: boolean }) {
    return (
        <div className={`rounded-2xl p-3.5 ${dark ? 'bg-[#201E1D] text-white' : 'bg-white text-[#201E1D] ring-1 ring-stone-900/10'} ${className}`}>
            <div className="mb-2.5 flex items-center gap-1.5 text-[14px] font-extrabold">
                {icon}
                {title}
            </div>
            {children}
        </div>
    );
}

export type Tone = 'red' | 'amber' | 'sky' | 'green' | 'stone' | 'violet';
const TONES: Record<Tone, string> = {
    red: 'bg-red-100 text-[#A81E0C]',
    amber: 'bg-amber-100 text-amber-800',
    sky: 'bg-sky-100 text-sky-800',
    green: 'bg-emerald-100 text-emerald-800',
    stone: 'bg-stone-100 text-stone-700',
    violet: 'bg-stone-200 text-stone-800',
};

/** Status label. Always text, never colour alone. */
export function Chip({ tone = 'stone', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
    return <span className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[13px] font-bold transition-colors duration-300 motion-reduce:transition-none ${TONES[tone]} ${className}`}>{children}</span>;
}

export type SceneProps = { step: number; money: (n: number) => string; full: boolean };
export interface SceneDef {
    steps: string[];
    hold?: number;
    Component: ComponentType<SceneProps>;
}

interface HostProps {
    scene: SceneDef;
    money: (n: number) => string;
    label: string;
    variant?: 'hero' | 'full';
    title?: string;
    lazyKey?: string;
}

/**
 * Plays a scene's steps once when it scrolls into view, then rests on the final state.
 * The step chips let visitors jump to any step; reduced-motion visitors start on the final state.
 */
export function SceneHost({ scene, money, label, variant = 'hero', title }: HostProps) {
    const ref = useRef<HTMLDivElement>(null);
    const visible = useVisible(ref);
    const active = usePageActive();
    const reduced = useReducedMotion();
    const last = scene.steps.length - 1;
    const [step, setStep] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [started, setStarted] = useState(false);

    useEffect(() => {
        if (reduced) {
            setStep(last);
            setPlaying(false);
        }
    }, [reduced, last]);

    useEffect(() => {
        if (visible && !started) setStarted(true);
    }, [visible, started]);

    useEffect(() => {
        if (reduced || !started || !visible || !active || !playing) return;
        if (step >= last) {
            setPlaying(false);
            return;
        }
        const t = setTimeout(() => setStep((s) => s + 1), scene.hold ?? 2300);
        return () => clearTimeout(t);
    }, [step, started, visible, active, playing, reduced, last, scene.hold]);

    const jump = (i: number) => {
        setPlaying(false);
        setStep(i);
    };
    const replay = () => {
        setStep(0);
        setPlaying(true);
    };

    const body = (
        <div className="flex min-h-[430px] items-center justify-center p-4 sm:p-6">
            <div className="w-full">
                <scene.Component step={step} money={money} full={variant === 'full'} />
            </div>
        </div>
    );

    const controls = (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-900/10 px-4 py-3">
            <div className="flex items-center gap-2 text-[14px] font-bold" aria-live="off">
                <span className="rounded-full bg-[#201E1D] px-2.5 py-0.5 text-white">{step + 1}/{scene.steps.length}</span>
                <span className="text-stone-800">{scene.steps[step]}</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5" role="group" aria-label="Jump to step">
                    {scene.steps.map((s, i) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => jump(i)}
                            aria-label={`Step ${i + 1}: ${s}`}
                            aria-current={i === step ? 'step' : undefined}
                            className="flex h-6 w-6 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC3013]"
                        >
                            <span className={`h-2.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${i === step ? 'w-5 bg-[#EC3013]' : i < step ? 'w-2.5 bg-[#201E1D]' : 'w-2.5 bg-stone-300'}`} />
                        </button>
                    ))}
                </div>
                {!reduced && (
                    <button
                        type="button"
                        onClick={() => (playing ? setPlaying(false) : step >= last ? replay() : setPlaying(true))}
                        aria-label={playing ? 'Pause animation' : step >= last ? 'Replay animation' : 'Play animation'}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900/[0.07] text-[#201E1D] hover:bg-stone-900/[0.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC3013]"
                    >
                        {playing ? <Pause className="h-4 w-4" /> : step >= last ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                )}
            </div>
        </div>
    );

    if (variant === 'full') {
        return (
            <div ref={ref} role="group" aria-label={label} className="overflow-hidden rounded-3xl bg-[#201E1D] p-2 shadow-[0_30px_70px_-40px_rgba(32,30,29,0.8)] sm:p-3">
                <div className="flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-stone-400">
                    <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-stone-600" /><i className="h-2.5 w-2.5 rounded-full bg-stone-600" /><i className="h-2.5 w-2.5 rounded-full bg-stone-600" /></span>
                    <span className="ml-2 truncate">Touch Dine · {title}</span>
                </div>
                <div className="overflow-hidden rounded-2xl bg-[#F3F2F2]">
                    {body}
                    {controls}
                </div>
            </div>
        );
    }

    return (
        <div ref={ref} role="group" aria-label={label} className="overflow-hidden rounded-[28px] bg-[#EADFD0] shadow-[0_24px_60px_-28px_rgba(32,30,29,0.45)] ring-1 ring-stone-900/10">
            {body}
            {controls}
        </div>
    );
}
