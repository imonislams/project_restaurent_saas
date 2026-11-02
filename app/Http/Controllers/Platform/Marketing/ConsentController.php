<?php

namespace App\Http\Controllers\Platform\Marketing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Marketing\ConsentService;
use App\Domain\Marketing\Enums\ConsentCategory;
use App\Domain\Marketing\MarketingPublicConfig;
use App\Domain\Marketing\Models\MarketingConsentRecord;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Cookie consent and privacy configuration.
 *
 * The page shows not just the settings but what visitors actually chose, because a
 * banner that is configured is not the same as consent that has been recorded.
 */
class ConsentController extends Controller
{
    public function __construct(
        protected PlatformSettings $settings,
        protected ConsentService $consent,
        protected AuditLogger $audit,
    ) {}

    public function index(): Response
    {
        $stats = MarketingConsentRecord::query()
            ->selectRaw('action, count(*) as total')
            ->groupBy('action')
            ->pluck('total', 'action')
            ->all();

        $grantedAnalytics = MarketingConsentRecord::query()->latest('id')->limit(500)->get()
            ->filter(fn (MarketingConsentRecord $record) => $record->granted('analytics'))
            ->count();

        return Inertia::render('Platform/Marketing/Settings/Consent', [
            'settings' => [
                'banner_enabled' => $this->consent->enabled(),
                'version' => $this->consent->version(),
                'block_before_consent' => $this->consent->blocksBeforeConsent(),
                'retention_days' => $this->consent->retentionDays(),
                'banner_text_en' => (string) ($this->settings->get('consent.banner_text_en') ?? MarketingPublicConfig::DEFAULT_TEXT_EN),
                'banner_text_bn' => (string) ($this->settings->get('consent.banner_text_bn') ?? MarketingPublicConfig::DEFAULT_TEXT_BN),
            ],
            'categories' => collect(ConsentCategory::cases())->map(fn (ConsentCategory $category) => [
                'value' => $category->value,
                'label' => $category->label(),
                'description' => $category->description(),
                'requires_consent' => $category->requiresConsent(),
            ])->values(),
            'stats' => [
                'granted' => (int) ($stats['granted'] ?? 0),
                'updated' => (int) ($stats['updated'] ?? 0),
                'withdrawn' => (int) ($stats['withdrawn'] ?? 0),
                'total' => MarketingConsentRecord::query()->count(),
                'analytics_granted_in_last_500' => $grantedAnalytics,
            ],
            'records' => MarketingConsentRecord::query()
                ->latest('id')
                ->limit(25)
                ->get()
                ->map(fn (MarketingConsentRecord $record) => [
                    'visitor_id' => $record->visitor_id,
                    'action' => $record->action,
                    'version' => $record->version,
                    'source' => $record->source,
                    'categories' => $record->categories,
                    'created_at' => $record->created_at?->toIso8601String(),
                ])
                ->all(),
            'disclosures' => [
                'cookies' => [
                    ['name' => 'laravel_session', 'purpose' => 'Keeps you signed in.', 'category' => 'essential', 'duration' => 'Session'],
                    ['name' => 'XSRF-TOKEN', 'purpose' => 'Protects forms against cross-site request forgery.', 'category' => 'essential', 'duration' => 'Session'],
                    ['name' => 'pricing_country', 'purpose' => 'Remembers the country detected for region-appropriate pricing and payment methods.', 'category' => 'essential (functional)', 'duration' => '30 days'],
                    ['name' => 'md_vid', 'purpose' => 'A first-party visitor id used to attribute a visit to the campaign that produced it.', 'category' => 'analytics', 'duration' => '13 months'],
                ],
                'third_parties' => [
                    'When no country is supplied by the hosting platform, the browser asks a public IP lookup service (ipwho.is, then ipinfo.io) for the country so regional pricing is correct. This is a functional request, not analytics, and it is disclosed here rather than assumed.',
                ],
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'banner_enabled' => ['required', 'boolean'],
            'version' => ['required', 'string', 'max:20'],
            'block_before_consent' => ['required', 'boolean'],
            'retention_days' => ['required', 'integer', 'min:1', 'max:3650'],
            'banner_text_en' => ['required', 'string', 'max:1000'],
            'banner_text_bn' => ['required', 'string', 'max:1000'],
        ]);

        foreach ($data as $key => $value) {
            $this->settings->set('consent.'.$key, $value, 'consent');
        }

        $this->audit->log('marketing.consent_settings_updated', null, [
            'banner_enabled' => (bool) $data['banner_enabled'],
            'block_before_consent' => (bool) $data['block_before_consent'],
            'version' => $data['version'],
            'retention_days' => (int) $data['retention_days'],
        ], $request->user());

        return back()->with('success', 'Consent settings saved. Changing the version makes earlier consents visibly older, so ask again if the categories changed.');
    }
}
