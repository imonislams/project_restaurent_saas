import { LabelHTMLAttributes } from 'react';
import { cn } from '@/Components/ui/cn';

export default function InputLabel({
    value,
    className = '',
    children,
    required = false,
    ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { value?: string; required?: boolean }) {
    return (
        <label
            {...props}
            className={cn(
                'block text-xs font-semibold text-foreground mb-1.5 tracking-tight',
                className
            )}
        >
            {value ? value : children}
            {required && <span className="ml-1 text-destructive">*</span>}
        </label>
    );
}
