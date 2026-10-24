import AuthSplitLayout from '@/Components/Auth/AuthSplitLayout';
import PasswordInput from '@/Components/Auth/PasswordInput';
import PasswordStrengthMeter from '@/Components/Auth/PasswordStrengthMeter';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useT } from '@/i18n';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Register({ selectedPlan = null }: { selectedPlan?: { name: string; slug: string } | null }) {
    const t = useT();
    const { data, setData, post, processing, errors, reset } = useForm({
        plan: selectedPlan?.slug ?? '',
        identifier_type: 'email' as const,
        name: '',
        restaurant_name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const passwordsMatch =
        data.password_confirmation.length > 0 &&
        data.password === data.password_confirmation;

    return (
        <AuthSplitLayout
            variant="register"
            heroBadge="START FREE 14-DAY TRIAL"
            heroHeadline="Build a better way to run your restaurant."
            heroSubheadline="Bring your restaurant workflows together with a smarter, more organized workspace built for your business."
            headerAction={
                <Link
                    href={route('login')}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-container transition-colors"
                >
                    <span>{t('auth.signin_link')}</span>
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
            <Head title={t('auth.register')} />

            {/* Form Header */}
            <div className="mb-8">
                <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
                    {t('auth.create_account')}
                </h1>
                <p className="mt-2 text-[15px] text-stone-600 leading-relaxed">
                    {t('auth.create_account_subtitle')}
                </p>

                {/* Journey: three clear stages */}
                <ol className="mt-6 flex items-start" aria-label="Sign-up steps">
                    {[
                        { label: 'Create account', hint: 'Takes 1 minute' },
                        { label: 'Verify', hint: 'Email link' },
                        { label: 'Set up restaurant', hint: 'Menu, tables, team' },
                    ].map((stage, i, all) => (
                        <li key={stage.label} className="relative flex flex-1 flex-col items-center text-center" aria-current={i === 0 ? 'step' : undefined}>
                            {i < all.length - 1 && (
                                <span aria-hidden className="absolute left-1/2 top-4 h-0.5 w-full bg-stone-200" />
                            )}
                            <span
                                className={
                                    'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ' +
                                    (i === 0 ? 'bg-primary text-white ring-4 ring-primary/15' : 'border-2 border-stone-300 bg-white text-stone-500')
                                }
                            >
                                {i + 1}
                            </span>
                            <span className={'mt-2 text-sm leading-tight ' + (i === 0 ? 'font-semibold text-stone-900' : 'font-medium text-stone-600')}>
                                {stage.label}
                            </span>
                            <span className="mt-0.5 hidden text-sm text-stone-500 sm:block">{stage.hint}</span>
                        </li>
                    ))}
                </ol>
            </div>

            {/* Registration Form */}
            <form onSubmit={submit} className="space-y-4" noValidate>
                {selectedPlan && (
                    <div className="flex items-center justify-between rounded-lg border border-[#EC3013]/25 bg-[#EC3013]/5 px-3.5 py-2.5 text-sm">
                        <span className="text-stone-700">
                            Selected plan: <strong className="text-stone-900">{selectedPlan.name}</strong>
                        </span>
                        <Link href={route('pricing')} className="text-sm font-semibold text-[#EC3013] hover:underline">
                            Change
                        </Link>
                    </div>
                )}
                {/* Full Name Field */}
                <div>
                    <InputLabel htmlFor="name" value={t('auth.name')} required />

                    <TextInput
                        id="name"
                        name="name"
                        value={data.name}
                        className="w-full"
                        autoComplete="name"
                        placeholder={t('auth.name_placeholder')}
                        isFocused={true}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />

                    <InputError message={errors.name} />
                </div>

                {/* Restaurant / Company Name Field */}
                <div>
                    <InputLabel
                        htmlFor="restaurant_name"
                        value={t('auth.restaurant_name')}
                        required
                    />

                    <TextInput
                        id="restaurant_name"
                        name="restaurant_name"
                        value={data.restaurant_name}
                        className="w-full"
                        autoComplete="organization"
                        placeholder={t('auth.restaurant_placeholder')}
                        onChange={(e) => setData('restaurant_name', e.target.value)}
                        required
                    />

                    <InputError message={errors.restaurant_name} />
                </div>

                {/* Work email */}
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
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />

                    <InputError message={errors.email} />
                </div>

                {/* Password Field with Strength Meter */}
                <div>
                    <InputLabel htmlFor="password" value={t('auth.password')} required />

                    <PasswordInput
                        id="password"
                        name="password"
                        value={data.password}
                        autoComplete="new-password"
                        placeholder={t('auth.password_placeholder')}
                        hasError={Boolean(errors.password)}
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />

                    <PasswordStrengthMeter password={data.password} />

                    <InputError message={errors.password} />
                </div>

                {/* Confirm Password Field */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <InputLabel
                            htmlFor="password_confirmation"
                            value={t('auth.confirm_password')}
                            className="!mb-0"
                            required
                        />
                        {passwordsMatch && (
                            <span className="flex items-center gap-1 text-[13px] font-medium text-emerald-600">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                    className="h-3 w-3"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                Passwords match
                            </span>
                        )}
                    </div>

                    <PasswordInput
                        id="password_confirmation"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        autoComplete="new-password"
                        placeholder={t('auth.password_placeholder')}
                        hasError={Boolean(errors.password_confirmation)}
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        required
                    />

                    <InputError message={errors.password_confirmation} />
                </div>

                {/* Terms Notice */}
                <p className="pt-1 text-[13px] text-stone-500 leading-normal">
                    {t('auth.terms_notice')}
                </p>

                {/* Primary Button */}
                <div className="pt-2">
                    <PrimaryButton
                        className="w-full justify-center text-sm py-3 font-semibold shadow-md"
                        disabled={processing}
                    >
                        <span>{processing ? 'Creating workspace…' : t('auth.register')}</span>
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

            {/* Already have an account callout */}
            <div className="mt-8 rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 text-center">
                <p className="text-sm text-stone-600">
                    <span>{t('auth.already_registered')} </span>
                    <Link
                        href={route('login')}
                        className="font-semibold text-primary hover:text-primary-container hover:underline transition-colors"
                    >
                        {t('auth.signin_link')}
                    </Link>
                </p>
                <p className="mt-1 text-[13px] text-stone-400">
                    Instant access to live POS, table management, and reports
                </p>
            </div>
        </AuthSplitLayout>
    );
}
