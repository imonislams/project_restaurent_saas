<?php

namespace App\Domain\Identity;

/**
 * Canonical permission catalog.
 *
 * Slugs are `group.action`. Platform permissions are a separate namespace and
 * are never granted to tenant roles — see SECURITY.md (three-access model).
 */
final class Permissions
{
    /** @return array<string, list<string>> group => actions */
    public static function map(): array
    {
        return [
            'dashboard' => ['view'],
            'pos' => ['use'],
            'orders' => ['view', 'create', 'update', 'void', 'refund'],
            'tables' => ['view', 'manage'],
            'kitchen' => ['view', 'manage'],
            'menu' => ['view', 'manage'],
            'inventory' => ['view', 'manage', 'adjust', 'approve'],
            'purchasing' => ['view', 'manage', 'approve'],
            'waste' => ['view', 'create', 'approve'],
            'customers' => ['view', 'manage'],
            'cash' => ['view', 'manage', 'approve'],
            'accounts' => ['view', 'manage'],
            'expenses' => ['view', 'manage', 'approve'],
            'reports' => ['view', 'export'],
            'staff' => ['view', 'manage'],
            'branches' => ['view', 'manage'],
            'settings' => ['view', 'manage'],
            'subscription' => ['view', 'manage'],
            'platform' => [
                'tenants.manage',
                'subscriptions.manage',
                'diagnostics.view',
                'impersonate',
                'audit.view',
                'maintenance.manage',
            ],
        ];
    }

    /** @return list<string> */
    public static function all(): array
    {
        $slugs = [];

        foreach (self::map() as $group => $actions) {
            foreach ($actions as $action) {
                $slugs[] = $group.'.'.$action;
            }
        }

        return $slugs;
    }

    /** @return list<string> */
    public static function tenant(): array
    {
        return array_values(array_filter(
            self::all(),
            fn (string $slug) => ! str_starts_with($slug, 'platform.')
        ));
    }

    /** @return list<string> */
    public static function platform(): array
    {
        return array_values(array_filter(
            self::all(),
            fn (string $slug) => str_starts_with($slug, 'platform.')
        ));
    }
}
