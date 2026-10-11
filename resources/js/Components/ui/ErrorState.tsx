import Button from './Button';

export default function ErrorState({ title = 'Something went wrong', description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
    return (
        <div role="alert" className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center">
            <h3 className="text-sm font-semibold text-red-800">{title}</h3>
            {description && <p className="mt-1 max-w-md text-sm text-red-700">{description}</p>}
            {onRetry && (
                <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
                    Try again
                </Button>
            )}
        </div>
    );
}
