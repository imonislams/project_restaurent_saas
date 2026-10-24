import AuthSplitLayout from '@/Components/Auth/AuthSplitLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useT } from '@/i18n';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const t = useT();
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <AuthSplitLayout
            variant="forgot"
            heroBadge="ACCOUNT SECURITY"
            heroHeadline="Secure access to your restaurant."
            heroSubheadline="Reset your credentials with encrypted verification links to keep your dining operations protected."
            headerAction={
                <Link
                    href={route('login')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-container transition-colors"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-3 w-3"
                    >
                        <path
                            fillRule="evenodd"
                            d="M9.78 3.22a.75.75 0 010 1.06L5.56 8.56l4.22 4.22a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span>{t('auth.back_to_login')}</span>
                </Link>
            }
        >
            <Head title="Forgot Password" />

            {/* Form Header */}
            <div className="mb-8">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Password Recovery</span>
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
                    {t('auth.reset_password')}
                </h1>
                <p className="mt-2 text-sm text-stone-500 leading-relaxed">
                    {t('auth.reset_subtitle')}
                </p>
            </div>

            {/* Status Alert Banner */}
            {status && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-900 shadow-sm">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5"
                    >
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <div className="font-medium leading-relaxed">{status}</div>
                </div>
            )}

            {/* Form */}
            <form onSubmit={submit} className="space-y-5" noValidate>
                <div>
                    <InputLabel htmlFor="email" value={t('auth.work_email')} required />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="w-full"
                        isFocused={true}
                        placeholder={t('auth.email_placeholder')}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />

                    <InputError message={errors.email} />
                </div>

                <div className="pt-2">
                    <PrimaryButton
                        className="w-full justify-center text-sm py-3 font-semibold shadow-md"
                        disabled={processing}
                    >
                        <span>{processing ? 'Sending link…' : t('auth.send_reset_link')}</span>
                    </PrimaryButton>
                </div>
            </form>

            {/* Back Link */}
            <div className="mt-8 text-center">
                <Link
                    href={route('login')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-container transition-colors"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                    >
                        <path
                            fillRule="evenodd"
                            d="M14 8a.75.75 0 01-.75.75H4.56l3.22 3.22a.75.75 0 11-1.06 1.06l-4.5-4.5a.75.75 0 010-1.06l4.5-4.5a.75.75 0 011.06 1.06L4.56 7.25h8.69A.75.75 0 0114 8z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span>{t('auth.back_to_login')}</span>
                </Link>
            </div>
        </AuthSplitLayout>
    );
}
