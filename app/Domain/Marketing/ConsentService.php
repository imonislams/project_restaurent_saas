<?php

namespace App\Domain\Marketing;

use App\Domain\Marketing\Enums\ConsentCategory;
use App\Domain\Marketing\Models\MarketingConsentRecord;
use App\Domain\Marketing\Support\IpHasher;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Consent gating. Nothing non-essential is stored or dispatched without a grant,
 * and the history is append-only so it can be defended later.
 *
 * See docs/marketing/SECURITY.md §6.
 */
class ConsentService
{
    public function __construct(protected PlatformSettings $settings) {}

    public function enabled(): bool
    {
        return (bool) $this->settings->get('consent.banner_enabled', true);
    }

    public function version(): string
    {
        return (string) $this->settings->get('consent.version', '1');
    }

    /**
     * Whether tracking must be withheld until the visitor decides. When false the
     * site follows the configured default categories.
     */
    public function blocksBeforeConsent(): bool
    {
        return (bool) $this->settings->get('consent.block_before_consent', true);
    }

    public function retentionDays(): int
    {
        return max(1, (int) $this->settings->get('consent.retention_days', 400));
    }

    /** @return array<string, bool> */
    public function defaults(): array
    {
        $configured = $this->settings->get('consent.categories');

        if (is_array($configured) && $configured !== []) {
            return array_merge(ConsentCategory::defaults(), array_map(
                fn ($value) => (bool) $value,
                array_intersect_key($configured, ConsentCategory::defaults()),
            ));
        }

        return ConsentCategory::defaults();
    }

    /**
     * The visitor's effective category set: their latest record merged over the
     * defaults. Essential is always granted.
     *
     * @return array<string, bool>
     */
    public function current(?string $visitorId = null, ?User $user = null): array
    {
        $defaults = $this->defaults();

        if (! $this->enabled() && ! $this->blocksBeforeConsent()) {
            return array_map(fn () => true, $defaults);
        }

        $record = $this->latestRecord($visitorId, $user);

        if ($record === null) {
            return $defaults;
        }

        return array_merge($defaults, array_intersect_key(
            array_map(fn ($value) => (bool) $value, (array) $record->categories),
            $defaults,
        ));
    }

    /** Whether a category may be used for this visitor. */
    public function allows(ConsentCategory|string $category, ?string $visitorId = null, ?User $user = null): bool
    {
        $category = $category instanceof ConsentCategory ? $category : ConsentCategory::from($category);

        if (! $category->requiresConsent()) {
            return true;
        }

        return (bool) ($this->current($visitorId, $user)[$category->value] ?? false);
    }

    /**
     * Whether this visitor has actually made a choice.
     *
     * Distinct from `current()`, which falls back to the defaults: the banner must
     * not re-prompt a visitor who has already decided, and must not stay hidden for
     * one who has not.
     */
    public function hasRecord(?string $visitorId = null, ?User $user = null): bool
    {
        return $this->latestRecord($visitorId, $user) !== null;
    }

    /**
     * Record a consent decision. A change appends a new row; existing rows are
     * never modified.
     *
     * @param  array<string, bool>  $categories
     */
    public function record(
        array $categories,
        ?string $visitorId = null,
        ?string $action = null,
        ?Request $request = null,
        string $source = 'banner',
        ?User $user = null,
    ): MarketingConsentRecord {
        $categories = $this->normalise($categories);

        $action ??= $this->latestRecord($visitorId, $user) === null ? 'granted' : 'updated';

        return MarketingConsentRecord::create([
            'visitor_id' => $visitorId,
            'user_id' => $user?->getKey(),
            'tenant_id' => $user?->tenant_id,
            'categories' => $categories,
            'version' => $this->version(),
            'action' => $action,
            'ip_hash' => $request ? IpHasher::fromRequest($request) : null,
            'user_agent' => $request ? mb_substr((string) $request->userAgent(), 0, 500) : null,
            'source' => $source,
        ]);
    }

    /**
     * Withdraw consent — either specific categories or everything grantable.
     *
     * @param  list<string>  $categories
     */
    public function withdraw(
        ?string $visitorId = null,
        array $categories = [],
        ?Request $request = null,
        ?User $user = null,
        string $source = 'preference_center',
    ): MarketingConsentRecord {
        $current = $this->current($visitorId, $user);

        $targets = $categories === [] ? ConsentCategory::grantable() : $categories;

        foreach ($targets as $category) {
            if (array_key_exists($category, $current)) {
                $current[$category] = false;
            }
        }

        return $this->record($current, $visitorId, 'withdrawn', $request, $source, $user);
    }

    /**
     * Delete consent records past the configured retention window.
     *
     * @return int rows deleted
     */
    public function prune(): int
    {
        return MarketingConsentRecord::query()
            ->where('created_at', '<', Carbon::now()->subDays($this->retentionDays()))
            ->delete();
    }

    protected function latestRecord(?string $visitorId, ?User $user): ?MarketingConsentRecord
    {
        $query = MarketingConsentRecord::query()->latest('id');

        if ($visitorId !== null && $visitorId !== '') {
            $query->where('visitor_id', $visitorId);
        } elseif ($user !== null) {
            $query->where('user_id', $user->getKey());
        } else {
            return null;
        }

        return $query->first();
    }

    /**
     * @param  array<string, mixed>  $categories
     * @return array<string, bool>
     */
    protected function normalise(array $categories): array
    {
        $normalised = ConsentCategory::defaults();

        foreach ($categories as $key => $value) {
            if (array_key_exists($key, $normalised)) {
                $normalised[$key] = (bool) $value;
            }
        }

        // Essential is never optional.
        $normalised[ConsentCategory::Essential->value] = true;

        return $normalised;
    }
}
