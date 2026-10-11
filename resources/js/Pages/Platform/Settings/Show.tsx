import { Button, Card, CardBody, CardHeader } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

interface Field {
    name: string;
    setting: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'boolean' | 'select' | 'textarea';
    default?: unknown;
    hint?: string;
    options?: { value: string; label: string }[];
}

interface Schema {
    label: string;
    description: string;
    fields: Field[];
}

const input = 'block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-400 focus:ring-indigo-400';

export default function SettingsShow({ group, schema, values }: { group: string; schema: Schema; values: Record<string, unknown> }) {
    const normalised: Record<string, any> = {};
    schema.fields.forEach((field) => {
        normalised[field.name] = field.type === 'boolean' ? Boolean(values[field.name]) : (values[field.name] ?? '');
    });

    const form = useForm<{ values: Record<string, any> }>({ values: normalised });
    const errors = form.errors as Record<string, string>;

    const set = (name: string, value: any) => form.setData('values', { ...form.data.values, [name]: value });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('platform.settings.update', group), { preserveScroll: true });
    };

    return (
        <PlatformLayout title={schema.label} description={schema.description}>
            <Card>
                <CardHeader title={schema.label} description={schema.description} action={<Button size="sm" loading={form.processing} onClick={submit}>Save</Button>} />
                <CardBody>
                    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {schema.fields.map((field) => (
                            <div key={field.name} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                                {field.type === 'boolean' ? (
                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                        <input type="checkbox" checked={Boolean(form.data.values[field.name])} onChange={(e) => set(field.name, e.target.checked)} className="rounded border-gray-300" />
                                        {field.label}
                                    </label>
                                ) : (
                                    <>
                                        <span className="mb-1 block text-xs font-medium text-gray-500">{field.label}</span>
                                        {field.type === 'select' ? (
                                            <select className={input} value={String(form.data.values[field.name] ?? '')} onChange={(e) => set(field.name, e.target.value)}>
                                                <option value="">—</option>
                                                {(field.options ?? []).map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        ) : field.type === 'textarea' ? (
                                            <textarea className={input} rows={3} value={String(form.data.values[field.name] ?? '')} onChange={(e) => set(field.name, e.target.value)} />
                                        ) : (
                                            <input type={field.type === 'number' ? 'number' : field.type} className={input} value={String(form.data.values[field.name] ?? '')} onChange={(e) => set(field.name, e.target.value)} />
                                        )}
                                    </>
                                )}
                                {field.hint && <p className="mt-1 text-xs text-gray-400">{field.hint}</p>}
                                {errors[`values.${field.name}`] && <p className="mt-1 text-xs text-red-600">{errors[`values.${field.name}`]}</p>}
                            </div>
                        ))}
                        <div className="sm:col-span-2">
                            <Button type="submit" size="sm" loading={form.processing}>Save settings</Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
            <p className="mt-3 text-xs text-gray-400">Sensitive credentials are never stored here — they live in the gateway and email provider configuration.</p>
        </PlatformLayout>
    );
}
