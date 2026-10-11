import { InputHTMLAttributes } from 'react';

export default function Checkbox({
    className = '',
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'h-4 w-4 rounded border-stone-300 text-[#0F3D30] transition duration-150 focus:ring-[#0F3D30]/20 focus:ring-offset-0 ' +
                className
            }
        />
    );
}
