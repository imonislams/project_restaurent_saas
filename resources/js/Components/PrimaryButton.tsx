import { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center justify-center rounded-xl border border-transparent bg-[#0B271F] px-5 py-3 text-sm font-semibold tracking-wide text-white shadow-sm transition-all duration-150 ease-in-out hover:bg-[#134A38] hover:shadow focus:bg-[#0B271F] focus:outline-none focus:ring-4 focus:ring-[#0B271F]/15 active:bg-[#071F18] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none ${className}`
            }
            disabled={disabled}
        >
            {disabled && (
                <svg
                    className="-ml-1 mr-2.5 h-4 w-4 animate-spin text-white/80"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            )}
            {children}
        </button>
    );
}
