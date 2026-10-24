import { SelectHTMLAttributes } from 'react';

export default function SelectInput({
    className = '',
    children,
    ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className={
                'block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary ' +
                className
            }
        >
            {children}
        </select>
    );
}
