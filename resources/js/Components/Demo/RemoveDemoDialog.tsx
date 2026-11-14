import ConfirmDialog from '@/Components/ui/ConfirmDialog';
import { useT } from '@/i18n';
import { useEffect, useState } from 'react';

export interface DemoRemovalSummary {
    groups: Record<string, number>;
    remove: number;
}

/** Bundles that can be kept; the settings flag has no record count. */
const BUNDLES = ['menu', 'floor', 'team', 'guests', 'settings'] as const;

/** The setup most owners want to reuse after removing the demo activity. */
const DEFAULT_KEEP: string[] = ['menu', 'floor'];

/**
 * Removal dialog: choose which setup bundles to keep, see the activity that is
 * always removed, then confirm by typing the workspace slug.
 */
export default function RemoveDemoDialog({
    show,
    summary,
    slug,
    processing,
    error,
    onConfirm,
    onClose,
}: {
    show: boolean;
    summary: DemoRemovalSummary;
    slug: string;
    processing: boolean;
    error?: string;
    onConfirm: (payload: { keep: string[]; confirm: string }) => void;
    onClose: () => void;
}) {
    const t = useT();
    const [keep, setKeep] = useState<string[]>(DEFAULT_KEEP);
    const [typed, setTyped] = useState('');

    useEffect(() => {
        if (show) {
            setKeep(DEFAULT_KEEP);
            setTyped('');
        }
    }, [show]);

    const toggle = (key: string) =>
        setKeep((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));

    return (
        <ConfirmDialog
            show={show}
            title={t('demo.remove_title')}
            description={t('demo.remove_body')}
            confirmLabel={t('demo.remove_confirm')}
            cancelLabel={t('demo.cancel')}
            tone="danger"
            processing={processing}
            requireText={slug}
            typedPrompt={t('demo.remove_typed_prompt', { slug })}
            typedText={typed}
            onTypedTextChange={setTyped}
            onConfirm={() => onConfirm({ keep, confirm: typed })}
            onClose={onClose}
        >
            <div className="space-y-3">
                <div>
                    <p className="text-xs font-semibold text-foreground">{t('demo.keep_title')}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('demo.keep_hint')}</p>
                </div>

                <div className="space-y-2">
                    {BUNDLES.map((key) => (
                        <label
                            key={key}
                            className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-background px-3 py-2"
                        >
                            <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring"
                                checked={keep.includes(key)}
                                onChange={() => toggle(key)}
                            />
                            <span className="min-w-0">
                                <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                    {t(`demo.bundle.${key}`)}
                                    {key !== 'settings' && (
                                        <span className="font-mono text-[11px] font-normal text-muted-foreground">
                                            {summary.groups[key] ?? 0}
                                        </span>
                                    )}
                                </span>
                                <span className="block text-xs leading-relaxed text-muted-foreground">
                                    {t(`demo.bundle.${key}_hint`)}
                                </span>
                            </span>
                        </label>
                    ))}
                </div>

                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                    {t('demo.always_removed_hint', { count: summary.remove })}
                </p>

                {error && <p className="text-xs font-medium text-destructive">{error}</p>}
            </div>
        </ConfirmDialog>
    );
}
