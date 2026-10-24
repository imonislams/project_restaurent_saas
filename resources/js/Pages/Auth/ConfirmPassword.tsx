import AuthSplitLayout from '@/Components/Auth/AuthSplitLayout';
import PasswordInput from '@/Components/Auth/PasswordInput';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthSplitLayout
            variant="general"
            heroBadge="AUTHENTICATION CHALLENGE"
            heroHeadline="Secure manager confirmation."
            heroSubheadline="Confirm your account password before accessing critical financial reports, payroll, and configuration."
        >
            <Head title="Confirm Password" />

            {/* Lock Icon */}
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-[#0F3D30] border border-stone-200/80 shadow-sm">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-7 w-7 text-[#0F3D30]"
                >
                    <path
                        fillRule="evenodd"
                        d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                        clipRule="evenodd"
                    />
                </svg>
            </div>

            {/* Header */}
            <div className="mb-8">
                <h1 className="font-display text-2xl font-bold tracking-tight text-[#0B271F] sm:text-3xl">
                    Confirm your password
                </h1>
                <p className="mt-2 text-sm text-stone-500 leading-relaxed">
                    This is a secure area of Touch Dine. Please confirm your account password
                    before continuing.
                </p>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-5" noValidate>
                <div>
                    <InputLabel htmlFor="password" value="Password" required />

                    <PasswordInput
                        id="password"
                        name="password"
                        value={data.password}
                        isFocused={true}
                        hasError={Boolean(errors.password)}
                        placeholder="••••••••"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />

                    <InputError message={errors.password} />
                </div>

                <div className="pt-2">
                    <PrimaryButton
                        className="w-full justify-center text-sm py-3 font-semibold shadow-md"
                        disabled={processing}
                    >
                        <span>{processing ? 'Confirming…' : 'Confirm & Proceed'}</span>
                    </PrimaryButton>
                </div>
            </form>
        </AuthSplitLayout>
    );
}
