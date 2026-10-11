import { FormSection, SelectField, TextField } from '@/Components/ui';
import { useT } from '@/i18n';
import type { FieldProps } from './types';

export default function CompanyFields({ data, setData, errors, options }: FieldProps) {
    const t = useT();

    return (
        <>
            <FormSection title={t('settings.company_section')} description={t('settings.company_hint')}>
                <TextField label={t('settings.legal_name')} value={data.legal_name ?? ''} error={errors.legal_name} onChange={(v) => setData('legal_name', v)} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField label={t('settings.phone')} value={data.phone ?? ''} error={errors.phone} onChange={(v) => setData('phone', v)} />
                    <TextField label={t('settings.email')} type="email" value={data.email ?? ''} error={errors.email} onChange={(v) => setData('email', v)} />
                    <TextField label={t('settings.tax_id')} value={data.tax_id ?? ''} error={errors.tax_id} onChange={(v) => setData('tax_id', v)} />
                    <TextField label={t('settings.address')} value={data.address ?? ''} error={errors.address} onChange={(v) => setData('address', v)} />
                </div>
            </FormSection>

            <FormSection title={t('settings.region_section')} description={t('settings.region_hint')}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <SelectField label={t('settings.country')} value={String(data.country ?? '')} options={options.countries} error={errors.country} onChange={(v) => setData('country', v)} />
                    <SelectField label={t('settings.currency')} value={String(data.currency ?? '')} options={options.currencies} error={errors.currency} onChange={(v) => setData('currency', v)} />
                    <SelectField label={t('settings.timezone')} value={String(data.timezone ?? '')} options={options.timezones} error={errors.timezone} onChange={(v) => setData('timezone', v)} />
                </div>
            </FormSection>
        </>
    );
}
