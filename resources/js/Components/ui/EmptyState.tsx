import { ReactNode } from 'react';

export default function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            {icon && <div className="mb-3 text-gray-300">{icon}</div>}
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            {description && <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
