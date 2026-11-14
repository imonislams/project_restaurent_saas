<?php

namespace App\Http\Controllers\Platform\Marketing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Marketing\Google\GoogleAdsClient;
use App\Domain\Marketing\Google\GoogleAnalyticsClient;
use App\Domain\Marketing\Google\GoogleConnection;
use App\Domain\Marketing\Google\SearchConsoleClient;
use App\Domain\Marketing\MarketingIntegrationRegistry;
use App\Domain\Marketing\MarketingIntegrationService;
use App\Http\Controllers\Controller;
use App\Jobs\SyncMarketingIntegrationJob;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Marketing integrations: configuration, credentials, connection tests and sync.
 *
 * The page never receives a credential value — only which keys are set — and it
 * distinguishes plainly between "configured, not verified", "disabled" and
 * "connected", because a green badge for an untested integration is exactly the
 * misleading status this workspace must not show.
 */
class IntegrationController extends Controller
{
    /** Providers whose OAuth flow this screen can run. */
    protected const OAUTH_PROVIDERS = ['google_analytics', 'search_console', 'google_ads'];

    public function __construct(
        protected MarketingIntegrationService $integrations,
        protected GoogleConnection $google,
    ) {}

    public function index(Request $request): Response
    {
        $this->auditView($request, 'integrations');

        return Inertia::render('Platform/Marketing/Settings/Integrations', [
            'providers' => $this->integrations->configuration(),
            'summary' => $this->integrations->summary(),
            'grouped' => MarketingIntegrationRegistry::grouped(),
            'oauthCallbackAccepted' => $request->session()->get('google_oauth') !== null,
            'redirectUri' => $this->google->redirectUri(),
        ]);
    }

    public function update(Request $request, string $provider): RedirectResponse
    {
        $this->assertProvider($provider);

        $data = $request->validate([
            'credentials' => ['nullable', 'array'],
            'credentials.*' => ['nullable', 'string', 'max:20000'],
            'settings' => ['nullable', 'array'],
            'remove' => ['nullable', 'array'],
            'remove.*' => ['string', 'max:60'],
            'is_enabled' => ['nullable', 'boolean'],
        ]);

        $this->integrations->save(
            $provider,
            (array) ($data['credentials'] ?? []),
            (array) ($data['settings'] ?? []),
            (array) ($data['remove'] ?? []),
            $request->user(),
        );

        if (array_key_exists('is_enabled', $data)) {
            $this->integrations->setEnabled($provider, (bool) $data['is_enabled'], $request->user());
        }

        return back()->with('success', MarketingIntegrationRegistry::label($provider).' saved. Run Test connection to prove it works before it is used.');
    }

    public function test(Request $request, string $provider): RedirectResponse
    {
        $this->assertProvider($provider);

        $result = $this->integrations->test($provider, $request->user());

        return $result['ok']
            ? back()->with('success', MarketingIntegrationRegistry::label($provider).' connected. '.($result['detail']['note'] ?? ''))
            : back()->with('error', (string) $result['error']);
    }

    public function toggle(Request $request, string $provider): RedirectResponse
    {
        $this->assertProvider($provider);

        $data = $request->validate(['is_enabled' => ['required', 'boolean']]);

        $integration = $this->integrations->setEnabled($provider, (bool) $data['is_enabled'], $request->user());

        return back()->with(
            'success',
            $data['is_enabled']
                ? MarketingIntegrationRegistry::label($provider).' is on. Status: '.$integration->status->label().'.'
                : MarketingIntegrationRegistry::label($provider).' is off, so nothing will be sent to it.',
        );
    }

    public function disconnect(Request $request, string $provider): RedirectResponse
    {
        $this->assertProvider($provider);

        $this->integrations->disconnect($provider, $request->user());

        return back()->with('success', MarketingIntegrationRegistry::label($provider).' disconnected and its stored credentials were removed.');
    }

    public function sync(Request $request, string $provider): RedirectResponse
    {
        $this->assertProvider($provider);

        if (! in_array($provider, ['google_analytics', 'search_console', 'google_ads'], true)) {
            return back()->with('error', MarketingIntegrationRegistry::label($provider).' has nothing to sync.');
        }

        SyncMarketingIntegrationJob::dispatch($provider);

        return back()->with('success', 'A sync has been queued. Its result appears under Last successful sync once it has run.');
    }

    /**
     * Start the Google OAuth flow for a provider.
     *
     * The state is signed and carries the provider, so the callback cannot be
     * pointed at a different integration than the one that started the flow.
     */
    public function googleAuthorize(Request $request, string $provider): RedirectResponse
    {
        $this->assertProvider($provider);

        if (! in_array($provider, self::OAUTH_PROVIDERS, true)) {
            return back()->with('error', MarketingIntegrationRegistry::label($provider).' does not use Google OAuth.');
        }

        $integration = $this->integrations->forProvider($provider);

        if ($integration === null || trim((string) ($integration->credentials['client_id'] ?? '')) === '') {
            return back()->with('error', 'Save the OAuth client id and secret first, then connect.');
        }

        if (trim((string) ($integration->credentials['client_secret'] ?? '')) === '') {
            return back()->with('error', 'Save the OAuth client secret first, then connect.');
        }

        $state = Str::random(40);
        $request->session()->put('marketing.google_oauth', ['state' => $state, 'provider' => $provider]);

        $scopes = match ($provider) {
            'google_analytics' => GoogleAnalyticsClient::SCOPES,
            'search_console' => SearchConsoleClient::SCOPES,
            'google_ads' => GoogleAdsClient::SCOPES,
            default => [],
        };

        return redirect()->away($this->google->authorizationUrl($integration, $state, $scopes));
    }

    public function googleCallback(Request $request): RedirectResponse
    {
        $pending = $request->session()->pull('marketing.google_oauth');

        $redirect = redirect()->route('platform.marketing.integrations.index');

        if ($request->filled('error')) {
            return $redirect->with('error', 'Google refused the authorization: '.$request->string('error')->toString());
        }

        if (! is_array($pending) || $request->string('state')->toString() !== ($pending['state'] ?? null)) {
            return $redirect->with('error', 'The Google authorization could not be verified (state mismatch). Start the connection again.');
        }

        $provider = (string) ($pending['provider'] ?? '');

        if (! in_array($provider, self::OAUTH_PROVIDERS, true)) {
            return $redirect->with('error', 'The Google authorization was for an unknown integration.');
        }

        $integration = $this->integrations->forProvider($provider);

        if ($integration === null) {
            return $redirect->with('error', 'The integration no longer exists.');
        }

        $code = $request->string('code')->toString();

        if ($code === '') {
            return $redirect->with('error', 'Google did not return an authorization code.');
        }

        $result = $this->google->exchangeCode($integration, $code);

        if (! $result['ok']) {
            return $redirect->with('error', (string) $result['error']);
        }

        $this->integrations->save(
            $provider,
            ['refresh_token' => (string) $result['refresh_token'], 'auth_mode' => 'oauth'],
            [],
            [],
            $request->user(),
        );

        $this->google->forgetToken($integration);

        return $redirect->with('success', MarketingIntegrationRegistry::label($provider).' authorized. Run Test connection to confirm the property or site is readable.');
    }

    protected function assertProvider(string $provider): void
    {
        abort_unless(MarketingIntegrationRegistry::get($provider) !== null, 404, 'Unknown marketing provider.');
    }

    protected function auditView(Request $request, string $page): void
    {
        app(AuditLogger::class)->log('marketing.viewed', null, [
            'page' => $page,
        ], $request->user());
    }
}
