<?php

namespace Tests\Feature\Marketing;

use App\Domain\Marketing\ConsentService;
use App\Domain\Marketing\Enums\ConsentCategory;
use App\Domain\Marketing\Models\MarketingConsentRecord;
use App\Domain\PlatformSettings\PlatformSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Consent defaults, recording, withdrawal and retention.
 */
class MarketingConsentTest extends TestCase
{
    use RefreshDatabase;

    protected ConsentService $consent;

    protected function setUp(): void
    {
        parent::setUp();

        $this->consent = app(ConsentService::class);
    }

    public function test_nothing_non_essential_is_allowed_before_a_decision(): void
    {
        $defaults = $this->consent->current();

        $this->assertTrue($defaults['essential']);
        $this->assertFalse($defaults['analytics']);
        $this->assertFalse($defaults['advertising']);

        $this->assertTrue($this->consent->allows(ConsentCategory::Essential));
        $this->assertFalse($this->consent->allows(ConsentCategory::Analytics));
        $this->assertFalse($this->consent->allows(ConsentCategory::Advertising));
    }

    public function test_a_grant_is_recorded_with_its_version_and_source(): void
    {
        $visitorId = (string) Str::uuid();

        $record = $this->consent->record(
            ['analytics' => true, 'advertising' => false],
            $visitorId,
            request: Request::create('/privacy', 'POST'),
        );

        $this->assertSame('granted', $record->action);
        $this->assertSame($this->consent->version(), $record->version);
        $this->assertTrue($record->categories['analytics']);
        $this->assertTrue($record->categories['essential'], 'Essential consent cannot be withheld.');
        $this->assertNotNull($record->ip_hash);
        $this->assertNotSame('127.0.0.1', $record->ip_hash);
    }

    public function test_a_grant_takes_effect_immediately(): void
    {
        $visitorId = (string) Str::uuid();

        $this->consent->record(['analytics' => true], $visitorId);

        $this->assertTrue($this->consent->allows(ConsentCategory::Analytics, $visitorId));
        $this->assertFalse($this->consent->allows(ConsentCategory::Advertising, $visitorId));
    }

    public function test_the_history_is_append_only_and_records_a_withdrawal(): void
    {
        $visitorId = (string) Str::uuid();

        $first = $this->consent->record(['analytics' => true], $visitorId);
        $second = $this->consent->withdraw($visitorId);

        $this->assertSame(2, MarketingConsentRecord::query()->count());
        $this->assertSame('withdrawn', $second->action);
        $this->assertFalse($this->consent->allows(ConsentCategory::Analytics, $visitorId));

        // The earlier grant is untouched — it is history, not state.
        $this->assertTrue($first->fresh()->categories['analytics']);
    }

    public function test_withdrawing_a_single_category_leaves_the_others_alone(): void
    {
        $visitorId = (string) Str::uuid();

        $this->consent->record(['analytics' => true, 'advertising' => true], $visitorId);
        $this->consent->withdraw($visitorId, ['advertising']);

        $this->assertTrue($this->consent->allows(ConsentCategory::Analytics, $visitorId));
        $this->assertFalse($this->consent->allows(ConsentCategory::Advertising, $visitorId));
    }

    public function test_essential_is_forced_on_even_if_the_caller_tries_to_decline_it(): void
    {
        $visitorId = (string) Str::uuid();

        $record = $this->consent->record(['essential' => false, 'analytics' => true], $visitorId);

        $this->assertTrue($record->categories['essential']);
    }

    public function test_the_configured_version_is_stamped_on_new_records(): void
    {
        app(PlatformSettings::class)->set('consent.version', '2026-11', 'consent');

        $record = $this->consent->record(['analytics' => true], (string) Str::uuid());

        $this->assertSame('2026-11', $record->version);
    }

    public function test_records_past_the_retention_window_are_pruned(): void
    {
        app(PlatformSettings::class)->set('consent.retention_days', 30, 'consent');

        $old = MarketingConsentRecord::create([
            'visitor_id' => (string) Str::uuid(),
            'categories' => ['essential' => true, 'analytics' => true, 'advertising' => false],
            'version' => '1',
            'action' => 'granted',
            'source' => 'banner',
        ]);

        // created_at is not mass assignable — an append-only record's timestamp is
        // not something a caller gets to choose.
        $old->forceFill(['created_at' => Carbon::now()->subDays(60)])->save();

        $recent = $this->consent->record(['analytics' => true], (string) Str::uuid());

        $deleted = $this->consent->prune();

        $this->assertSame(1, $deleted);
        $this->assertNull($old->fresh());
        $this->assertNotNull($recent->fresh());
    }

    public function test_the_banner_can_be_switched_off_without_silently_granting_consent(): void
    {
        app(PlatformSettings::class)->set('consent.banner_enabled', false, 'consent');
        app(PlatformSettings::class)->set('consent.block_before_consent', true, 'consent');

        // The banner is off but tracking is still withheld: an operator cannot
        // switch consent off, only stop showing the prompt.
        $this->assertFalse($this->consent->allows(ConsentCategory::Analytics));
    }

    public function test_an_operator_may_explicitly_permit_tracking_without_a_banner(): void
    {
        app(PlatformSettings::class)->set('consent.banner_enabled', false, 'consent');
        app(PlatformSettings::class)->set('consent.block_before_consent', false, 'consent');

        $this->assertTrue($this->consent->allows(ConsentCategory::Analytics));
        $this->assertTrue($this->consent->allows(ConsentCategory::Advertising));
    }
}
