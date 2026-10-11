<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Domain\PlatformSettings\SettingsSchema;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __construct(
        protected PlatformSettings $settings,
        protected AuditLogger $audit,
    ) {}

    public function show(string $group): Response
    {
        $schema = SettingsSchema::group($group);

        abort_if($schema === null, 404);

        $values = [];

        foreach ($schema['fields'] as $field) {
            $values[$field['name']] = $this->settings->get($field['setting'], $field['default'] ?? null);
        }

        return Inertia::render('Platform/Settings/Show', [
            'group' => $group,
            'schema' => $schema,
            'values' => $values,
        ]);
    }

    public function update(Request $request, string $group): RedirectResponse
    {
        $schema = SettingsSchema::group($group);

        abort_if($schema === null, 404);

        $rules = [];

        foreach ($schema['fields'] as $field) {
            $rules['values.'.$field['name']] = SettingsSchema::rulesFor($field);
        }

        $data = $request->validate($rules);

        $before = [];
        $after = [];

        foreach ($schema['fields'] as $field) {
            $before[$field['name']] = $this->settings->get($field['setting'], $field['default'] ?? null);

            $value = $data['values'][$field['name']] ?? null;

            if ($field['type'] === 'boolean') {
                $value = (bool) $value;
            } elseif ($field['type'] === 'number' && $value !== null && $value !== '') {
                $value = (int) $value;
            }

            $this->settings->set($field['setting'], $value, $group);
            $after[$field['name']] = $value;
        }

        $this->audit->logChange('platform.settings_updated', null, ['group' => $group, 'values' => $before], ['group' => $group, 'values' => $after], $request->user());

        return back()->with('success', 'Settings saved.');
    }
}
