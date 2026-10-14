<?php

namespace Tests\Feature\Communications;

use App\Domain\Communications\Sms\Providers\BulkSmsBdProvider;
use App\Domain\Communications\Sms\Providers\LogSmsProvider;
use App\Domain\Communications\Sms\Providers\SslWirelessSmsProvider;
use App\Domain\Communications\Sms\Providers\TwilioSmsProvider;
use App\Domain\Communications\Sms\SmsManager;
use App\Domain\PlatformSettings\PlatformSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SmsProviderTest extends TestCase
{
    use RefreshDatabase;

    protected function manager(): SmsManager
    {
        return app(SmsManager::class);
    }

    public function test_it_defaults_to_the_log_driver(): void
    {
        $this->assertSame('log', $this->manager()->activeDriver());
        $this->assertInstanceOf(LogSmsProvider::class, $this->manager()->driver());
    }

    public function test_an_unknown_driver_falls_back_to_log(): void
    {
        app(PlatformSettings::class)->set('sms.driver', 'carrier-pigeon', 'sms');

        $this->assertSame('log', $this->manager()->activeDriver());
    }

    public function test_the_active_driver_can_be_selected_and_resolves_its_provider(): void
    {
        $manager = $this->manager();
        $manager->setDriver('twilio');

        $this->assertSame('twilio', $manager->activeDriver());
        $this->assertInstanceOf(TwilioSmsProvider::class, $manager->driver());

        $manager->setDriver('ssl_wireless');
        $this->assertInstanceOf(SslWirelessSmsProvider::class, $manager->driver());

        $manager->setDriver('bulksmsbd');
        $this->assertInstanceOf(BulkSmsBdProvider::class, $manager->driver());
    }

    public function test_credentials_are_stored_encrypted_and_never_exposed(): void
    {
        $manager = $this->manager();
        $manager->setCredentials('ssl_wireless', ['api_token' => 'super-secret', 'sid' => 'store-1', 'sender_id' => 'MISE']);

        $this->assertSame(['api_token', 'sid', 'sender_id'], $manager->credentialKeys('ssl_wireless'));
        $this->assertTrue($manager->isConfigured('ssl_wireless'));

        // The raw value must not be readable in the database.
        $raw = \DB::table('platform_settings')->where('key', 'sms.credentials.ssl_wireless')->value('value');
        $this->assertStringNotContainsString('super-secret', (string) $raw);
    }

    public function test_incomplete_credentials_are_reported_as_unconfigured(): void
    {
        $manager = $this->manager();
        $manager->setCredentials('twilio', ['account_sid' => 'AC123']);

        $this->assertFalse($manager->isConfigured('twilio'));
    }

    public function test_the_ssl_wireless_driver_posts_to_the_provider(): void
    {
        Http::fake(['*' => Http::response(['status' => 'SUCCESS', 'sms_id' => 'SMS-1'], 200)]);

        $manager = $this->manager();
        $manager->setCredentials('ssl_wireless', ['api_token' => 'tok', 'sid' => 'store', 'sender_id' => 'MISE']);

        $result = $manager->resolve('ssl_wireless')->send('+8801712345678', 'hello');

        $this->assertTrue($result['ok']);
        $this->assertSame('SMS-1', $result['reference']);
    }

    public function test_the_twilio_driver_posts_to_the_provider(): void
    {
        Http::fake(['api.twilio.com/*' => Http::response(['sid' => 'SM123'], 201)]);

        $manager = $this->manager();
        $manager->setCredentials('twilio', ['account_sid' => 'AC123', 'auth_token' => 'tok', 'from' => '+15550001111']);

        $result = $manager->resolve('twilio')->send('+8801712345678', 'hello');

        $this->assertTrue($result['ok']);
        $this->assertSame('SM123', $result['reference']);
    }

    public function test_a_provider_failure_is_reported_not_thrown(): void
    {
        Http::fake(['*' => Http::response('boom', 500)]);

        $manager = $this->manager();
        $manager->setCredentials('ssl_wireless', ['api_token' => 'tok', 'sid' => 'store', 'sender_id' => 'MISE']);

        $result = $manager->resolve('ssl_wireless')->send('+8801712345678', 'hello');

        $this->assertFalse($result['ok']);
        $this->assertNotNull($result['error']);
    }
}
