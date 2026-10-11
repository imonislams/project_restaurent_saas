import AuthSplitLayout from '@/Components/Auth/AuthSplitLayout';
import { PropsWithChildren } from 'react';

export default function Guest({
    children,
    heroHeadline,
    heroSubheadline,
    heroBadge,
    variant = 'general',
}: PropsWithChildren<{
    heroHeadline?: string;
    heroSubheadline?: string;
    heroBadge?: string;
    variant?: 'login' | 'register' | 'forgot' | 'reset' | 'verify' | 'general';
}>) {
    return (
        <AuthSplitLayout
            heroHeadline={heroHeadline || 'Your restaurant. Running smarter.'}
            heroSubheadline={
                heroSubheadline ||
                'Manage your restaurant operations, simplify daily workflows, and keep your team connected from one place.'
            }
            heroBadge={heroBadge || 'RESTAURANT WORKSPACE'}
            variant={variant}
        >
            {children}
        </AuthSplitLayout>
    );
}
