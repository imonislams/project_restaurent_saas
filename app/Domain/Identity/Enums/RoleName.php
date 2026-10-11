<?php

namespace App\Domain\Identity\Enums;

enum RoleName: string
{
    case SaasSuperAdmin = 'saas_super_admin';
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
        return $this === self::SaasSuperAdmin;
    }
}
