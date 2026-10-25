import { CheckboxField, FormSection, SelectField, TextField } from '@/Components/ui';
import { useT } from '@/i18n';
import type { FieldProps } from './types';

export default function PosFields({ data, setData, errors }: FieldProps) {
    const t = useT();

    return (
        <>
            <FormSection title="POS behaviour" description="Defaults applied to every sale at the till.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <TextField label={t('settings.service_charge')} type="number" value={String(data.service_charge_rate ?? 0)} error={errors.service_charge_rate} onChange={(v) => setData('service_charge_rate', v)} />
                    <TextField label={t('settings.cash_variance')} type="number" value={data.pos_cash_variance_threshold ?? ''} error={errors.pos_cash_variance_threshold} onChange={(v) => setData('pos_cash_variance_threshold', v)} />
                    <TextField label={t('settings.discount_approval')} type="number" value={data.pos_discount_approval_percent ?? ''} error={errors.pos_discount_approval_percent} onChange={(v) => setData('pos_discount_approval_percent', v)} />
                </div>
                <CheckboxField label={t('settings.allow_partial')} checked={Boolean(data.pos_allow_partial)} onChange={(v) => setData('pos_allow_partial', v)} />
                <CheckboxField label={t('settings.require_table_dine_in')} hint={t('settings.require_table_dine_in_hint')} checked={data.pos_require_table_for_dine_in === undefined ? true : Boolean(data.pos_require_table_for_dine_in)} onChange={(v) => setData('pos_require_table_for_dine_in', v)} />
            </FormSection>

            <FormSection title="Payments" description="How you accept payment. Card and cash methods are managed per branch.">
                <SelectField
                    label={t('settings.payments_provider')}
                    value={String(data.payments_provider ?? 'manual')}
                    options={[
                        { value: 'manual', label: 'Manual (cash / card at the till)' },
                        { value: 'sslcommerz', label: 'SSLCommerz (online)' },
                    ]}
                    error={errors.payments_provider}
                    onChange={(v) => setData('payments_provider', v)}
                />
            </FormSection>
        </>
    );
}
