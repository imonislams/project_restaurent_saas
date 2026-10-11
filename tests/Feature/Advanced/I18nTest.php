<?php

namespace Tests\Feature\Advanced;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class I18nTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    protected function owner(Tenant $tenant): User
    {
        $user = User::factory()->forTenant($tenant)->create();
        $user->assignRole(RoleName::TenantOwner);

        return $user;
    }

    public function test_the_locale_is_resolved_from_the_tenant_region_default(): void
    {
        $tenant = Tenant::factory()->create();
        $tenant->mergeSettings(['region' => ['locale' => 'bn']]);
        $tenant->save();

        $owner = $this->owner($tenant);
        app(TenantContext::class)->set($tenant);

        $this->actingAs($owner)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('locale', 'bn')->has('locales'));
    }

    public function test_a_user_can_switch_locale_and_it_persists(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);

        $this->actingAs($owner)->post('/locale', ['locale' => 'bn'])->assertRedirect();

        $this->assertSame('bn', $owner->fresh()->locale);
        $this->assertSame('bn', session('locale'));
    }

    public function test_an_unsupported_locale_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);

        $this->actingAs($owner)->post('/locale', ['locale' => 'zz'])->assertSessionHasErrors('locale');
    }

    public function test_validation_messages_are_localized(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        app(TenantContext::class)->set($tenant);

        $response = $this->actingAs($owner)
            ->withSession(['locale' => 'bn'])
            ->post('/customers', []);

        $response->assertSessionHasErrors('name');
        $this->assertStringContainsString('ক্ষেত্রটি আবশ্যক', session('errors')->first('name'));
    }
}
