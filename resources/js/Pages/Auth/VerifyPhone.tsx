import AuthSplitLayout from '@/Components/Auth/AuthSplitLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

export default function VerifyPhone({ phone, status }: { phone?: string | null; status?: string }) {
    const { flash } = usePage().props as Record<string, any>;
    const inputRef = useRef<{ focus: () => void }>(null);

    const form = useForm({ code: '' });
    const resend = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('verification.phone.verify'), {
            onError: () => {
                form.reset('code');
                inputRef.current?.focus();
            },
        });
    };

    const requestNewCode = () => resend.post(route('verification.phone.resend'));

    return (
        <AuthSplitLayout
            variant="verify"
            heroBadge="MOBILE VERIFICATION"
            heroHeadline="One code away from service."
            heroSubheadline="We sent a one-time code by SMS. Enter it to confirm your mobile number and secure your account."
        >
            <Head title="Mobile Verification" />

            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                    <path
                        fillRule="evenodd"
                        d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                        clipRule="evenodd"
                    />
                </svg>
            </div>

            <div className="mb-6">
                <h1 className="font-display text-2xl font-bold tracking-tight text-[#0B271F] sm:text-3xl">Verify your mobile number</h1>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                    Enter the 6-digit code we sent{phone ? <> to <span className="font-semibold text-stone-800">{phone}</span></> : ''}. It expires in 10 minutes.
                </p>
            </div>

            {(status === 'verification-code-sent' || flash?.success) && (
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm font-medium text-emerald-900 shadow-sm">
                    {flash?.success ?? 'A new code has been sent to your mobile number.'}
                </div>
            )}

            {flash?.error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm font-medium text-red-900 shadow-sm">
                    {flash.error}
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label htmlFor="code" className="mb-1.5 block text-xs font-semibold text-stone-700">
                        Verification code
                    </label>
                    <TextInput
                        id="code"
                        ref={inputRef}
                        name="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={form.data.code}
                        isFocused
                        className="w-full text-center text-lg font-semibold tracking-[0.5em]"
                        placeholder="••••••"
                        onChange={(e) => form.setData('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    {form.errors.code && <p className="mt-1 text-xs text-red-600">{form.errors.code}</p>}
                </div>

                <PrimaryButton className="w-full justify-center py-3 text-sm font-semibold shadow-md" disabled={form.processing || form.data.code.length !== 6}>
                    <span>{form.processing ? 'Verifying…' : 'Verify mobile number'}</span>
                </PrimaryButton>

                <div className="flex items-center justify-between pt-2">
                    <button
                        type="button"
                        onClick={requestNewCode}
                        disabled={resend.processing}
                        className="text-xs font-semibold text-primary hover:text-primary-container transition-colors disabled:opacity-50"
                    >
                        {resend.processing ? 'Sending…' : 'Resend code'}
                    </button>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="text-xs font-semibold text-stone-600 transition-colors hover:text-red-600 focus:outline-none"
                    >
                        Log Out
                    </Link>
                </div>
            </form>
        </AuthSplitLayout>
    );
}
