import { FormSection, SelectField, TextField } from '@/Components/ui';
import { useT } from '@/i18n';
import type { FieldProps } from './types';

export default function BillingFields({ data, setData, errors, options }: FieldProps) {
    const t = useT();

    return (
        <FormSection title={t('settings.billing_section')} description={t('settings.billing_hint')}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label={t('settings.billing_name')} value={data.billing_name ?? ''} error={errors.billing_name} onChange={(v) => setData('billing_name', v)} />
                <TextField label={t('settings.billing_email')} type="email" value={data.billing_email ?? ''} error={errors.billing_email} onChange={(v) => setData('billing_email', v)} />
                <SelectField
                    label={t('settings.billing_country')}
                    value={String(data.billing_country ?? '')}
                    options={[{ value: '', label: '—' }, ...options.countries]}
                    error={errors.billing_country}
                    hint={t('settings.billing_country_hint')}
                    onChange={(v) => setData('billing_country', v)}
                />
                <SelectField
                    label={t('settings.billing_currency')}
                    value={String(data.billing_currency ?? '')}
                    options={[{ value: '', label: '—' }, ...options.currencies]}
                    error={errors.billing_currency}
                    hint={t('settings.billing_currency_hint')}
                    onChange={(v) => setData('billing_currency', v)}
                />
                <TextField label={t('settings.billing_tax_id')} value={data.billing_tax_id ?? ''} error={errors.billing_tax_id} onChange={(v) => setData('billing_tax_id', v)} />
                <TextField label={t('settings.billing_address')} value={data.billing_address ?? ''} error={errors.billing_address} onChange={(v) => setData('billing_address', v)} />
                <div className="grid grid-cols-2 gap-4">
                    <TextField label={t('settings.billing_city')} value={data.billing_city ?? ''} error={errors.billing_city} onChange={(v) => setData('billing_city', v)} />
                    <TextField label={t('settings.billing_postal_code')} value={data.billing_postal_code ?? ''} error={errors.billing_postal_code} onChange={(v) => setData('billing_postal_code', v)} />
                </div>
            </div>
        </FormSection>
    );
}
