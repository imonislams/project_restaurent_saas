<?php

namespace App\Http\Controllers\Platform\Marketing;

use App\Domain\Marketing\MarketingCampaignService;
use App\Domain\Marketing\Models\MarketingCampaign;
use App\Domain\Marketing\UtmBuilder;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * UTM builder.
 *
 * The URL is composed server-side so the same function that is tested is the one the
 * operator uses — and so existing query parameters on the destination are preserved
 * rather than replaced.
 */
class UtmController extends Controller
{
    public function __construct(
        protected UtmBuilder $builder,
        protected MarketingCampaignService $campaigns,
    ) {}

    public function index(Request $request): Response
    {
        $url = (string) $request->string('url');
        $params = [
            'utm_source' => (string) $request->string('utm_source'),
            'utm_medium' => (string) $request->string('utm_medium'),
            'utm_campaign' => (string) $request->string('utm_campaign'),
            'utm_term' => (string) $request->string('utm_term'),
            'utm_content' => (string) $request->string('utm_content'),
        ];

        $error = $url !== '' ? $this->builder->validate($url) : null;

        return Inertia::render('Platform/Marketing/Campaigns/UtmBuilder', [
            'url' => $url,
            'params' => $params,
            'built' => $url !== '' && $error === null ? $this->builder->build($url, $params) : null,
            'existing' => $url !== '' && $error === null ? $this->builder->existingParameters($url) : [],
            'error' => $error,
            'campaigns' => MarketingCampaign::query()
                ->latest('id')
                ->limit(50)
                ->get(['id', 'name', 'slug'])
                ->map(fn (MarketingCampaign $campaign) => [
                    'id' => $campaign->getKey(),
                    'name' => $campaign->name,
                    'slug' => $campaign->slug,
                    'utm' => $this->campaigns->utmFor($campaign),
                ])
                ->values()
                ->all(),
        ]);
    }
}
