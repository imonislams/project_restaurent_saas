import MarketingFooter from '@/Components/Marketing/MarketingFooter';
import MarketingNavbar from '@/Components/Marketing/MarketingNavbar';
import { PropsWithChildren, ReactNode } from 'react';

export interface MarketingLayoutProps extends PropsWithChildren {
    announcement?: ReactNode;
    className?: string;
}

export default function MarketingLayout({
    children,
    announcement,
    className = '',
}: MarketingLayoutProps) {
    return (
        <div className={`min-h-screen flex flex-col bg-[#FBFBF9] text-stone-900 selection:bg-[#10B981] selection:text-white ${className}`}>
            {/* Optional Announcement Banner */}
            {announcement && (
                <div className="bg-[#0B271F] px-4 py-2 text-center text-xs font-medium text-stone-200 border-b border-white/10">
                    {announcement}
                </div>
            )}

            {/* Navigation Header */}
            <MarketingNavbar />

            {/* Main Page Flow */}
            <main className="flex-1 w-full">
                {children}
            </main>

            {/* Footer */}
            <MarketingFooter />
        </div>
    );
}
