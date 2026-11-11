import type { DocGroup } from '../types';

export const DOC_GROUPS: DocGroup[] = [
    { id: 'start', label: 'Start here', description: 'Orientation, dashboard and first-run setup.' },
    { id: 'operations', label: 'Daily operations', description: 'Orders, POS, floor, kitchen and QR dining.' },
    { id: 'catalog', label: 'Menu & catalog', description: 'Products, pricing and modifiers.' },
    { id: 'team', label: 'Team & access', description: 'Staff, roles, permissions and branches.' },
    { id: 'stock', label: 'Stock & purchasing', description: 'Inventory, suppliers, transfers and waste.' },
    { id: 'money', label: 'Money & reporting', description: 'Payments, customers, accounts and reports.' },
    { id: 'configure', label: 'Configuration', description: 'Restaurant settings and subscription.' },
    { id: 'learn', label: 'Journeys & reference', description: 'End-to-end walkthroughs, button lookup and videos.' },
];
