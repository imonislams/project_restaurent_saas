import AuthSplitLayout from '@/Components/Auth/AuthSplitLayout';
import PasswordInput from '@/Components/Auth/PasswordInput';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useT } from '@/i18n';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const t = useT();
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthSplitLayout
            variant="login"
            heroBadge="RESTAURANT OPERATING SYSTEM"
            heroHeadline="Your restaurant. Running smarter."
            heroSubheadline="Manage your restaurant operations, simplify daily workflows, and keep your team connected from one place."
            headerAction={
                <Link
                    href={route('register')}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-container transition-colors"
                >
                    <span>{t('auth.create_one')}</span>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-3 w-3"
                    >
                        <path
                            fillRule="evenodd"
                            d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"
                            clipRule="evenodd"
                        />
                    </svg>
                </Link>
            }
        >
            <Head title={t('auth.login')} />

            {/* Form Header */}
            <div className="mb-8">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2.5 py-1 text-[13px] font-semibold uppercase tracking-wider text-stone-600 mb-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Workspace Access</span>
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
                    {t('auth.welcome_back')}
                </h1>
                <p className="mt-2 text-[15px] text-stone-600 leading-relaxed">
                    {t('auth.signin_to_workspace')}
                </p>
            </div>

            {/* Status Alert Banner (e.g. Password reset link sent) */}
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
                {/* Work Email Field */}
                <div>
                    <InputLabel htmlFor="email" value={t('auth.work_email')} required />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="w-full"
                        autoComplete="username"
                        placeholder={t('auth.email_placeholder')}
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />

                    <InputError message={errors.email} />
                </div>

                {/* Password Field */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <InputLabel
                            htmlFor="password"
                            value={t('auth.password')}
                            className="!mb-0"
                            required
                        />

                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-sm font-medium text-primary hover:text-primary-container hover:underline transition-colors focus:outline-none focus:underline"
                            >
                                {t('auth.forgot')}
                            </Link>
                        )}
                    </div>

                    <PasswordInput
                        id="password"
                        name="password"
                        value={data.password}
                        autoComplete="current-password"
                        placeholder={t('auth.password_placeholder')}
                        hasError={Boolean(errors.password)}
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />

                    <InputError message={errors.password} />
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center select-none cursor-pointer">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData(
                                    'remember',
                                    (e.target.checked || false) as false,
                                )
                            }
                        />
                        <span className="ms-2.5 text-sm font-medium text-stone-600">
                            {t('auth.remember')}
                        </span>
                    </label>
                </div>

                {/* Sign In Primary CTA */}
                <div className="pt-2">
                    <PrimaryButton
                        className="w-full justify-center text-sm py-3 font-semibold shadow-md"
                        disabled={processing}
                    >
                        <span>{processing ? 'Signing in…' : t('auth.login')}</span>
                        {!processing && (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="ml-2 h-4 w-4"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        )}
                    </PrimaryButton>
                </div>
            </form>

            {/* New to Touch Dine Registration Callout */}
            <div className="mt-8 rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 text-center">
                <p className="text-sm text-stone-600">
                    <span>{t('auth.new_to_touchdine')} </span>
                    <Link
                        href={route('register')}
                        className="font-semibold text-primary hover:text-primary-container hover:underline transition-colors"
                    >
                        {t('auth.create_one')}
                    </Link>
                </p>
                <p className="mt-1 text-[13px] text-stone-400">
                    14-day free trial • Set up your restaurant in under 2 minutes
                </p>
            </div>
        </AuthSplitLayout>
    );
}
