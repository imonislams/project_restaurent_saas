import { CheckboxField, FormSection, TextField } from '@/Components/ui';
import { useT } from '@/i18n';
import type { FieldProps } from './types';

export default function TaxFields({ data, setData, errors }: FieldProps) {
    const t = useT();

    return (
        <FormSection title={t('settings.tab.tax')} description="Applied to POS sales and shown on receipts and reports.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label={t('settings.tax_name')} value={data.tax_name ?? ''} error={errors.tax_name} onChange={(v) => setData('tax_name', v)} />
                <TextField label={t('settings.tax_rate')} type="number" value={String(data.tax_rate ?? 0)} error={errors.tax_rate} onChange={(v) => setData('tax_rate', v)} />
            </div>
            <CheckboxField label={t('settings.tax_inclusive')} hint={t('settings.tax_inclusive_hint')} checked={Boolean(data.tax_inclusive)} onChange={(v) => setData('tax_inclusive', v)} />
        </FormSection>
    );
}
