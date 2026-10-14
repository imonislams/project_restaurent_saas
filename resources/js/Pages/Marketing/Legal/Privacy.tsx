import {
    MarketingHead,
    MarketingLayout,
} from '@/Components/Marketing';
import { Link } from '@inertiajs/react';

export default function Privacy() {
    return (
        <MarketingLayout>
            <MarketingHead
                title="Privacy Policy — Restrly"
                description="Our privacy commitments, tenant data isolation practices, cookie usage, and customer data protections."
            />

            <section className="pt-12 pb-20 sm:pt-16 sm:pb-28">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div className="text-xs font-mono font-bold text-[#B53014] uppercase mb-3">
                        LEGAL COMPLIANCE & TRUST
                    </div>
                    <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-stone-900 tracking-tight">
                        Privacy Policy
                    </h1>
                    <div className="mt-2 text-xs font-mono text-stone-400 pb-8 border-b border-stone-200">
                        Effective Date: October 2026 · Restrly Inc.
                    </div>

                    <div className="mt-8 space-y-8 text-stone-700 text-xs sm:text-sm leading-relaxed font-sans">
                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                1. Overview and Core Commitments
                            </h2>
                            <p>
                                Restrly Inc. (“Restrly”, “we”, “our”, or “us”) provides cloud-based point-of-sale, kitchen management, and inventory software for food and beverage establishments. This Privacy Policy describes how we collect, store, isolate, and protect information when you visit our website or access our restaurant operating platform.
                            </p>
                            <p>
                                We believe your business data belongs entirely to you. We do not sell your customer information, transaction histories, or menu recipes to third-party advertisers or data brokers.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                2. Information We Collect
                            </h2>
                            <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
                                <li><strong>Account Information:</strong> Your name, email address, password hash, and restaurant business name provided during registration.</li>
                                <li><strong>Restaurant Operational Data:</strong> Menu items, ingredient costs, inventory records, dining table arrangements, and physical branch locations configured within your workspace.</li>
                                <li><strong>Transactional Data:</strong> Order receipts, payment method types (cash, card token, mobile banking), shift float balances, and tax records created during service.</li>
                                <li><strong>Technical & Log Data:</strong> IP addresses, browser types, session tokens, and request correlation IDs used strictly for system security and audit logging.</li>
                            </ul>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                3. Multi-Tenant Data Isolation
                            </h2>
                            <p>
                                Restrly enforces architectural database isolation. Every customer record, order, and recipe is permanently scoped to your unique tenant ID. Technical safeguards prevent any tenant from querying, accessing, or viewing data belonging to another restaurant.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                4. Automated Encrypted Backups
                            </h2>
                            <p>
                                We perform automated, encrypted database snapshots on recurring hourly and daily schedules. Backups are stored in physically isolated storage environments with verified restoration procedures to protect against hardware or regional network disruptions.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                5. Payment Security
                            </h2>
                            <p>
                                We do not store raw credit card numbers or security CVV codes on our servers. All subscription payments and digital gateway transactions are processed via PCI-DSS compliant payment gateways (including SSLCommerz and Stripe) utilizing secure encryption tokens.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                6. Data Retention and Account Deletion
                            </h2>
                            <p>
                                You have the right to request full export or permanent deletion of your restaurant tenant data at any time. Upon verified account closure, all associated store records and staff profiles are purged in accordance with our data retention schedules.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                7. Contact Us
                            </h2>
                            <p>
                                For questions concerning this Privacy Policy or your data, contact our Data Protection Team at <a href="mailto:privacy@restrly.com" className="font-bold text-[#B53014] underline">privacy@restrly.com</a>.
                            </p>
                        </section>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
