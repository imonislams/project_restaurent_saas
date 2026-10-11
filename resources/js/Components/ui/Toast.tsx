import { usePage } from '@inertiajs/react';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';
import { cn } from './cn';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    tone: ToastTone;
    message: string;
}

const ToastContext = createContext<{ push: (tone: ToastTone, message: string) => void }>({ push: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: PropsWithChildren) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const page = usePage();

    const push = useCallback((tone: ToastTone, message: string) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, tone, message }]);
        window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    }, []);

    const dismiss = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const flash = (page.props as Record<string, any>).flash as { success?: string; error?: string } | undefined;

    useEffect(() => {
        if (flash?.success) push('success', flash.success);
        if (flash?.error) push('error', flash.error);
    }, [flash?.success, flash?.error, push]);

    return (
        <ToastContext.Provider value={{ push }}>
            {children}
            <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-88 max-w-full flex-col gap-2.5 p-2 sm:p-0" aria-live="polite">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        role="status"
                        className={cn(
                            'pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 text-sm shadow-elevated transition-all duration-200 animate-in fade-in slide-in-from-bottom-2',
                            t.tone === 'success'
                                ? 'border-emerald-200 bg-white text-gray-900 ring-1 ring-emerald-500/20'
                                : t.tone === 'error'
                                  ? 'border-red-200 bg-white text-gray-900 ring-1 ring-red-500/20'
                                  : 'border-gray-200 bg-white text-gray-900 ring-1 ring-gray-900/5',
                        )}
                    >
                        <span
                            className={cn(
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                                t.tone === 'success' ? 'bg-emerald-600' : t.tone === 'error' ? 'bg-red-600' : 'bg-restrly-600',
                            )}
                        >
                            {t.tone === 'success' ? '✓' : t.tone === 'error' ? '!' : 'i'}
                        </span>
                        <div className="flex-1 text-xs font-medium text-gray-800 leading-relaxed">{t.message}</div>
                        <button
                            type="button"
                            onClick={() => dismiss(t.id)}
                            className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            aria-label="Close notification"
                        >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
