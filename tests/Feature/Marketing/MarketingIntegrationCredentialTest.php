<?php

namespace Tests\Feature\Marketing;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Marketing\Enums\IntegrationStatus;
use App\Domain\Marketing\MarketingIntegrationRegistry;
use App\Domain\Marketing\MarketingIntegrationService;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Fixtures\Marketing\FakeMarketingProvider;
use Tests\TestCase;

/**
 * Credential handling and status semantics for marketing integrations.
 *
 * Two rules are load-bearing here: a stored secret is never returned to the
 * browser (not even masked), and `connected` is earned by a successful test rather
 * than declared by filling in a field.
 */
class MarketingIntegrationCredentialTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    protected function admin(): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::SaasSuperAdmin);

        return $admin;
    }

    protected function service(): MarketingIntegrationService
    {
        return app(MarketingIntegrationService::class);
    }

    /** A driver that always reports a healthy connection. */
    protected function bindHealthyDriver(string $provider = 'meta_conversions'): void
    {
        $this->app->bind('marketing.provider.'.$provider, fn () => new FakeMarketingProvider($provider));
    }

    public function test_a_credential_is_encrypted_at_rest_and_never_stored_as_plain_text(): void
    {
        $integration = $this->service()->save('meta_conversions', [
            'pixel_id' => '1234567890',
            'access_token' => 'SUPER-SECRET-TOKEN',
        ]);

        $raw = (string) DB::table('marketing_integrations')
            ->where('id', $integration->getKey())
            ->value('credentials');

        $this->assertStringNotContainsString('SUPER-SECRET-TOKEN', $raw);
        $this->assertSame('SUPER-SECRET-TOKEN', $integration->fresh()->credentials['access_token']);
    }

    public function test_the_configuration_payload_exposes_key_names_but_never_a_value(): void
    {
        $this->service()->save('meta_conversions', [
            'pixel_id' => '1234567890',
            'access_token' => 'SUPER-SECRET-TOKEN',
            'business_id' => 'BIZ-42',
        ]);

        $encoded = json_encode($this->service()->configuration());

        $this->assertStringNotContainsString('SUPER-SECRET-TOKEN', $encoded);
        $this->assertStringNotContainsString('BIZ-42', $encoded);
        // The key names and whether they are set are still reported.
        $this->assertStringContainsString('access_token', $encoded);
        $this->assertStringContainsString('"is_set":true', $encoded);
    }

    public function test_a_blank_field_keeps_the_stored_value_rather_than_wiping_it(): void
    {
        $this->service()->save('meta_conversions', [
            'pixel_id' => '1234567890',
            'access_token' => 'ORIGINAL-TOKEN',
        ]);

        $this->service()->save('meta_conversions', [
            'access_token' => '',
            'business_id' => 'BIZ-42',
        ]);

        $integration = $this->service()->forProvider('meta_conversions');

        $this->assertSame('ORIGINAL-TOKEN', $integration->credentials['access_token']);
        $this->assertSame('1234567890', $integration->credentials['pixel_id']);
        $this->assertSame('BIZ-42', $integration->credentials['business_id']);
    }

    public function test_a_credential_can_be_removed_explicitly(): void
    {
        $this->service()->save('google_ads', [
            'conversion_id' => 'AW-1',
            'developer_token' => 'DEV-TOKEN',
        ]);

        $this->service()->save('google_ads', [], [], ['developer_token']);

        $this->assertArrayNotHasKey('developer_token', $this->service()->forProvider('google_ads')->credentials);
        $this->assertSame('AW-1', $this->service()->forProvider('google_ads')->credentials['conversion_id']);
    }

    public function test_status_walks_from_not_configured_to_disabled_to_configured(): void
    {
        // Missing a required credential.
        $integration = $this->service()->save('meta_conversions', ['pixel_id' => '1234567890']);
        $this->assertSame(IntegrationStatus::NotConfigured, $integration->status);

        // Complete, but switched off — so nothing will be sent yet.
        $integration = $this->service()->save('meta_conversions', ['access_token' => 'TOKEN']);
        $this->assertSame(IntegrationStatus::Disabled, $integration->status);

        // Switched on, but not yet proven.
        $integration = $this->service()->setEnabled('meta_conversions', true);
        $this->assertSame(IntegrationStatus::Configured, $integration->status);
    }

    public function test_status_reports_configured_and_not_verified_rather_than_working(): void
    {
        $integration = $this->service()->save('meta_conversions', [
            'pixel_id' => '1234567890',
            'access_token' => 'TOKEN',
        ]);
        $integration = $this->service()->setEnabled('meta_conversions', true);

        $this->assertSame(IntegrationStatus::Configured, $integration->status);
        $this->assertNotSame(IntegrationStatus::Connected, $integration->status);
        $this->assertNull($integration->last_ok_at);

        $row = collect($this->service()->configuration())->firstWhere('provider', 'meta_conversions');
        $this->assertTrue($row['is_enabled']);
        $this->assertStringContainsString('not verified', $row['status_label']);
    }

    public function test_a_missing_driver_is_reported_honestly_and_does_not_mark_the_integration_connected(): void
    {
        // platform_mail deliberately has no driver of its own: it sends through the
        // platform mailer. It is the realistic case of a configured provider whose
        // driver is absent, and it must not be reported as working.
        $this->service()->save('platform_mail', []);
        $this->service()->setEnabled('platform_mail', true);

        $result = $this->service()->test('platform_mail', $this->admin());

        $this->assertFalse($result['ok']);
        $this->assertStringContainsString('driver is not installed', (string) $result['error']);
        $this->assertSame(IntegrationStatus::Configured->value, $result['status']);
        $this->assertNull($this->service()->forProvider('platform_mail')->last_ok_at);
    }

    public function test_a_successful_test_promotes_the_integration_and_stamps_the_time(): void
    {
        $this->bindHealthyDriver();

        $this->service()->save('meta_conversions', [
            'pixel_id' => '1234567890',
            'access_token' => 'TOKEN',
        ]);
        $this->service()->setEnabled('meta_conversions', true);

        $result = $this->service()->test('meta_conversions', $this->admin());

        $this->assertTrue($result['ok']);
        $this->assertTrue($result['detail']['checked']);

        $integration = $this->service()->forProvider('meta_conversions')->fresh();
        $this->assertSame(IntegrationStatus::Connected, $integration->status);
        $this->assertSame('ok', $integration->health_status);
        $this->assertNotNull($integration->last_ok_at);
        $this->assertNull($integration->last_error);
    }

    public function test_a_verified_connection_that_is_switched_off_is_not_reported_as_connected(): void
    {
        $this->bindHealthyDriver();

        $this->service()->save('meta_conversions', [
            'pixel_id' => '1234567890',
            'access_token' => 'TOKEN',
        ]);

        // Not enabled: the credentials are proven, but nothing will be sent.
        $this->service()->test('meta_conversions', $this->admin());

        $integration = $this->service()->forProvider('meta_conversions')->fresh();
        $this->assertSame(IntegrationStatus::Disabled, $integration->status);
        $this->assertNotNull($integration->last_ok_at);
        $this->assertFalse($this->service()->connected('meta_conversions'));
    }

    public function test_changing_a_credential_invalidates_a_previous_verification(): void
    {
        $this->bindHealthyDriver();

        $this->service()->save('meta_conversions', [
            'pixel_id' => '1234567890',
            'access_token' => 'TOKEN',
        ]);
        $this->service()->setEnabled('meta_conversions', true);
        $this->service()->test('meta_conversions', $this->admin());
        $this->assertSame(IntegrationStatus::Connected, $this->service()->forProvider('meta_conversions')->status);

        $integration = $this->service()->save('meta_conversions', ['access_token' => 'NEW-TOKEN']);

        $this->assertSame(IntegrationStatus::Configured, $integration->status);
    }

    public function test_a_disabled_integration_reports_disabled_not_broken(): void
    {
        $this->service()->save('meta_conversions', [
            'pixel_id' => '1234567890',
            'access_token' => 'TOKEN',
        ]);

        $integration = $this->service()->setEnabled('meta_conversions', true);
        $this->assertSame(IntegrationStatus::Configured, $integration->status);

        $integration = $this->service()->setEnabled('meta_conversions', false);
        $this->assertSame(IntegrationStatus::Disabled, $integration->status);
    }

    public function test_disconnecting_clears_the_stored_credentials(): void
    {
        $this->service()->save('meta_conversions', [
            'pixel_id' => '1234567890',
            'access_token' => 'TOKEN',
        ]);

        $integration = $this->service()->disconnect('meta_conversions', $this->admin());

        $this->assertSame([], $integration->credentials);
        $this->assertSame(IntegrationStatus::NotConfigured, $integration->status);
        $this->assertFalse($integration->is_enabled);
    }

    public function test_the_audit_trail_records_which_keys_changed_and_never_their_values(): void
    {
        $this->service()->save('meta_conversions', [
            'pixel_id' => '1234567890',
            'access_token' => 'SUPER-SECRET-TOKEN',
        ], [], [], $this->admin());

        $log = DB::table('audit_logs')->where('action', 'marketing.integration_updated')->first();

        $this->assertNotNull($log);
        $this->assertStringContainsString('access_token', (string) $log->metadata);
        $this->assertStringNotContainsString('SUPER-SECRET-TOKEN', (string) $log->metadata);
    }

    public function test_a_provider_without_credentials_cannot_be_configured_into_a_working_state(): void
    {
        $result = $this->service()->test('meta_pixel');

        $this->assertFalse($result['ok']);
        $this->assertStringContainsString('has not been configured', (string) $result['error']);
    }

    public function test_platform_mail_needs_no_credentials_because_it_uses_the_existing_mailer(): void
    {
        $this->assertSame([], MarketingIntegrationRegistry::requiredCredentialKeys('platform_mail'));

        $this->service()->save('platform_mail', []);
        $integration = $this->service()->setEnabled('platform_mail', true);

        $this->assertSame(IntegrationStatus::Configured, $integration->status);
    }

    public function test_registry_marks_secret_fields_so_the_ui_never_echoes_them(): void
    {
        $this->assertContains('access_token', MarketingIntegrationRegistry::secretKeys('meta_conversions'));
        $this->assertContains('developer_token', MarketingIntegrationRegistry::secretKeys('google_ads'));
        // Public identifiers are deliberately not marked secret.
        $this->assertNotContains('pixel_id', MarketingIntegrationRegistry::secretKeys('meta_conversions'));
        $this->assertNotContains('container_id', MarketingIntegrationRegistry::secretKeys('google_tag_manager'));
    }

    public function test_only_providers_with_a_consent_category_can_be_gated_on_consent(): void
    {
        $this->assertSame('advertising', MarketingIntegrationRegistry::consentCategory('meta_conversions')?->value);
        $this->assertSame('analytics', MarketingIntegrationRegistry::consentCategory('google_analytics')?->value);
        $this->assertNull(MarketingIntegrationRegistry::consentCategory('platform_mail'));
    }

    public function test_a_sync_attempt_is_recorded_carrying_the_truth_of_what_happened(): void
    {
        $this->service()->save('google_analytics', ['property_id' => '123456789']);
        $this->service()->setEnabled('google_analytics', true);

        $this->service()->recordSync('google_analytics', 'ga4_report', [
            'ok' => false,
            'error' => 'Quota exceeded for property 123456789.',
        ]);

        $integration = $this->service()->forProvider('google_analytics')->fresh();

        $this->assertSame('down', $integration->health_status);
        $this->assertStringContainsString('Quota exceeded', (string) $integration->last_error);
        $this->assertSame(IntegrationStatus::Configured, $integration->status, 'A failed sync must not claim to be connected.');
        $this->assertDatabaseHas('marketing_sync_logs', [
            'entity' => 'ga4_report',
            'status' => 'failed',
        ]);
    }

    public function test_a_successful_sync_promotes_the_integration_to_connected(): void
    {
        $this->service()->save('search_console', ['site_url' => 'sc-domain:example.com']);
        $this->service()->setEnabled('search_console', true);

        $this->service()->recordSync('search_console', 'gsc_searchanalytics', ['ok' => true, 'items' => 42]);

        $integration = $this->service()->forProvider('search_console')->fresh();

        $this->assertSame(IntegrationStatus::Connected, $integration->status);
        $this->assertSame('ok', $integration->health_status);
        $this->assertNotNull($integration->last_synced_at);
        $this->assertTrue($this->service()->connected('search_console'));
    }
}
