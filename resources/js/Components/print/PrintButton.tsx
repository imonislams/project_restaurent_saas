import Button from '@/Components/ui/Button';
import type { ButtonProps } from '@/Components/ui/Button';
import { usePage } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { cn } from '@/Components/ui/cn';

export interface PrintButtonProps extends Omit<ButtonProps, 'onClick' | 'children' | 'href' | 'method' | 'external'> {
    /** Visible button text. */
    label?: string;
    /** Document title applied while printing (prefixed with the restaurant name). */
    title?: string;
    /** Show the printer glyph. Defaults to true. */
    showIcon?: boolean;
}

/**
 * Standard print trigger. Sets a meaningful document title for the browser
 * print header, calls the native print dialog, then restores the title.
 */
export default function PrintButton({
    label = 'Print',
    title,
    showIcon = true,
    variant = 'secondary',
    size = 'sm',
    icon,
    className,
    ...rest
}: PrintButtonProps) {
    const page = usePage().props as Record<string, any>;
    const tenantName = page.tenant?.name as string | undefined;

    const handlePrint = () => {
        const previousTitle = document.title;
        const nextTitle = [tenantName, title].filter(Boolean).join(' – ');

        if (nextTitle) {
            document.title = nextTitle;
        }

        // Force an explicit A4 paper size at print time. Reading the orientation
        // from the mounted PrintDocument keeps portrait/landscape in sync.
        const orientation =
            document.querySelector<HTMLElement>('[data-print-orientation]')?.dataset.printOrientation ?? 'portrait';

        const previousPageStyle = document.getElementById('td-print-page-size');
        previousPageStyle?.remove();

        const pageStyle = document.createElement('style');
        pageStyle.id = 'td-print-page-size';
        pageStyle.textContent = `@page { size: A4 ${orientation}; margin: 12mm; }`;
        document.head.appendChild(pageStyle);

        const restore = () => {
            document.title = previousTitle;
            document.getElementById('td-print-page-size')?.remove();
            window.removeEventListener('afterprint', restore);
        };

        window.addEventListener('afterprint', restore);
        window.print();
    };

    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            icon={icon ?? (showIcon ? <Printer className="h-3.5 w-3.5" /> : undefined)}
            onClick={handlePrint}
            className={cn('print:hidden', className)}
            {...rest}
        >
            {label}
        </Button>
    );
}
