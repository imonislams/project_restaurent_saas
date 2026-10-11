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

export default function ResetPassword({
    token,
    email,
}: {
    token: string;
    email: string;
}) {
    const t = useT();
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthSplitLayout
            variant="reset"
            heroBadge="AUTHENTICATION UPDATE"
            heroHeadline="Set new workspace password."
            heroSubheadline="Choose a strong, unique password to safeguard your restaurant's financial, staff, and order data."
            imageUrl="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=85"
            testimonial={{
                quote:
                    'Restrly security and role-based permissions give our owners peace of mind across all shifts and registers.',
                author: 'Liam Chen',
                role: 'Director of Technology',
                restaurant: 'Koji Hospitality Group',
            }}
            headerAction={
                <Link
                    href={route('login')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F3D30] hover:text-[#0B271F] transition-colors"
                >
                    <span>{t('auth.signin_link')}</span>
                </Link>
            }
        >
            <Head title="Reset Password" />

            {/* Form Header */}
            <div className="mb-8">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    <span>Security Credentials</span>
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-[#0B271F] sm:text-3xl">
                    Create new password
                </h1>
                <p className="mt-2 text-sm text-stone-500 leading-relaxed">
                    Enter your work email and select a new secure password.
                </p>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-4" noValidate>
                <div>
                    <InputLabel htmlFor="email" value={t('auth.work_email')} required />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="w-full bg-stone-50/50"
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />

                    <InputError message={errors.email} />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="New password" required />

                    <PasswordInput
                        id="password"
                        name="password"
                        value={data.password}
                        autoComplete="new-password"
                        isFocused={true}
                        hasError={Boolean(errors.password)}
                        placeholder="••••••••"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />

                    <PasswordStrengthMeter password={data.password} />

                    <InputError message={errors.password} />
                </div>

                <div>
                    <InputLabel
                        htmlFor="password_confirmation"
                        value={t('auth.confirm_password')}
                        required
                    />

                    <PasswordInput
                        id="password_confirmation"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        autoComplete="new-password"
                        hasError={Boolean(errors.password_confirmation)}
                        placeholder="••••••••"
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        required
                    />

                    <InputError message={errors.password_confirmation} />
                </div>

                <div className="pt-2">
                    <PrimaryButton
                        className="w-full justify-center text-sm py-3 font-semibold shadow-md"
                        disabled={processing}
                    >
                        <span>{processing ? 'Updating password…' : 'Reset password'}</span>
                    </PrimaryButton>
                </div>
            </form>
        </AuthSplitLayout>
    );
}
