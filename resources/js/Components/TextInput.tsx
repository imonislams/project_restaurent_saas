import {
    forwardRef,
    InputHTMLAttributes,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react';

export default forwardRef(function TextInput(
    {
        type = 'text',
        className = '',
        isFocused = false,
        ...props
    }: InputHTMLAttributes<HTMLInputElement> & { isFocused?: boolean },
    ref,
) {
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
        <input
            {...props}
            type={type}
            className={
                'rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-none transition-all duration-150 placeholder:text-stone-400 hover:border-stone-300 focus:border-[#0F3D30] focus:outline-none focus:ring-4 focus:ring-[#0F3D30]/10 ' +
                className
            }
            ref={localRef}
        />
    );
});
