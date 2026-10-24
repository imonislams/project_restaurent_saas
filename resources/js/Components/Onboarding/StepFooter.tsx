import { Button } from '@/Components/ui';
import { useT } from '@/i18n';

export default function StepFooter({ processing, onSkip }: { processing: boolean; onSkip?: () => void }) {
    const t = useT();

    return (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
            {onSkip ? (
                <Button type="button" variant="ghost" onClick={onSkip}>
                    {t('onboarding.skip')}
                </Button>
            ) : (
                <span />
            )}
            <Button type="submit" loading={processing}>
                {t('onboarding.continue')}
            </Button>
        </div>
    );
}
