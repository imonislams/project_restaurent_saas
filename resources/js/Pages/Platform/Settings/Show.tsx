import { Button, Card, CardBody, CardHeader } from '@/Components/ui';
import { Input } from '@/Components/ui/Input';
import { Textarea } from '@/Components/ui/Textarea';
import { Label } from '@/Components/ui/Label';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Save } from 'lucide-react';

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
                <CardHeader 
                    title={schema.label} 
                    description={schema.description} 
                    action={
                        <Button size="sm" loading={form.processing} onClick={submit}>
                            <Save className="mr-1.5 h-3.5 w-3.5" />
                            Save
                        </Button>
                    } 
                />
                <CardBody>
                    <form onSubmit={submit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {schema.fields.map((field) => (
                            <div key={field.name} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                                {field.type === 'boolean' ? (
                                    <label className="flex items-center gap-2.5 rounded-lg border border-border p-3 text-sm cursor-pointer select-none transition hover:bg-muted/40">
                                        <input 
                                            type="checkbox" 
                                            checked={Boolean(form.data.values[field.name])} 
                                            onChange={(e) => set(field.name, e.target.checked)} 
                                            className="h-4 w-4 rounded border-input text-primary shadow-2xs focus-visible:ring-1 focus-visible:ring-ring" 
                                        />
                                        <span className="font-medium text-foreground">{field.label}</span>
                                    </label>
                                ) : (
                                    <div className="space-y-1.5">
                                        <Label htmlFor={`field-${field.name}`} className="text-xs font-medium text-muted-foreground">{field.label}</Label>
                                        {field.type === 'select' ? (
                                            <select 
                                                id={`field-${field.name}`}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                                                value={String(form.data.values[field.name] ?? '')} 
                                                onChange={(e) => set(field.name, e.target.value)}
                                            >
                                                <option value="">—</option>
                                                {(field.options ?? []).map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        ) : field.type === 'textarea' ? (
                                            <Textarea 
                                                id={`field-${field.name}`}
                                                rows={3} 
                                                value={String(form.data.values[field.name] ?? '')} 
                                                onChange={(e) => set(field.name, e.target.value)} 
                                            />
                                        ) : (
                                            <Input 
                                                id={`field-${field.name}`}
                                                type={field.type === 'number' ? 'number' : field.type} 
                                                value={String(form.data.values[field.name] ?? '')} 
                                                onChange={(e) => set(field.name, e.target.value)} 
                                            />
                                        )}
                                    </div>
                                )}
                                {field.hint && <p className="mt-1 text-xs text-muted-foreground">{field.hint}</p>}
                                {errors[`values.${field.name}`] && <p className="mt-1 text-xs text-destructive">{errors[`values.${field.name}`]}</p>}
                            </div>
                        ))}
                        <div className="sm:col-span-2 pt-2">
                            <Button type="submit" size="sm" loading={form.processing}>
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                                Save settings
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
            <p className="mt-3 text-xs text-muted-foreground">Sensitive credentials are never stored here — they live in the gateway and email provider configuration.</p>
        </PlatformLayout>
    );
}
