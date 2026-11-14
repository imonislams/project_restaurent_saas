import { usePage } from '@inertiajs/react';

/** Floating "chat with us" button, driven by Platform Settings → Social Media. */
export default function WhatsAppButton() {
    const support = (usePage().props as { whatsapp_support?: { url: string; widget: boolean } | null }).whatsapp_support;

    if (!support || !support.widget) return null;

    return (
        <a
            href={support.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
            title="Chat with us on WhatsApp"
            className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366]"
        >
            <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden="true">
                <path d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.12.55 4.19 1.6 6.02L4 29l8.12-1.57a12 12 0 0 0 3.92.65C22.68 28.08 28 22.68 28 16.04 28 9.4 22.68 3 16.04 3zm0 22.04c-1.2 0-2.38-.32-3.4-.93l-.24-.15-4.82.93.97-4.7-.16-.25a9.97 9.97 0 0 1-1.54-5.3c0-5.5 4.5-10 10.06-10 5.5 0 9.98 4.5 9.98 10.02 0 5.5-4.48 10.38-9.85 10.38zm5.48-7.5c-.3-.15-1.78-.88-2.05-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.22-.65.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.67-2.08-.18-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.25-.24-.58-.5-.5-.68-.5h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.12 3.23 5.13 4.53.72.3 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.08 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35z" />
            </svg>
        </a>
    );
}
