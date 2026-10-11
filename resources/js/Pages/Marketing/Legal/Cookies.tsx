import {
    MarketingHead,
    MarketingLayout,
} from '@/Components/Marketing';

export default function Cookies() {
    return (
        <MarketingLayout>
            <MarketingHead
                title="Cookie Policy — Restrly"
                description="Information on essential session, security, and locale preference cookies utilized by Restrly."
            />

            <section className="pt-12 pb-20 sm:pt-16 sm:pb-28">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div className="text-xs font-mono font-bold text-[#10B981] uppercase mb-3">
                        COOKIE POLICY
                    </div>
                    <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-[#0B271F] tracking-tight">
                        Cookie Policy
                    </h1>
                    <div className="mt-2 text-xs font-mono text-stone-400 pb-8 border-b border-stone-200">
                        Effective Date: October 2026 · Restrly Inc.
                    </div>

                    <div className="mt-8 space-y-8 text-stone-700 text-xs sm:text-sm leading-relaxed font-sans">
                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                1. What Are Cookies?
                            </h2>
                            <p>
                                Cookies are small text files stored on your computer or mobile device when you access websites and web applications. They allow our platform to recognize your session, remember your language preferences, and maintain security.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                2. Strictly Essential Cookies We Use
                            </h2>
                            <ul className="list-disc pl-5 space-y-2 text-stone-600">
                                <li>
                                    <strong>Session Authentication Cookie (`laravel_session`):</strong> Maintains your active authenticated workspace session so cashiers and managers do not get logged out during service.
                                </li>
                                <li>
                                    <strong>CSRF Protection Token (`XSRF-TOKEN`):</strong> Cryptographic security token that prevents cross-site request forgery attacks on forms and order settlements.
                                </li>
                                <li>
                                    <strong>Language / Locale Preference:</strong> Remembers your interface language selection (English vs. বাংলা) between browser reloads.
                                </li>
                            </ul>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                3. No Third-Party Tracking Cookies
                            </h2>
                            <p>
                                Restrly does not deploy intrusive cross-site ad retargeting cookies or sell browsing histories to advertising networks. Our cookies are strictly functional to ensure fast, secure restaurant operations.
                            </p>
                        </section>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
