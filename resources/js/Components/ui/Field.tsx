import { cn } from './cn';

const BASE =
    'block w-full rounded-lg border border-gray-300 bg-white text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:bg-gray-50';

const invalid = 'border-red-300 focus:border-red-500 focus:ring-red-500/30';

function Label({ label, hint, error }: { label?: string; hint?: string; error?: string }) {
    return (
        <>
            {label && <span className="mb-1.5 block text-xs font-medium text-gray-600">{label}</span>}
            {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-gray-400">{hint}</span> : null}
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
            <Label label={label} />
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
                className={cn(BASE, 'h-9 px-3', error && invalid)}
            />
            {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
            {!error && hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
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
            <Label label={label} />
            <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(BASE, 'h-9 px-3 pr-8', error && invalid)}>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
            {!error && hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
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
            <Label label={label} />
            <textarea rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(BASE, 'px-3 py-2', error && invalid)} />
            {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
            {!error && hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
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
        <label className={cn('flex items-start gap-2.5', className)}>
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span>
                <span className="block text-sm text-gray-700">{label}</span>
                {hint && <span className="block text-xs text-gray-400">{hint}</span>}
            </span>
        </label>
    );
}
