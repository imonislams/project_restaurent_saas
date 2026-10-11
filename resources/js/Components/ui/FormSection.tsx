import { ReactNode } from 'react';
import { cn } from './cn';

/**
 * Titled card section used by the settings hub and onboarding steps.
 */
export default function FormSection({ title, description, children, className }: { title?: ReactNode; description?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={cn('rounded-xl border border-gray-200 bg-white p-5', className)}>
            {(title || description) && (
                <div className="mb-4 border-b border-gray-100 pb-3">
                    {title && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
                    {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
                </div>
            )}
            <div className="space-y-4">{children}</div>
        </section>
    );
}
