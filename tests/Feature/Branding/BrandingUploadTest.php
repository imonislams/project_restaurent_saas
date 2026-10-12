<?php

namespace Tests\Feature\Branding;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BrandingUploadTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->user = User::factory()->forTenant($this->tenant)->create();
        $this->user->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
    }

    /** Real 1×1 PNG bytes so the `image` rule passes without GD. */
    protected function upload(string $name = 'logo.png', string $mime = 'image/png'): UploadedFile
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        $path = tempnam(sys_get_temp_dir(), 'img');
        file_put_contents($path, $png);

        return new UploadedFile($path, $name, $mime, null, true);
    }

    public function test_a_user_can_upload_a_profile_photo(): void
    {
        Storage::fake('public', ['url' => 'http://localhost/storage']);

        $this->actingAs($this->user)
            ->post('/profile/photo', ['photo' => $this->upload('me.png')])
            ->assertRedirect();

        $this->user->refresh();
        $this->assertNotNull($this->user->avatar_path);
        Storage::disk('public')->assertExists($this->user->avatar_path);
        $this->assertStringContainsString('/storage/', (string) $this->user->avatar_url);
    }

    public function test_a_non_image_file_is_rejected(): void
    {
        Storage::fake('public', ['url' => 'http://localhost/storage']);

        $this->actingAs($this->user)
            ->post('/profile/photo', ['photo' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf')])
            ->assertSessionHasErrors('photo');

        $this->assertNull($this->user->fresh()->avatar_path);
    }

    public function test_a_profile_photo_can_be_removed(): void
    {
        Storage::fake('public', ['url' => 'http://localhost/storage']);

        $this->actingAs($this->user)->post('/profile/photo', ['photo' => $this->upload()])->assertRedirect();
        $path = $this->user->fresh()->avatar_path;

        $this->actingAs($this->user->fresh())->delete('/profile/photo')->assertRedirect();

        $this->assertNull($this->user->fresh()->avatar_path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_a_tenant_can_upload_a_restaurant_logo(): void
    {
        Storage::fake('public', ['url' => 'http://localhost/storage']);

        $this->actingAs($this->user)
            ->post('/settings/logo', ['logo' => $this->upload('brand.png')])
            ->assertRedirect();

        $this->tenant->refresh();
        $this->assertNotNull($this->tenant->logo_path);
        Storage::disk('public')->assertExists($this->tenant->logo_path);
        $this->assertStringContainsString('/storage/', (string) $this->tenant->logo_url);
    }

    public function test_uploading_a_new_logo_replaces_the_previous_file(): void
    {
        Storage::fake('public', ['url' => 'http://localhost/storage']);

        $this->actingAs($this->user)->post('/settings/logo', ['logo' => $this->upload('first.png')])->assertRedirect();
        $first = $this->tenant->fresh()->logo_path;

        $this->actingAs($this->user)->post('/settings/logo', ['logo' => $this->upload('second.png')])->assertRedirect();
        $second = $this->tenant->fresh()->logo_path;

        $this->assertNotSame($first, $second);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);
    }

    public function test_a_user_without_settings_permission_cannot_upload_a_logo(): void
    {
        Storage::fake('public', ['url' => 'http://localhost/storage']);

        $cashier = User::factory()->forTenant($this->tenant)->create();
        $cashier->assignRole(RoleName::Cashier);

        $this->actingAs($cashier)
            ->post('/settings/logo', ['logo' => $this->upload()])
            ->assertForbidden();

        $this->assertNull($this->tenant->fresh()->logo_path);
    }

    public function test_the_logo_and_avatar_urls_are_shared_with_the_frontend(): void
    {
        Storage::fake('public', ['url' => 'http://localhost/storage']);

        $this->actingAs($this->user)->post('/settings/logo', ['logo' => $this->upload()])->assertRedirect();
        $this->actingAs($this->user)->post('/profile/photo', ['photo' => $this->upload('me.png')])->assertRedirect();

        $this->assertNotNull($this->tenant->fresh()->logo_path, 'logo not persisted');
        $this->assertNotNull($this->user->fresh()->avatar_path, 'avatar not persisted');

        $this->actingAs($this->user->fresh())
            ->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->where('tenant.logo_url', fn ($url) => is_string($url) && str_contains($url, '/storage/'))
                ->where('auth.user.avatar_url', fn ($url) => is_string($url) && str_contains($url, '/storage/')));
    }
}
