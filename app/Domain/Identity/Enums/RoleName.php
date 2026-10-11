<?php

namespace App\Domain\Identity\Enums;

enum RoleName: string
{
    // Platform roles — hold platform.* permissions only and are never assigned to tenant users.
    case SaasSuperAdmin = 'saas_super_admin';
    case PlatformOwner = 'platform_owner';
    case PlatformAdmin = 'platform_admin';
    case BillingAdmin = 'billing_admin';
    case SupportOperator = 'support_operator';
    case OperationsEngineer = 'operations_engineer';
    case PlatformAuditor = 'platform_auditor';

    // Tenant roles.
    case TenantOwner = 'tenant_owner';
    case TenantAdmin = 'tenant_admin';
    case BranchManager = 'branch_manager';
    case Supervisor = 'supervisor';
    case Cashier = 'cashier';
    case KitchenStaff = 'kitchen_staff';
    case InventoryManager = 'inventory_manager';
    case Accountant = 'accountant';
    case Auditor = 'auditor';

    public function label(): string
    {
        return match ($this) {
            self::SaasSuperAdmin => 'SaaS Super Admin',
            self::PlatformOwner => 'Platform Owner',
            self::PlatformAdmin => 'Platform Administrator',
            self::BillingAdmin => 'Billing Administrator',
            self::SupportOperator => 'Support Operator',
            self::OperationsEngineer => 'Operations Engineer',
            self::PlatformAuditor => 'Platform Auditor',
            self::TenantOwner => 'Tenant Owner',
            self::TenantAdmin => 'Tenant Admin',
            self::BranchManager => 'Branch Manager',
            self::Supervisor => 'Supervisor',
            self::Cashier => 'Cashier',
            self::KitchenStaff => 'Kitchen Staff',
            self::InventoryManager => 'Inventory Manager',
            self::Accountant => 'Accountant',
            self::Auditor => 'Auditor',
        };
    }

    public function isPlatform(): bool
    {
        return in_array($this, self::platform(), true);
    }

    /** @return list<self> */
    public static function platform(): array
    {
        return [
            self::SaasSuperAdmin,
            self::PlatformOwner,
            self::PlatformAdmin,
            self::BillingAdmin,
            self::SupportOperator,
            self::OperationsEngineer,
            self::PlatformAuditor,
        ];
    }

    /**
     * Platform role slugs — excluded from anything a tenant can assign.
     *
     * @return list<string>
     */
    public static function platformValues(): array
    {
        return array_map(fn (self $role) => $role->value, self::platform());
    }
}
