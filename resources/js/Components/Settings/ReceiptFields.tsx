import { CheckboxField, FormSection, TextField } from '@/Components/ui';
import { useT } from '@/i18n';
import type { FieldProps } from './types';

export default function ReceiptFields({ data, setData, errors }: FieldProps) {
    const t = useT();

    return (
        <FormSection title={t('settings.tab.receipt')} description="Printed on every customer receipt.">
            <TextField label={t('settings.receipt_header')} value={data.receipt_header ?? ''} error={errors.receipt_header} onChange={(v) => setData('receipt_header', v)} />
            <TextField label={t('settings.receipt_footer')} value={data.receipt_footer ?? ''} error={errors.receipt_footer} onChange={(v) => setData('receipt_footer', v)} />
            <div className="space-y-2">
                <CheckboxField label={t('settings.receipt_show_tax')} checked={Boolean(data.receipt_show_tax)} onChange={(v) => setData('receipt_show_tax', v)} />
                <CheckboxField label={t('settings.receipt_show_logo')} checked={Boolean(data.receipt_show_logo)} onChange={(v) => setData('receipt_show_logo', v)} />
            </div>
        </FormSection>
    );
}
