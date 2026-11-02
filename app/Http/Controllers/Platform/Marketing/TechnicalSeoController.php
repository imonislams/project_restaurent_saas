<?php

namespace App\Http\Controllers\Platform\Marketing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Marketing\Models\MarketingRedirect;
use App\Domain\Marketing\Models\MarketingSitemapEntry;
use App\Domain\Marketing\Seo\RedirectService;
use App\Domain\Marketing\Seo\RobotsService;
use App\Domain\Marketing\Seo\SitemapService;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Sitemap, robots.txt and redirects.
 *
 * Every mutation here is audited, and the sitemap preview is the same document the
 * crawler will receive — not a mock of it.
 */
class TechnicalSeoController extends Controller
{
    public function __construct(
        protected SitemapService $sitemap,
        protected RobotsService $robots,
        protected RedirectService $redirects,
        protected PlatformSettings $settings,
    ) {}

    public function sitemap(): Response
    {
        $entries = $this->sitemap->entries();
        $overrides = MarketingSitemapEntry::query()->get()->keyBy('path');

        return Inertia::render('Platform/Marketing/Seo/Sitemap', [
            'enabled' => $this->sitemap->enabled(),
            'last_generated_at' => $this->sitemap->lastGeneratedAt(),
            'url' => $this->sitemap->host().'/sitemap.xml',
            'entries' => array_map(fn (array $entry) => $entry + [
                'excluded' => $overrides->has($entry['path']) && ! $overrides->get($entry['path'])->is_enabled,
            ], $entries),
            'excluded_paths' => $overrides->reject(fn (MarketingSitemapEntry $row) => $row->is_enabled)->keys()->values()->all(),
            'preview' => $this->sitemap->xml(),
        ]);
    }

    public function updateSitemap(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'excluded' => ['nullable', 'array'],
            'excluded.*' => ['string', 'max:500'],
        ]);

        $this->settings->set('seo.sitemap_enabled', (bool) $data['enabled'], 'seo');

        // Only exclusions are stored: an included path needs no row, so a page added
        // later is included by default instead of being silently missing.
        MarketingSitemapEntry::query()->delete();

        foreach (array_unique((array) ($data['excluded'] ?? [])) as $path) {
            MarketingSitemapEntry::create([
                'path' => $path,
                'is_enabled' => false,
                'source' => 'manual',
            ]);
        }

        app(AuditLogger::class)->log('marketing.sitemap_regenerated', null, [
            'enabled' => (bool) $data['enabled'],
            'excluded' => count((array) ($data['excluded'] ?? [])),
        ], $request->user());

        $this->sitemap->regenerate();

        return back()->with('success', 'Sitemap settings saved and the file regenerated.');
    }

    public function regenerate(): RedirectResponse
    {
        $this->sitemap->regenerate();

        return back()->with('success', 'Sitemap regenerated.');
    }

    public function robots(): Response
    {
        $current = $this->robots->content();
        $validation = $this->robots->validate($current);

        return Inertia::render('Platform/Marketing/Seo/Robots', [
            'enabled' => $this->robots->enabled(),
            'is_custom' => $this->robots->isCustom(),
            'content' => $current,
            'default' => $this->robots->defaultContent(),
            'validation' => $validation,
            'url' => $this->sitemap->host().'/robots.txt',
            'sitemap_url' => $this->robots->sitemapUrl(),
        ]);
    }

    public function updateRobots(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'content' => ['nullable', 'string', 'max:20000'],
        ]);

        $this->settings->set('seo.robots_enabled', (bool) $data['enabled'], 'seo');

        $content = (string) ($data['content'] ?? '');
        $validation = $this->robots->validate($content);

        if ($validation['errors'] !== []) {
            return back()->with('error', 'robots.txt was not saved: '.implode(' ', $validation['errors']));
        }

        $this->robots->save($content);

        app(AuditLogger::class)->log('marketing.robots_updated', null, [
            'enabled' => (bool) $data['enabled'],
            'custom' => trim($content) !== '',
            'warnings' => count($validation['warnings']),
        ], $request->user());

        $message = trim($content) === ''
            ? 'robots.txt reset to the generated default.'
            : 'robots.txt saved.'.($validation['warnings'] === [] ? '' : ' Note: '.implode(' ', $validation['warnings']));

        return back()->with('success', $message);
    }

    public function redirects(Request $request): Response
    {
        $search = (string) $request->string('search');

        $query = MarketingRedirect::query()->latest('id');

        if ($search !== '') {
            $query->where(fn ($inner) => $inner
                ->where('from_path', 'like', '%'.$search.'%')
                ->orWhere('to_url', 'like', '%'.$search.'%'));
        }

        return Inertia::render('Platform/Marketing/Seo/Redirects', [
            'redirects' => $query->paginate(25)->withQueryString()->through(fn (MarketingRedirect $redirect) => [
                'id' => $redirect->getKey(),
                'from_path' => $redirect->from_path,
                'to_url' => $redirect->to_url,
                'status_code' => $redirect->status_code,
                'is_active' => $redirect->is_active,
                'hits' => $redirect->hits,
                'last_hit_at' => $redirect->last_hit_at?->toIso8601String(),
                'notes' => $redirect->notes,
            ]),
            'filters' => ['search' => $search],
            'status_codes' => MarketingRedirect::STATUS_CODES,
            'sample' => "from_path,to_url,status_code\n/old-pricing,/pricing,301",
        ]);
    }

    public function storeRedirect(Request $request): RedirectResponse
    {
        $payload = $this->validatedRedirect($request);
        $validation = $this->redirects->validate($payload);

        if ($validation['errors'] !== []) {
            return back()->withErrors($validation['errors'])->withInput();
        }

        $this->redirects->create($payload, $request->user());

        return back()->with('success', 'Redirect created.');
    }

    public function updateRedirect(Request $request, MarketingRedirect $redirect): RedirectResponse
    {
        $payload = $this->validatedRedirect($request);
        $validation = $this->redirects->validate($payload, $redirect->getKey());

        if ($validation['errors'] !== []) {
            return back()->withErrors($validation['errors'])->withInput();
        }

        $this->redirects->update($redirect, $payload, $request->user());

        return back()->with('success', 'Redirect updated.');
    }

    public function destroyRedirect(Request $request, MarketingRedirect $redirect): RedirectResponse
    {
        $this->redirects->delete($redirect, $request->user());

        return back()->with('success', 'Redirect deleted.');
    }

    public function importRedirects(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'csv' => ['required', 'string', 'max:200000'],
        ]);

        $result = $this->redirects->importCsv($data['csv'], $request->user());

        $message = $result['created'].' created, '.$result['updated'].' updated, '.$result['skipped'].' skipped.';

        if ($result['errors'] !== []) {
            return back()
                ->with('success', $message)
                ->with('error', implode(' ', array_slice($result['errors'], 0, 5)));
        }

        return back()->with('success', $message);
    }

    public function exportRedirects(): StreamedResponse
    {
        $csv = $this->redirects->exportCsv();

        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, 'marketing-redirects-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }

    /** @return array<string, mixed> */
    protected function validatedRedirect(Request $request): array
    {
        return $request->validate([
            'from_path' => ['required', 'string', 'max:500'],
            'to_url' => ['required', 'string', 'max:1000'],
            'status_code' => ['required', 'integer'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);
    }
}
