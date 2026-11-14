import type { Journey } from '../types';

export const JOURNEYS: Journey[] = [
    {
        id: 'order-management',
        title: 'Order Management — counter to receipt',
        summary:
            'The full dine-in path: open a shift, build a cart against a table, send it to the kitchen, settle the balance and print the receipt.',
        audience: 'Cashier, Supervisor, Branch Manager',
        guideSlugs: ['pos-checkout', 'orders', 'kitchen-display'],
        steps: [
            {
                id: 'login',
                title: 'Sign in',
                detail: 'Credentials are checked and the workspace opens on the Dashboard.',
                kind: 'start',
            },
            {
                id: 'dashboard',
                title: 'Dashboard',
                detail: 'Confirm you are in the right branch using the selector in the sidebar.',
                kind: 'step',
            },
            {
                id: 'open-pos',
                title: 'Open POS Terminal',
                detail: 'Operations → POS Terminal. Products and tables follow the active branch.',
                kind: 'step',
            },
            {
                id: 'shift',
                title: 'Open a cash register shift',
                detail: 'Enter the opening float. Checkout stays blocked until a shift is open.',
                kind: 'decision',
                branches: [
                    {
                        label: 'No open shift',
                        steps: [
                            {
                                id: 'shift-open',
                                title: 'Open Shift',
                                detail: 'Opening Float Amount → Open Shift. The header now shows Shift # and expected cash.',
                                kind: 'step',
                            },
                        ],
                    },
                    {
                        label: 'Shift already open',
                        steps: [
                            {
                                id: 'shift-continue',
                                title: 'Continue',
                                detail: 'The shift badge confirms who opened it and the expected cash.',
                                kind: 'step',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'cart',
                title: 'Build the cart',
                detail: 'Choose Dine-in, pick the table and covers, then add products. Use + Note for kitchen instructions.',
                kind: 'step',
            },
            {
                id: 'discount',
                title: 'Discount or service charge?',
                detail: 'Apply a percentage or fixed discount and tick service charge when the branch charges it.',
                kind: 'decision',
                branches: [
                    {
                        label: 'Within policy',
                        steps: [
                            {
                                id: 'discount-normal',
                                title: 'Totals recalculate',
                                detail: 'Subtotal, discount, tax, service and Total Due update immediately.',
                                kind: 'step',
                            },
                        ],
                    },
                    {
                        label: 'Above threshold',
                        steps: [
                            {
                                id: 'discount-pin',
                                title: 'Manager PIN required',
                                detail: 'Checkout asks for approval before the sale can complete. Without it the discount cannot be applied.',
                                kind: 'step',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'pay-or-park',
                title: 'Pay now or send to the kitchen?',
                kind: 'decision',
                branches: [
                    {
                        label: 'Pay now',
                        steps: [
                            {
                                id: 'pay',
                                title: 'Pay & complete (F4)',
                                detail: 'Choose single or split payment, tender the amount, then Complete Sale.',
                                kind: 'step',
                            },
                            {
                                id: 'settled',
                                title: 'Order settled',
                                detail: 'Payment is posted and the receipt is available.',
                                kind: 'step',
                            },
                        ],
                    },
                    {
                        label: 'Open a tab',
                        steps: [
                            {
                                id: 'park',
                                title: 'Park / Kitchen Ticket (F8)',
                                detail: 'Saves the cart as an open order and releases it to the kitchen.',
                                kind: 'step',
                            },
                            {
                                id: 'settle-later',
                                title: 'Settle later',
                                detail: 'Use Orders → Settle Order, or the Held Orders panel, when the guest is ready to pay.',
                                kind: 'step',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'kitchen',
                title: 'Kitchen prepares',
                detail: 'The ticket appears under New Tickets, moves to In Preparation, then Ready for Pickup.',
                kind: 'step',
            },
            {
                id: 'handover',
                title: 'Handed Over',
                detail: 'The line marks the ticket served or bumped. The order fulfillment status updates.',
                kind: 'step',
            },
            {
                id: 'receipt',
                title: 'Receipt and close',
                detail: 'Print the receipt from the order. At end of shift, close the register and reconcile the counted cash.',
                kind: 'end',
            },
        ],
    },
    {
        id: 'qr-ordering',
        title: 'QR Ordering — guest scans to paid bill',
        summary:
            'A guest scans a table code, orders from the branded menu without installing anything, staff approve, the kitchen produces, and the bill is requested and paid.',
        audience: 'Table Staff, Cashier, Supervisor',
        guideSlugs: ['qr-ordering', 'orders', 'kitchen-display', 'tables-floor'],
        steps: [
            {
                id: 'generate',
                title: 'Generate table QR codes',
                detail: 'Operations → Table QR Codes → Print all, or print a single card.',
                kind: 'start',
            },
            {
                id: 'scan',
                title: 'Guest scans the code',
                detail: 'The token resolves the restaurant, branch and table server-side, then opens the menu in the browser.',
                kind: 'step',
            },
            {
                id: 'session',
                title: 'Dining session starts',
                detail: 'A session cookie keeps the guest attached to that table for the meal.',
                kind: 'step',
            },
            {
                id: 'order',
                title: 'Selects products and submits',
                detail: 'Modifiers, notes and quantities are captured exactly as on the POS.',
                kind: 'step',
            },
            {
                id: 'approval',
                title: 'Does the branch require approval?',
                kind: 'decision',
                branches: [
                    {
                        label: 'Auto-accepted',
                        steps: [
                            {
                                id: 'auto',
                                title: 'Straight to kitchen',
                                detail: 'The ticket appears on the KDS under New Tickets.',
                                kind: 'step',
                            },
                        ],
                    },
                    {
                        label: 'Awaiting confirmation',
                        steps: [
                            {
                                id: 'pending',
                                title: 'Staff confirm the order',
                                detail: 'Orders shows an approval badge. Accept sends it to the kitchen; Reject requires a reason.',
                                kind: 'step',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'kitchen',
                title: 'Kitchen prepares and marks ready',
                detail: 'New → In Preparation → Ready for Pickup → Handed Over.',
                kind: 'step',
            },
            {
                id: 'bill',
                title: 'Guest requests the bill',
                detail: 'The bill request is raised from the tracking screen and appears to staff on the table tab.',
                kind: 'step',
            },
            {
                id: 'payment',
                title: 'Payment',
                kind: 'decision',
                branches: [
                    {
                        label: 'Pay at the table',
                        steps: [
                            {
                                id: 'online',
                                title: 'Online payment',
                                detail: 'The configured gateway opens, and the status endpoint confirms the result before the session closes.',
                                kind: 'step',
                            },
                        ],
                    },
                    {
                        label: 'Pay at the counter',
                        steps: [
                            {
                                id: 'counter',
                                title: 'Settle from Orders',
                                detail: 'Staff complete the balance in the Settle Order dialog and print the receipt.',
                                kind: 'step',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'closed',
                title: 'Session closed',
                detail: 'The table returns to vacant, the QR can be scanned again for the next party, and analytics record the visit.',
                kind: 'end',
            },
        ],
    },
    {
        id: 'staff-onboarding',
        title: 'Staff onboarding — invite to first shift',
        summary:
            'Create a team member with the right role and branch access, then verify what their sidebar and permissions will actually allow.',
        audience: 'Owner, Admin, Branch Manager',
        guideSlugs: ['staff', 'roles-permissions', 'role-guides'],
        steps: [
            {
                id: 'invite',
                title: 'Invite the team member',
                detail: 'Staff → + Invite Team Member. Enter name, email and roles.',
                kind: 'start',
            },
            {
                id: 'branch',
                title: 'Assign branch access',
                detail: 'Leave empty for all branches, or select specific branches. Branch access filters every operational screen.',
                kind: 'step',
            },
            {
                id: 'accept',
                title: 'Accept the invitation',
                detail: 'The emailed link opens the join page. If a password was set, the person signs in directly.',
                kind: 'step',
            },
            {
                id: 'role',
                title: 'Is a built-in role enough?',
                kind: 'decision',
                branches: [
                    {
                        label: 'Yes',
                        steps: [
                            {
                                id: 'builtin',
                                title: 'Use the built-in role',
                                detail: 'Cashier, Table Staff, Kitchen Staff and the other standard roles ship with sensible permissions.',
                                kind: 'step',
                            },
                        ],
                    },
                    {
                        label: 'No',
                        steps: [
                            {
                                id: 'custom',
                                title: 'Create a custom role',
                                detail: 'Roles & Permissions → + Create Role. You can only grant permissions you hold yourself.',
                                kind: 'step',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'login',
                title: 'First sign-in',
                detail: 'Every tenant role lands on the Dashboard, then sees only the modules its permissions and plan allow.',
                kind: 'step',
            },
            {
                id: 'verify',
                title: 'Verify access',
                detail: 'Check that the sidebar shows the expected modules and that a restricted page returns 403 rather than exposing data.',
                kind: 'end',
            },
        ],
    },
];
