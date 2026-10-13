import { Button, FormSection } from '@/Components/ui';
import { router, useForm, usePage } from '@inertiajs/react';
import { ChangeEvent, useRef, useState } from 'react';

/**
 * Upload / replace / remove the restaurant logo. Shown in the admin shell, the
 * customer QR experience and printed receipts.
 */
export default function LogoUploader() {
    const { tenant } = usePage().props as Record<string, any>;
    const [preview, setPreview] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const form = useForm<{ logo: File | null }>({ logo: null });

    const pick = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        form.setData('logo', file);
        setPreview(file ? URL.createObjectURL(file) : null);
    };

    const submit = () => {
        form.post(route('settings.logo.update'), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setPreview(null);
                if (inputRef.current) inputRef.current.value = '';
            },
        });
    };

    const remove = () => router.delete(route('settings.logo.destroy'), { preserveScroll: true });

    const shown = preview ?? tenant?.logo_url ?? null;

    return (
        <FormSection title="Restaurant logo" description="PNG, JPG or WebP up to 2 MB. Used across the admin and the customer ordering screens.">
            <div className="flex flex-wrap items-center gap-4">
                {shown ? (
                    <img src={shown} alt="Restaurant logo" className="h-16 w-16 rounded-xl object-cover shadow-subtle ring-1 ring-gray-200" />
                ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-xs font-semibold text-gray-400">
                        No logo
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={pick}
                        className="block text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
                    />
                    <Button type="button" size="sm" onClick={submit} loading={form.processing} disabled={!form.data.logo}>
                        Upload
                    </Button>
                    {tenant?.logo_url && !preview && (
                        <Button type="button" size="sm" variant="ghost" onClick={remove}>
                            Remove
                        </Button>
                    )}
                </div>

                {form.errors.logo && <p className="w-full text-sm text-red-600">{form.errors.logo}</p>}
            </div>
        </FormSection>
    );
}
