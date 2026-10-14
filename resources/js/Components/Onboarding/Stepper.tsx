import { Badge } from '@/Components/ui';
import { cn } from '@/Components/ui/cn';
import { OnboardingStepInfo } from '@/types/onboarding';
import { Link } from '@inertiajs/react';
import {
    Building2,
    Check,
    CheckCircle2,
    Clock,
    CreditCard,
    Percent,
    Receipt,
    Store,
    User,
    Users,
    UtensilsCrossed,
    type LucideIcon,
} from 'lucide-react';

const STEP_ICONS: Record<string, LucideIcon> = {
    profile: User,
    company: Building2,
    branch: Store,
    hours: Clock,
    tax: Percent,
    receipt: Receipt,
    payments: CreditCard,
    menu: UtensilsCrossed,
    team: Users,
    review: CheckCircle2,
};

export default function Stepper({ steps, current }: { steps: OnboardingStepInfo[]; current: string }) {
    return (
        <ol className="space-y-0.5">
            {steps.map((step, index) => {
                const isCurrent = step.value === current;
                const isComplete = step.complete;
                const StepIcon = STEP_ICONS[step.value];

                return (
                    <li key={step.value} style={{ animationDelay: `${index * 35}ms` }} className="animate-fade-up">
                        <Link
                            href={route('onboarding.show', step.value)}
                            aria-current={isCurrent ? 'step' : undefined}
                            className={cn(
                                'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ease-out-expo',
                                isCurrent ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : 'hover:bg-accent',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                                    isComplete
                                        ? 'border-transparent bg-emerald-600 text-white'
                                        : isCurrent
                                          ? 'border-transparent bg-primary text-primary-foreground'
                                          : 'border-border bg-background text-muted-foreground group-hover:border-border',
                                )}
                            >
                                {isComplete ? (
                                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                                ) : StepIcon ? (
                                    <StepIcon className="h-3.5 w-3.5" />
                                ) : (
                                    <span className="text-[11px] font-semibold">{index + 1}</span>
                                )}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span
                                    className={cn(
                                        'block truncate text-sm transition-colors',
                                        isCurrent ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground group-hover:text-foreground',
                                    )}
                                >
                                    {step.label}
                                </span>
                                {step.optional && <span className="block text-[11px] text-muted-foreground">Optional</span>}
                            </span>
                            {isCurrent && (
                                <Badge tone="brand" dot={false} className="shrink-0">
                                    Current
                                </Badge>
                            )}
                        </Link>
                    </li>
                );
            })}
        </ol>
    );
}
