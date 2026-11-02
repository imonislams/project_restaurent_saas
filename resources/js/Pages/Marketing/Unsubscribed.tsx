import MarketingLayout from '@/Components/Marketing/MarketingLayout';
import MarketingHead from '@/Components/Marketing/MarketingHead';
import { Link } from '@inertiajs/react';

/**
 * The unsubscribe landing page.
 *
 * The decision has already been applied by the time this renders — the page confirms
 * it rather than asking again, because a one-click unsubscribe must be one click.
 */
export default function Unsubscribed({ status, email }: { status: string; email?: string }) {
    const valid = status === 'unsubscribed';

    return (
        <MarketingLayout>
            <MarketingHead
                title={valid ? 'You are unsubscribed' : 'This link is not valid'}
                description="Marketing email preferences."
                noindex
            />

            <section className="mx-auto max-w-2xl px-4 py-24 sm:px-6 lg:px-8">
                <h1 className="font-display text-3xl font-bold tracking-tight text-stone-900">
                    {valid ? 'You are unsubscribed' : 'This unsubscribe link is not valid'}
                </h1>

                <p className="mt-4 text-base leading-relaxed text-stone-600">
                    {valid ? (
                        <>
                            We will not send you any more marketing email{email ? (
                                <>
                                    {' '}at <span className="font-medium text-stone-900">{email}</span>
                                </>
                            ) : null}
                            . Anything you need from us — invoices, password resets, account notices — still reaches
                            you, because those are not marketing.
                        </>
                    ) : (
                        <>The link may have been cut short by your mail client. If you keep receiving marketing email you no longer want, reply to any of them and we will remove you by hand.</>
                    )}
                </p>

                {valid && (
                    <p className="mt-4 text-sm text-stone-500">
                        Changed your mind? Subscribing again is a fresh decision, and we will ask for it explicitly.
                    </p>
                )}

                <p className="mt-8">
                    <Link href="/" className="text-sm font-semibold text-[#EC3013] hover:underline">
                        Back to the site
                    </Link>
                </p>
            </section>
        </MarketingLayout>
    );
}
