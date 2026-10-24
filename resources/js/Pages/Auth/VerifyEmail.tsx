import AuthSplitLayout from '@/Components/Auth/AuthSplitLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <AuthSplitLayout
            variant="verify"
            heroBadge="ACCOUNT VERIFICATION"
            heroHeadline="Almost ready for service."
            heroSubheadline="Confirm your work email to ensure seamless communication, receipt delivery, and system alerts."
            imageUrl="https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1600&q=85"
            testimonial={{
                quote:
                    'Touch Dine verification and security ensure only authorized team members access sensitive point-of-sale data.',
                author: 'Sophie Martin',
                role: 'General Manager',
                restaurant: 'Brasserie Vence',
            }}
        >
            <Head title="Email Verification" />

            {/* Email Icon Illustration */}
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#0F3D30] border border-emerald-100 shadow-sm">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-7 w-7 text-emerald-700"
                >
                    <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                    <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                </svg>
            </div>

            {/* Header */}
            <div className="mb-6">
                <h1 className="font-display text-2xl font-bold tracking-tight text-[#0B271F] sm:text-3xl">
                    Verify your email address
                </h1>
                <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                    Thanks for signing up for Touch Dine! Before getting started,
                    please verify your work email address by clicking on the link
                    we just sent to your inbox.
                </p>
            </div>

            {/* Status Alert Banner */}
            {status === 'verification-link-sent' && (
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
                    <div className="font-medium leading-relaxed">
                        A new verification link has been sent to the email address you
                        provided during registration.
                    </div>
                </div>
            )}

            {/* Actions */}
            <form onSubmit={submit} className="space-y-4">
                <PrimaryButton
                    className="w-full justify-center text-sm py-3 font-semibold shadow-md"
                    disabled={processing}
                >
                    <span>
                        {processing
                            ? 'Sending verification link…'
                            : 'Resend Verification Email'}
                    </span>
                </PrimaryButton>

                <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-stone-400">
                        Need help? Contact support
                    </span>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="text-xs font-semibold text-stone-600 hover:text-red-600 transition-colors focus:outline-none"
                    >
                        Log Out
                    </Link>
                </div>
            </form>
        </AuthSplitLayout>
    );
}
