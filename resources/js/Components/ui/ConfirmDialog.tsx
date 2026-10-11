import Modal from '@/Components/Modal';
import { ReactNode, useEffect, useState } from 'react';
import Button from './Button';

/**
 * Confirmation dialog for destructive/sensitive actions. For high-risk actions
 * (restore, purge) pass `requireText` to force a typed confirmation.
 */
export default function ConfirmDialog({
    show,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'danger',
    processing = false,
    requireText,
    onConfirm,
    onClose,
    children,
}: {
    show: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'danger' | 'primary';
    processing?: boolean;
    requireText?: string;
    onConfirm: () => void;
    onClose: () => void;
    children?: ReactNode;
}) {
    const [typed, setTyped] = useState('');

    useEffect(() => {
        if (show) setTyped('');
    }, [show]);

    const blocked = requireText ? typed !== requireText : false;

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="px-5 py-4">
                <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
                {children && <div className="mt-3">{children}</div>}
                {requireText && (
                    <div className="mt-4">
                        <label className="text-xs text-gray-500">
                            Type <span className="font-mono font-semibold text-gray-800">{requireText}</span> to confirm
                        </label>
                        <input
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                        />
                    </div>
                )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
                <Button variant="secondary" onClick={onClose} disabled={processing}>
                    {cancelLabel}
                </Button>
                <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={blocked} loading={processing}>
                    {confirmLabel}
                </Button>
            </div>
        </Modal>
    );
}
