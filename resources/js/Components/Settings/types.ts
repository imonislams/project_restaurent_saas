import type { FieldOption } from '@/Components/ui';

export interface SettingsOptions {
    countries: FieldOption[];
    currencies: FieldOption[];
    timezones: FieldOption[];
    service_types: FieldOption[];
}

export interface FieldProps {
    data: Record<string, any>;
    setData: (key: string, value: any) => void;
    errors: Partial<Record<string, string>>;
    options: SettingsOptions;
}

/** Normalise number-ish inputs: '' → null so validation treats it as "unset". */
export function numberOrEmpty(value: string): number | '' {
    return value === '' ? '' : Number(value);
}
