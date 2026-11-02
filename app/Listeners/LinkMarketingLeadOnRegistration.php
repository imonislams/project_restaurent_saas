<?php

namespace App\Listeners;

use App\Domain\Marketing\Analytics\AttributionService;
use App\Domain\Marketing\LeadService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Log;

/**
 * Ties a new restaurant to the lead that produced it.
 *
 * This is how the customer journey closes: a lead captured from the contact form is
 * linked to the tenant created when that same person registers, so the CRM shows one
 * person with one timeline rather than a lead and a customer that never meet. The
 * tenant is linked, never duplicated, and when no lead matches nothing is created.
 *
 * Fail-safe: a problem here must never break registration, but it is logged rather
 * than silently swallowed.
 */
class LinkMarketingLeadOnRegistration
{
    public function __construct(
        protected LeadService $leads,
        protected AttributionService $attribution,
    ) {}

    public function handle(Registered $event): void
    {
        try {
            $user = $event->user;
            $tenant = $user?->tenant;

            if ($tenant === null || $user->email === null) {
                return;
            }

            // Attribute the customer to the campaign that produced them. Idempotent:
            // a repeated call writes nothing new.
            $this->attribution->attribute($tenant, $tenant->created_at ?? now());

            $lead = $this->leads->linkByEmail((string) $user->email, $tenant);

            if ($lead !== null) {
                Log::info('Marketing lead linked to a new restaurant.', [
                    'lead_id' => $lead->getKey(),
                    'tenant_id' => $tenant->getKey(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('Marketing lead could not be linked on registration.', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
