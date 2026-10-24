import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/Components/ui/accordion';
import { Link } from '@inertiajs/react';
import { Reveal } from './Motion';

export interface FaqItem {
    q: string;
    a: string;
}

export const DEFAULT_FAQS: FaqItem[] = [
    {
        q: 'How does the free trial work?',
        a: 'Every plan starts with a free trial and full access to that plan. No credit card is required. Pick a plan, create your account and you can configure your menu, tables and staff straight away.',
    },
    {
        q: 'How do I purchase or change a plan?',
        a: 'Choose a plan on this page to start your trial. When you are ready, open Subscription in your dashboard to pay your invoice and switch plan or billing cycle at any time. Upgrades apply immediately.',
    },
    {
        q: 'Is there a long-term contract or cancellation fee?',
        a: 'No. Plans are billed monthly or yearly with no cancellation fees. You can export your data and cancel whenever your needs change.',
    },
    {
        q: 'What hardware do I need?',
        a: 'Touch Dine runs in the browser on iPads, Android tablets, touch screens and standard PCs or Macs. Common thermal receipt printers and cash drawers connect without proprietary hardware.',
    },
    {
        q: 'What happens if the internet drops during service?',
        a: 'Registers keep firing tickets to your kitchen screens and printers over your local network. Orders sync to the cloud automatically when the connection returns.',
    },
    {
        q: 'Can I manage more than one branch?',
        a: 'Yes. Higher plans support multiple branches with shared menus, stock transfers and consolidated reporting, switchable in seconds.',
    },
    {
        q: 'Can I move my existing menu over?',
        a: 'Yes. Import your menu from a spreadsheet, or ask our team to help structure modifiers and recipes before you go live.',
    },
];

interface FaqSectionProps {
    items?: FaqItem[];
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    className?: string;
}

export default function FaqSection({
    items = DEFAULT_FAQS,
    eyebrow = 'FAQ',
    title = 'Questions, answered',
    subtitle = 'Everything you need to know about plans, billing and getting started.',
    className = '',
}: FaqSectionProps) {
    return (
        <section id="faq" className={`w-full px-4 sm:px-6 lg:px-8 py-20 lg:py-24 ${className}`}>
            <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-12 lg:gap-16">
                <Reveal className="lg:col-span-4">
                    <span className="mk-eyebrow">{eyebrow}</span>
                    <h2 className="mk-h2 mt-3">{title}</h2>
                    <p className="mt-4 text-base leading-relaxed text-stone-600">{subtitle}</p>
                    <p className="mt-6 text-sm text-stone-600">
                        Still unsure?{' '}
                        <Link href="/contact" className="font-semibold text-[#EC3013] hover:underline">
                            Talk to our team
                        </Link>
                    </p>
                </Reveal>

                <Reveal delay={100} className="lg:col-span-8">
                    <Accordion type="single" collapsible defaultValue="faq-0" className="mk-faq">
                        {items.map((item, i) => (
                            <AccordionItem key={item.q} value={`faq-${i}`} className="border-stone-200">
                                <AccordionTrigger className="py-5 text-[15px] font-semibold text-stone-900 hover:text-[#EC3013] hover:no-underline">
                                    {item.q}
                                </AccordionTrigger>
                                <AccordionContent className="text-[15px] leading-relaxed text-stone-600">
                                    {item.a}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </Reveal>
            </div>
        </section>
    );
}
