import Icon from '@/Components/Icon';
import { Card, EmptyState } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';

/**
 * Honest placeholder for platform modules that are scheduled in later phases of
 * the control-center roadmap. It shows no fabricated data.
 */
export default function PlatformComingSoon({ module }: { module: string }) {
    const label = module
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    return (
        <PlatformLayout title={label}>
            <Card>
                <EmptyState
                    icon={<Icon name="cog" className="h-8 w-8" />}
                    title={`${label} is not available yet`}
                    description="This module is part of the platform control-center roadmap and has not been implemented. It will arrive in a later delivery phase — no placeholder data is shown in the meantime."
                />
            </Card>
        </PlatformLayout>
    );
}
