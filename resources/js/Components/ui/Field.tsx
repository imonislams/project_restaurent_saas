import { cn } from './cn';

const BASE =
    'flex w-full rounded-md border border-input bg-background text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

const invalid = 'border-destructive text-destructive focus-visible:ring-destructive';

function LabelHeader({ label, hint, error }: { label?: string; hint?: string; error?: string }) {
    return (
        <>
            {label && <span className="mb-1.5 block text-xs font-semibold text-foreground tracking-tight">{label}</span>}
            {error ? (
                <span className="mt-1 block text-xs font-medium text-destructive">{error}</span>
            ) : hint ? (
                <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
            ) : null}
        </>
    );
}

export function TextField({
    label,
    value,
    onChange,
    placeholder,
    type = 'text',
    onEnter,
    hint,
    error,
    required,
    className,
}: {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    onEnter?: () => void;
    hint?: string;
    error?: string;
    required?: boolean;
    className?: string;
}) {
    return (
        <label className={cn('block', className)}>
            <LabelHeader label={label} />
            <input
                type={type}
                value={value}
                required={required}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && onEnter) {
                        e.preventDefault();
                        onEnter();
                    }
                }}
                className={cn(BASE, 'h-9 px-3 py-1', error && invalid)}
            />
            {error && <span className="mt-1 block text-xs font-medium text-destructive">{error}</span>}
            {!error && hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
        </label>
    );
}

export interface FieldOption {
    value: string;
    label: string;
}

export function SelectField({
    label,
    value,
    options,
    onChange,
    hint,
    error,
    className,
}: {
    label?: string;
    value: string;
    options: FieldOption[];
    onChange: (value: string) => void;
    hint?: string;
    error?: string;
    className?: string;
}) {
    return (
        <label className={cn('block', className)}>
            <LabelHeader label={label} />
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn(BASE, 'h-9 px-3 py-1 pr-8 cursor-pointer', error && invalid)}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <span className="mt-1 block text-xs font-medium text-destructive">{error}</span>}
            {!error && hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
        </label>
    );
}

export function TextareaField({
    label,
    value,
    onChange,
    rows = 3,
    placeholder,
    hint,
    error,
    className,
}: {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    rows?: number;
    placeholder?: string;
    hint?: string;
    error?: string;
    className?: string;
}) {
    return (
        <label className={cn('block', className)}>
            <LabelHeader label={label} />
            <textarea
                rows={rows}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className={cn(BASE, 'px-3 py-2', error && invalid)}
            />
            {error && <span className="mt-1 block text-xs font-medium text-destructive">{error}</span>}
            {!error && hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
        </label>
    );
}

export function CheckboxField({
    label,
    checked,
    onChange,
    hint,
    className,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    hint?: string;
    className?: string;
}) {
    return (
        <label className={cn('flex items-start gap-2.5 cursor-pointer', className)}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary shadow-xs focus:ring-ring"
            />
            <span>
                <span className="block text-xs font-semibold text-foreground tracking-tight">{label}</span>
                {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
            </span>
        </label>
    );
}
