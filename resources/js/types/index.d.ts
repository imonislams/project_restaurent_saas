export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string | null;
    is_platform_admin?: boolean;
    status?: string;
    tenant_id?: number | null;
}

export interface TenantSummary {
    id: number;
    name: string;
    slug: string;
    status: string;
    on_trial: boolean;
    onboarding_completed: boolean;
}

export interface FlashProps {
    success?: string | null;
    error?: string | null;
}

export interface BranchSummary {
    id: number;
    name: string;
    code?: string | null;
    currency?: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
        permissions: string[];
        platform_permissions?: string[];
    };
    tenant: TenantSummary | null;
    branches?: BranchSummary[];
    active_branch_id?: number | null;
    flash: FlashProps;
};

export interface SelectOption {
    value: string;
    label: string;
    symbol?: string;
}
