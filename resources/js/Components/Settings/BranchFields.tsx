import { CheckboxField, FormSection, SelectField, TextField } from '@/Components/ui';
import { useT } from '@/i18n';
import type { FieldProps } from './types';

export default function BranchFields({ data, setData, errors, options }: FieldProps) {
    const t = useT();
    const selected: string[] = data.service_types ?? [];

    const toggle = (value: string) => {
        setData('service_types', selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    };

    return (
        <FormSection title={t('settings.tab.branches')} description="Primary location details used across the POS, receipts and reports.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label={t('settings.branch_name')} value={data.name ?? ''} error={errors.name} onChange={(v) => setData('name', v)} />
                <TextField label={t('settings.branch_code')} value={data.code ?? ''} error={errors.code} onChange={(v) => setData('code', v)} />
                <TextField label={t('settings.address')} value={data.address ?? ''} error={errors.address} onChange={(v) => setData('address', v)} />
                <TextField label={t('settings.phone')} value={data.phone ?? ''} error={errors.phone} onChange={(v) => setData('phone', v)} />
                <SelectField label={t('settings.timezone')} value={String(data.timezone ?? '')} options={[{ value: '', label: 'Use company default' }, ...options.timezones]} error={errors.timezone} onChange={(v) => setData('timezone', v)} />
                <SelectField label={t('settings.currency')} value={String(data.currency ?? '')} options={[{ value: '', label: 'Use company default' }, ...options.currencies]} error={errors.currency} onChange={(v) => setData('currency', v)} />
            </div>

            <div>
                <span className="mb-1.5 block text-xs font-medium text-gray-600">{t('settings.service_types')}</span>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {options.service_types.map((service) => (
                        <label key={service.value} className={'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ' + (selected.includes(service.value) ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-700')}>
                            <input type="checkbox" className="rounded border-gray-300 text-indigo-600" checked={selected.includes(service.value)} onChange={() => toggle(service.value)} />
                            {service.label}
                        </label>
                    ))}
                </div>
                {errors.service_types && <span className="mt-1 block text-xs text-red-600">{errors.service_types}</span>}
            </div>
        </FormSection>
    );
}
