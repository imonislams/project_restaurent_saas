import { LabelHTMLAttributes } from 'react';

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
            className={
                `block text-sm font-medium text-stone-700 mb-1.5 ${className}`
            }
        >
            {value ? value : children}
            {required && <span className="ml-1 text-red-500">*</span>}
        </label>
    );
}
