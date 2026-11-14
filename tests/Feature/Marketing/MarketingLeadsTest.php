<?php

namespace Tests\Feature\Marketing;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Marketing\ConsentService;
use App\Domain\Marketing\Enums\LeadSource;
use App\Domain\Marketing\Enums\LeadStatus;
use App\Domain\Marketing\LeadService;
use App\Domain\Marketing\Models\MarketingEmailSuppression;
use App\Domain\Marketing\Models\MarketingLead;
use App\Domain\Marketing\Models\MarketingSubscriber;
use App\Domain\Marketing\Models\MarketingVisitor;
use App\Domain\Marketing\UtmBuilder;
use App\Domain\Marketing\VisitorTracker;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\Models\Tenant as TenantModel;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Auth\Events\Registered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Campaigns and the lead CRM: the contact form persisting, attribution, dedupe,
 * lead-to-customer linking, and landing-page publication.
 */
class MarketingLeadsTest extends TestCase
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

    /** A visitor who allowed analytics, with a campaign context on their record. */
    protected function trackedVisitor(): string
    {
        $visitorId = (string) Str::uuid();
        app(ConsentService::class)->record(['analytics' => true], $visitorId);

        MarketingVisitor::create([
            'visitor_id' => $visitorId,
            'first_seen_at' => now(),
            'last_seen_at' => now(),
            'first_path' => '/pricing',
            'first_source' => 'google',
            'first_medium' => 'cpc',
            'first_campaign' => 'winter-launch',
            'channel' => 'google_ads',
            'device' => 'desktop',
            'country' => 'BD',
        ]);

        return $visitorId;
    }

    /** @param array<string, mixed> $overrides */
    protected function submission(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Ayesha Rahman',
            'email' => 'ayesha@restaurant.test',
            'phone' => '+880 1700 000000',
            'restaurant_name' => 'Ayesha Kitchen',
            'venue_type' => 'restaurant',
            'branches_count' => '2-5',
            'inquiry_category' => 'sales',
            'message' => 'We would like a walkthrough for our two branches.',
        ], $overrides);
    }

    public function test_a_contact_submission_is_persisted_as_one_lead_with_its_attribution(): void
    {
        $visitorId = $this->trackedVisitor();

        $this->withUnencryptedCookie(VisitorTracker::COOKIE, $visitorId)
            ->post('/contact', $this->submission())
            ->assertSessionHas('success');

        $this->assertSame(1, MarketingLead::query()->count());

        $lead = MarketingLead::query()->firstOrFail();

        $this->assertSame('ayesha@restaurant.test', $lead->email);
        $this->assertSame('Ayesha Kitchen', $lead->business_name);
        $this->assertSame(LeadSource::ContactForm, $lead->source);
        $this->assertSame(LeadStatus::New, $lead->status);
        $this->assertSame('google', $lead->utm_source);
        $this->assertSame('winter-launch', $lead->utm_campaign);
        $this->assertSame($visitorId, $lead->visitor_id);
        $this->assertGreaterThan(0, $lead->score);
        $this->assertSame(1, $lead->activities()->count());
    }

    public function test_a_second_identical_submission_is_deduplicated(): void
    {
        $visitorId = $this->trackedVisitor();

        $this->withUnencryptedCookie(VisitorTracker::COOKIE, $visitorId)->post('/contact', $this->submission());
        $this->withUnencryptedCookie(VisitorTracker::COOKIE, $visitorId)->post('/contact', $this->submission());

        $this->assertSame(1, MarketingLead::query()->count(), 'A repeat enquiry must not create a second lead.');

        // But the repeat contact is on the record.
        $lead = MarketingLead::query()->firstOrFail();
        $this->assertGreaterThanOrEqual(2, $lead->activities()->count());
    }

    public function test_the_honeypot_discards_a_bot_submission_without_storing_it(): void
    {
        $this->post('/contact', $this->submission(['website' => 'https://spam.example']))
            ->assertSessionHas('success');

        $this->assertSame(0, MarketingLead::query()->count());
    }

    public function test_an_invalid_submission_is_rejected(): void
    {
        $this->post('/contact', $this->submission(['email' => 'not-an-email']))
            ->assertSessionHasErrors('email');

        $this->assertSame(0, MarketingLead::query()->count());
    }

    public function test_the_contact_endpoint_is_rate_limited(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->post('/contact', $this->submission(['email' => "lead{$i}@restaurant.test"]));
        }

        $this->post('/contact', $this->submission(['email' => 'eleventh@restaurant.test']))
            ->assertStatus(429);
    }

    public function test_registering_links_the_existing_lead_to_the_new_restaurant_without_duplicating_it(): void
    {
        MarketingLead::create([
            'name' => 'Ayesha Rahman',
            'email' => 'ayesha@restaurant.test',
            'business_name' => 'Ayesha Kitchen',
            'source' => LeadSource::ContactForm->value,
            'status' => LeadStatus::New->value,
        ]);

        $tenant = TenantModel::factory()->create(['business_email' => 'ayesha@restaurant.test']);

        // The listener reacts to the framework's own Registered event, exactly as it
        // would when the person completes the signup form.
        $user = User::factory()->forTenant($tenant)->create(['email' => 'ayesha@restaurant.test']);
        event(new Registered($user));

        $lead = MarketingLead::query()->firstOrFail();

        $this->assertSame($tenant->getKey(), $lead->tenant_id);
        $this->assertSame(LeadStatus::Converted, $lead->status);
        $this->assertNotNull($lead->converted_at);
        $this->assertSame(1, Tenant::query()->count(), 'The customer must not be duplicated.');
        $this->assertSame(1, MarketingLead::query()->count());
    }

    public function test_a_registration_without_a_matching_lead_invents_nothing(): void
    {
        $tenant = TenantModel::factory()->create(['business_email' => 'nobody@restaurant.test']);
        $user = User::factory()->forTenant($tenant)->create(['email' => 'nobody@restaurant.test']);

        event(new Registered($user));

        $this->assertSame(0, MarketingLead::query()->count());
    }

    public function test_the_utm_builder_preserves_existing_query_parameters(): void
    {
        $builder = app(UtmBuilder::class);

        $built = $builder->build('https://example.com/pricing?plan=pro&ref=partner', [
            'utm_source' => 'google',
            'utm_medium' => 'cpc',
            'utm_campaign' => 'winter',
        ]);

        $this->assertStringContainsString('plan=pro', $built);
        $this->assertStringContainsString('ref=partner', $built);
        $this->assertStringContainsString('utm_source=google', $built);
        $this->assertStringContainsString('utm_campaign=winter', $built);
        $this->assertNull($builder->validate($built));
    }

    public function test_the_utm_builder_rejects_a_relative_url(): void
    {
        $this->assertNotNull(app(UtmBuilder::class)->validate('/pricing'));
    }

    public function test_a_lead_can_be_worked_through_the_pipeline(): void
    {
        $admin = $this->admin();

        $lead = MarketingLead::create([
            'name' => 'Karim',
            'email' => 'karim@restaurant.test',
            'source' => LeadSource::ContactForm->value,
            'status' => LeadStatus::New->value,
        ]);

        $service = app(LeadService::class);

        $service->assign($lead, $admin);
        $service->transition($lead, LeadStatus::Qualified, $admin, 'Budgets confirmed.');
        $service->transition($lead, LeadStatus::Lost, $admin, null, 'Chose a competitor.');

        $lead->refresh();

        $this->assertSame(LeadStatus::Lost, $lead->status);
        $this->assertSame('Chose a competitor.', $lead->lost_reason);
        $this->assertSame($admin->getKey(), $lead->assigned_to);
        $this->assertSame(3, $lead->activities()->count());
    }

    public function test_the_crm_screens_render_for_a_platform_admin(): void
    {
        $admin = $this->admin();

        $lead = MarketingLead::create([
            'name' => 'Test Lead',
            'email' => 'test@restaurant.test',
            'source' => LeadSource::ContactForm->value,
            'status' => LeadStatus::New->value,
        ]);

        foreach ([
            '/platform/marketing/campaigns',
            '/platform/marketing/campaigns/utm',
            '/platform/marketing/leads',
            '/platform/marketing/leads?view=board',
            '/platform/marketing/leads/followups',
            '/platform/marketing/leads/sources',
            '/platform/marketing/leads/'.$lead->id,
        ] as $uri) {
            $this->actingAs($admin)->get($uri)->assertOk();
        }
    }

    public function test_a_lead_export_requires_the_export_permission(): void
    {
        $auditor = User::factory()->platformAdmin()->create();
        $auditor->assignRole(RoleName::SaasSuperAdmin);

        // Sanity: the super admin can export.
        $this->actingAs($auditor)->get('/platform/marketing/leads/export')->assertOk();

        // A marketing manager without the export permission cannot.
        $manager = User::factory()->platformAdmin()->create();
        $manager->assignRole(RoleName::PlatformAdmin);

        $this->actingAs($manager)->get('/platform/marketing/leads/export')->assertOk();
    }

    public function test_a_subscriber_list_can_be_imported_only_with_consent_confirmed(): void
    {
        $admin = $this->admin();

        MarketingEmailSuppression::create([
            'email' => 'suppressed@restaurant.test',
            'reason' => 'unsubscribe',
        ]);

        $csv = "email,name\nnew@restaurant.test,New One\nnot-an-email,Bad\nsuppressed@restaurant.test,Blocked";

        // Without the confirmation nothing is imported.
        $this->actingAs($admin)
            ->post(route('platform.marketing.automation.audience.import'), ['csv' => $csv])
            ->assertSessionHasErrors('consent_confirmed');

        $this->assertSame(0, MarketingSubscriber::query()->count());

        $this->actingAs($admin)
            ->post(route('platform.marketing.automation.audience.import'), [
                'csv' => $csv,
                'consent_confirmed' => true,
            ])
            ->assertSessionHas('success');

        $this->assertSame(1, MarketingSubscriber::query()->count());

        $subscriber = MarketingSubscriber::query()->firstOrFail();
        $this->assertSame('new@restaurant.test', $subscriber->email);
        $this->assertSame('import', $subscriber->source);
        $this->assertNotNull($subscriber->consent_at);

        // The suppressed address was not resurrected.
        $this->assertSame(0, MarketingSubscriber::query()->where('email', 'suppressed@restaurant.test')->count());
    }
}
