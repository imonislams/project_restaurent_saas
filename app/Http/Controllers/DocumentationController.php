<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * In-app learning centre (Web View → Resources → Documentation).
 *
 * The written content lives in the frontend registry
 * (resources/js/Components/Documentation/content) so the demo ships without any
 * database tables or migrations. Slugs are still whitelisted server-side so an
 * unknown URL 404s instead of rendering an empty article, mirroring
 * MarketingController::RESOURCE_SLUGS.
 */
class DocumentationController extends Controller
{
    /** @var list<string> */
    public const PAGES = [
        // Start here
        'getting-started',
        'dashboard',
        'restaurant-setup',

        // Daily operations
        'orders',
        'pos-checkout',
        'tables-floor',
        'kitchen-display',
        'qr-ordering',

        // Menu & catalog
        'menu-products',
        'modifiers',

        // Team & access
        'staff',
        'roles-permissions',
        'branches',

        // Stock & purchasing
        'inventory',
        'purchasing-suppliers',
        'transfers',
        'waste',

        // Money & reporting
        'payments',
        'customers',
        'expenses',
        'accounts',
        'invoices',
        'reports',

        // Configuration
        'settings',
        'delivery-zones',
        'subscription',

        // Journeys & reference
        'journeys',
        'button-reference',
        'videos',
        'role-guides',
        'troubleshooting',
    ];

    public function index(): Response
    {
        return Inertia::render('Documentation/Index');
    }

    public function show(string $page): Response
    {
        abort_unless(in_array($page, self::PAGES, true), 404);

        return Inertia::render('Documentation/Show', [
            'page' => $page,
        ]);
    }
}
