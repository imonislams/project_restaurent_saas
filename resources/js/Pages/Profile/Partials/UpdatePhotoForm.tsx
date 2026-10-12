import { Button } from '@/Components/ui';
import { router, useForm, usePage } from '@inertiajs/react';
import { ChangeEvent, FormEventHandler, useRef, useState } from 'react';

/**
 * Upload / replace / remove the signed-in user's profile photo.
 */
export default function UpdatePhotoForm({ className }: { className?: string }) {
    const { auth } = usePage().props as Record<string, any>;
    const user = auth?.user ?? {};
    const [preview, setPreview] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const form = useForm<{ photo: File | null }>({ photo: null });

    const pick = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        form.setData('photo', file);
        setPreview(file ? URL.createObjectURL(file) : null);
    };

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        form.post(route('profile.photo.update'), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setPreview(null);
                if (inputRef.current) inputRef.current.value = '';
            },
        });
    };

    const remove = () => {
        router.delete(route('profile.photo.destroy'), { preserveScroll: true });
    };

    const shown = preview ?? user.avatar_url ?? null;

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900">Profile photo</h2>
                <p className="mt-1 text-sm text-gray-600">A photo helps your team recognise you in the POS and kitchen.</p>
            </header>

            <form onSubmit={submit} className="mt-6 flex flex-wrap items-center gap-4">
                {shown ? (
                    <img src={shown} alt="Profile photo" className="h-16 w-16 rounded-full object-cover shadow-subtle" />
                ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-restrly-600 text-xl font-bold text-white shadow-subtle">
                        {(user.name ?? 'U').slice(0, 1).toUpperCase()}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={pick}
                        className="block text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-restrly-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-restrly-700 hover:file:bg-restrly-100"
                    />
                    <Button type="submit" size="sm" loading={form.processing} disabled={!form.data.photo}>
                        Upload
                    </Button>
                    {user.avatar_url && !preview && (
                        <Button type="button" size="sm" variant="ghost" onClick={remove}>
                            Remove
                        </Button>
                    )}
                </div>

                {form.errors.photo && <p className="w-full text-sm text-red-600">{form.errors.photo}</p>}
                <p className="w-full text-xs text-gray-400">JPG, PNG or WebP up to 2 MB.</p>
            </form>
        </section>
    );
}
