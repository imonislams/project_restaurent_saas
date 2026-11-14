import type { RoleGuide } from '../types';

/**
 * The ten tenant roles that exist in this build (app/Domain/Identity/Enums/RoleName.php).
 * Platform roles are deliberately excluded: they manage the SaaS, not a restaurant.
 *
 * Exact slug grants live in database/seeders/RolePermissionSeeder.php and can be
 * customised per restaurant, so this guide describes module access rather than
 * freezing a permission list that a tenant may have changed.
 */
export const ROLE_GUIDES: RoleGuide[] = [
    {
        slug: 'tenant-owner',
        name: 'Restaurant Owner',
        summary: 'Full control of the restaurant workspace, including billing and every module the plan includes.',
        landing: 'Dashboard',
        permissions: ['All tenant permissions', 'Branches: all locations', 'Roles: manage'],
        can: [
            'Configure company, tax, receipts and payments',
            'Create branches and switch between them',
            'Invite staff and edit any non-locked role',
            'See every report and financial figure',
            'Manage the subscription and billing documents',
        ],
        cannot: ['Change the locked Owner/Admin role definitions', 'Access platform administration'],
    },
    {
        slug: 'tenant-admin',
        name: 'Restaurant Admin',
        summary: 'Day-to-day administration with the same tenant permissions as the Owner.',
        landing: 'Dashboard',
        permissions: ['All tenant permissions', 'Branches: all locations', 'Roles: manage'],
        can: [
            'Run every operational module',
            'Edit staff, roles and branch assignments',
            'Change restaurant settings',
        ],
        cannot: ['Modify the locked Owner/Admin roles', 'Access platform administration'],
    },
    {
        slug: 'branch-manager',
        name: 'Branch Manager',
        summary: 'Runs one location end to end: service, team, stock and local reporting.',
        landing: 'Dashboard',
        permissions: ['Orders (approve)', 'Tables', 'Kitchen', 'POS', 'Inventory', 'Staff: view', 'Reports'],
        can: [
            'Accept or reject incoming orders',
            'Manage the floor and table transfers',
            'Open and close shifts and reconcile cash',
            'Record stock counts and approve local purchasing',
            'Read branch reports',
        ],
        cannot: ['Change company-wide settings', 'Create roles', 'Manage the subscription'],
    },
    {
        slug: 'supervisor',
        name: 'Supervisor',
        summary: 'Shift supervision: approves exceptions, keeps service moving, and can act on orders and cash.',
        landing: 'Dashboard',
        permissions: ['Orders (approve)', 'POS', 'Tables', 'Kitchen', 'Cash approval', 'Reports: view'],
        can: [
            'Approve voids, refunds and high discounts with a PIN',
            'Accept pending orders',
            'Manage tables and open tabs',
            'Monitor the kitchen board',
        ],
        cannot: ['Edit staff or roles', 'Change restaurant settings', 'Manage inventory purchasing'],
    },
    {
        slug: 'cashier',
        name: 'Cashier',
        summary: 'Takes payment, settles tabs and handles receipts, customers and invoices.',
        landing: 'Dashboard',
        permissions: ['POS', 'Orders', 'Tables: view', 'Customers', 'Invoices: view', 'Cash: view'],
        can: [
            'Open a shift and complete sales',
            'Settle open orders',
            'Take split payments and print receipts',
            'Look up and create customers',
        ],
        cannot: ['Accept or reject pending orders', 'Void a settled order without approval', 'Edit the menu'],
    },
    {
        slug: 'table-staff',
        name: 'Table Staff / Waiter',
        summary: 'Owns the floor: tables, guest orders, order status and bill requests.',
        landing: 'Dashboard',
        permissions: ['Tables', 'Orders: view/create', 'POS (table service)', 'QR: view'],
        can: [
            'Open tables and move tabs',
            'Take orders for a table',
            'Follow order status and request the bill',
            'Show or reprint a table QR code',
        ],
        cannot: ['Settle payments without POS/cash rights', 'Approve orders', 'Change prices or the menu'],
    },
    {
        slug: 'kitchen-staff',
        name: 'Kitchen Staff',
        summary: 'Works the Kitchen Display from New to Handed Over.',
        landing: 'Dashboard',
        permissions: ['Kitchen', 'Orders: view'],
        can: [
            'See incoming tickets for their branch',
            'Start, finish and hand over tickets',
            'Mark individual items ready',
            'Flag urgent tickets and print a ticket',
        ],
        cannot: ['Take payments', 'Accept or reject orders', 'Edit the menu or stock'],
    },
    {
        slug: 'inventory-manager',
        name: 'Inventory Manager',
        summary: 'Keeps stock accurate and purchasing moving across the locations they cover.',
        landing: 'Dashboard',
        permissions: ['Inventory (manage/adjust)', 'Purchasing (approve)', 'Transfers', 'Waste', 'Reports: view'],
        can: [
            'Record opening stock and physical counts',
            'Approve purchasing and receive goods',
            'Dispatch and receive branch transfers',
            'Record and approve waste write-offs',
        ],
        cannot: ['Settle orders', 'Manage staff or roles', 'Change restaurant settings'],
    },
    {
        slug: 'accountant',
        name: 'Accountant',
        summary: 'Financial records: expenses, accounts, invoices and reporting.',
        landing: 'Dashboard',
        permissions: ['Expenses', 'Accounts', 'Invoices', 'Reports (view/export)'],
        can: [
            'Log and approve expenses',
            'Manage financial accounts and transfers',
            'Review invoices',
            'Export report datasets',
        ],
        cannot: ['Operate the POS or kitchen', 'Edit the menu', 'Manage staff access'],
    },
    {
        slug: 'auditor',
        name: 'Auditor',
        summary: 'Read-only access to every module the plan includes, with no ability to change a record.',
        landing: 'Dashboard',
        permissions: ['Every *.view permission in the tenant catalogue'],
        can: [
            'Read orders, tables, kitchen, inventory, finance and reports',
            'Review audit trails and the stock ledger',
            'Export report data where export is granted',
        ],
        cannot: ['Create, edit, approve, void or delete anything'],
    },
];
