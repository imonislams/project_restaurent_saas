import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function AcceptInvitation({
    token,
    invitation,
    valid,
}: {
    token: string;
    invitation: { email: string; name: string | null; restaurant: string | null };
    valid: boolean;
}) {
    const { data, setData, post, processing, errors } = useForm({
        name: invitation.name ?? '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('invitations.accept', token));
    };

    return (
        <GuestLayout>
            <Head title="Accept invitation" />

            <h1 className="text-lg font-semibold text-gray-900">
                Join {invitation.restaurant ?? 'the team'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
                You were invited as <strong>{invitation.email}</strong>.
            </p>

            {!valid ? (
                <div className="mt-6 space-y-4">
                    <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        This invitation is no longer valid. It may have been
                        accepted already or has expired.
                    </div>
                    <Link
                        href={route('login')}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                        Back to sign in
                    </Link>
                </div>
            ) : (
                <form onSubmit={submit} className="mt-6 space-y-4">
                    <div>
                        <InputLabel htmlFor="name" value="Your name" />
                        <TextInput
                            id="name"
                            className="mt-1 block w-full"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            autoFocus
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password" value="Password" />
                        <TextInput
                            id="password"
                            type="password"
                            className="mt-1 block w-full"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel
                            htmlFor="password_confirmation"
                            value="Confirm password"
                        />
                        <TextInput
                            id="password_confirmation"
                            type="password"
                            className="mt-1 block w-full"
                            value={data.password_confirmation}
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            autoComplete="new-password"
                            required
                        />
                    </div>

                    <div className="flex justify-end">
                        <PrimaryButton disabled={processing}>
                            Activate account
                        </PrimaryButton>
                    </div>
                </form>
            )}
        </GuestLayout>
    );
}
