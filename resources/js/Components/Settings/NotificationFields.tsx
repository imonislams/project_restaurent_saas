import { CheckboxField, FormSection, TextField } from '@/Components/ui';
import { useT } from '@/i18n';
import type { FieldProps } from './types';

export default function NotificationFields({ data, setData, errors }: FieldProps) {
    const t = useT();

    return (
        <>
            <FormSection title="Alerts" description="Get notified before you run out of stock.">
                <TextField label={t('settings.low_stock')} type="number" value={String(data.low_stock_threshold ?? 0)} error={errors.low_stock_threshold} onChange={(v) => setData('low_stock_threshold', v)} />
            </FormSection>

            <FormSection title="Loyalty" description="Reward repeat customers with points they can redeem.">
                <CheckboxField label={t('settings.loyalty_enabled')} checked={Boolean(data.loyalty_enabled)} onChange={(v) => setData('loyalty_enabled', v)} />
                <TextField label={t('settings.loyalty_rate')} type="number" value={String(data.loyalty_points_per_currency ?? 1)} error={errors.loyalty_points_per_currency} onChange={(v) => setData('loyalty_points_per_currency', v)} />
            </FormSection>
        </>
    );
}
