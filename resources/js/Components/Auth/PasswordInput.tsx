import {
    forwardRef,
    InputHTMLAttributes,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';

export interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
    isFocused?: boolean;
    hasError?: boolean;
}

export default forwardRef(function PasswordInput(
    {
        className = '',
        isFocused = false,
        hasError = false,
        ...props
    }: PasswordInputProps,
    ref,
) {
    const [showPassword, setShowPassword] = useState(false);
    const localRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <div className="relative w-full">
            <input
                {...props}
                ref={localRef}
                type={showPassword ? 'text' : 'password'}
                className={`block w-full rounded-xl border bg-white px-4 py-3 pr-11 text-sm text-stone-900 placeholder:text-stone-400 transition-all duration-150 ${
                    hasError
                        ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border-stone-200 hover:border-stone-300 focus:border-[#0F3D30] focus:ring-4 focus:ring-[#0F3D30]/10'
                } focus:outline-none ${className}`}
            />
            <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-stone-400 hover:text-stone-600 focus:outline-none transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
            >
                {showPassword ? (
                    // Eye off icon
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4.5 w-4.5"
                    >
                        <path
                            fillRule="evenodd"
                            d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.636 1.636a2.5 2.5 0 013.286 3.286l1.636 1.636a4 4 0 00-5.058-5.058h-.001L7.752 6.69z"
                            clipRule="evenodd"
                        />
                        <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.272.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                    </svg>
                ) : (
                    // Eye icon
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4.5 w-4.5"
                    >
                        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        <path
                            fillRule="evenodd"
                            d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                )}
            </button>
        </div>
    );
});
