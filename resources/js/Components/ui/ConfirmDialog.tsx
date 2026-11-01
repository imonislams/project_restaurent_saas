import Modal from '@/Components/Modal';
import { ReactNode, useEffect, useState } from 'react';
import Button from './Button';
import Input from './Input';

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
    typedPrompt,
    typedText,
    onTypedTextChange,
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
    /** Optional translated label for the typed confirmation input. */
    typedPrompt?: string;
    /** Optional controlled value for the typed confirmation. */
    typedText?: string;
    onTypedTextChange?: (value: string) => void;
    onConfirm: () => void;
    onClose: () => void;
    children?: ReactNode;
}) {
    const [internalTyped, setInternalTyped] = useState('');
    const typed = typedText ?? internalTyped;
    const setTyped = onTypedTextChange ?? setInternalTyped;

    useEffect(() => {
        if (show && typedText === undefined) setInternalTyped('');
    }, [show, typedText]);

    const blocked = requireText ? typed !== requireText : false;

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="p-6">
                <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
                {description && <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{description}</p>}
                {children && <div className="mt-3.5">{children}</div>}
                {requireText && (
                    <div className="mt-4 space-y-1.5">
                        <label className="text-xs text-muted-foreground">
                            {typedPrompt ?? (
                                <>
                                    Type <span className="font-mono font-semibold text-foreground">{requireText}</span> to confirm:
                                </>
                            )}
                        </label>
                        <Input
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            placeholder={requireText}
                            className="font-mono"
                        />
                    </div>
                )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/20 px-6 py-3.5">
                <Button variant="secondary" size="sm" onClick={onClose} disabled={processing}>
                    {cancelLabel}
                </Button>
                <Button
                    variant={tone === 'danger' ? 'destructive' : 'primary'}
                    size="sm"
                    onClick={onConfirm}
                    disabled={blocked}
                    loading={processing}
                >
                    {confirmLabel}
                </Button>
            </div>
        </Modal>
    );
}
