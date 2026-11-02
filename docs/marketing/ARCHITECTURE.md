# Marketing & Growth Center — Architecture

**Related:** [PRD.md](./PRD.md) · [DATA-MODEL.md](./DATA-MODEL.md) · [METRICS.md](./METRICS.md) ·
[INTEGRATIONS.md](./INTEGRATIONS.md) · [SECURITY.md](./SECURITY.md) · [ROADMAP.md](./ROADMAP.md)

---

## 1. Placement in the existing system

The Marketing & Growth Center is **one more bounded context** in the existing modular
monolith. It introduces no new framework, no new access mechanism and no new storage
technology.

| Concern | Existing mechanism reused |
|---|---|
| Access | `['auth', 'platform']` route group + `platform.permission:<slug>` middleware |
| Controllers | `app/Http/Controllers/Platform/Marketing/*`, thin, returning `Inertia::render` |
| Business logic | `app/Domain/Marketing/**` services, matching the existing `app/Domain/<Context>` layout |
| Settings | `platform_settings` KV (JSON-encoded values, optional `Crypt::encryptString`) |
| Secrets | `encrypted:array` cast, key-names-only exposure — the `payment_gateways` pattern |
| Audit | `AuditLogger` → `audit_logs`, with `marketing.*` action names |
| Email transport | `MailConfigurator` (admin-configured SMTP/API mailer), `EmailLogger` → `email_logs` |
| Templates | `email_templates` + `EmailTemplateService` + `RichTextEditor` |
| Discounts | `CouponService` (validation, auto-apply, settlement redemption) |
| Revenue truth | `Subscription`, `SubscriptionInvoice`, `PlatformPayment`, `CouponRedemption` |
| Analytics | `PlatformAnalyticsService` (MRR/ARR/churn), extended rather than replaced |
| Queue | database driver, `ShouldQueue` jobs with `tries`/`backoff`, IDs passed not models |
| Scheduler | `bootstrap/app.php` `withSchedule()`, heartbeat via `scheduled_task_runs` |
| Alerts | `PlatformNotificationService` (database notification + `PlatformAlert` broadcast) |
| Charts | recharts via the existing `Components/charts/*` wrappers |
| Tables | `Components/ui/DataTable` + `Pagination` (server-side) |
| Period filter | `Components/ui/PeriodFilter`, extended with the required presets |
| CSV | streamed `fputcsv` responses, as in `Platform\TenantController::export` |

## 2. Domain layout

```
app/Domain/Marketing/
├── Models/                      one model per table (see DATA-MODEL.md)
├── Enums/
│   ├── MarketingChannel.php     meta_ads, google_ads, organic, email, social,
│   │                            referral, affiliate, direct, content, other
│   ├── CampaignStatus.php       draft, scheduled, active, paused, completed, archived
│   ├── LeadStatus.php           new, contacted, qualified, demo_scheduled, demo_completed,
│   │                            trial_started, proposal_sent, converted, lost
│   ├── LeadSource.php           contact_form, demo_form, registration, landing_page,
│   │                            newsletter, import, manual, referral
│   ├── ConsentCategory.php      essential, analytics, advertising
│   ├── IntegrationStatus.php    not_configured, disabled, configured, connected, error
│   ├── EventName.php            the tracked-event catalog
│   ├── AttributionModel.php     first_touch, last_touch
│   ├── AutomationTrigger.php    lead_created, demo_requested, registration_incomplete,
│   │                            tenant_created, trial_started, trial_ending,
│   │                            invoice_unpaid, period_ending, payment_failed,
│   │                            subscription_cancelled, inactive_tenant, usage_threshold
│   ├── StepType.php             email, wait, condition, action
│   └── DeviceCategory.php       desktop, mobile, tablet, bot
├── Contracts/
│   ├── MarketingProvider.php    the provider SPI (below)
│   └── MarketingMailer.php      provider-independent promotional send
├── Providers/                   one class per integration provider
├── Google/
│   ├── GoogleConnection.php     OAuth2 + refresh, or service-account assertion
│   ├── GoogleAnalyticsClient.php
│   ├── SearchConsoleClient.php
│   └── GoogleAdsClient.php
├── Seo/                         SeoService, SitemapService, RobotsService,
│                                RedirectService, SeoAuditService
├── Email/                       EmailMarketingService, SegmentService,
│                                SuppressionService, TrackingTokens
├── Mail/                        SmtpMarketingMailer (uses the platform mailer)
├── Automation/                  AutomationService, AutomationRunner, Triggers/
├── Analytics/                   MarketingAnalyticsService, AttributionReportingService
├── Reporting/                   MarketingReportService
├── Insights/                    InsightService
└── Support/                     UserAgent, IpHasher, BotDetector, UrlSanitizer
```

Services are plain classes at the domain root with constructor-injected dependencies,
matching `SubscriptionService` / `CouponService`. Controllers validate, call a service,
write an audit entry and return.

## 3. The provider SPI

External integrations are pluggable so a second ad network, analytics vendor or ESP can be
added without touching core logic. This mirrors `PlatformGateway` + `GatewayProviderRegistry`
exactly.

```php
interface MarketingProvider
{
    /** Stable key, e.g. 'meta_conversions'. */
    public function key(): string;

    /** Human label for the integrations screen. */
    public function label(): string;

    /** @return list<string> e.g. ['pixel', 'conversions', 'audiences'] */
    public function capabilities(): array;

    /** @return list<string> credential keys the provider cannot work without. */
    public function requiredCredentialKeys(): array;

    /** @return array{ok: bool, error: ?string, detail: array<string, mixed>} */
    public function testConnection(MarketingIntegration $integration): array;

    /** @return array<string, mixed> Non-secret diagnostics for the UI. */
    public function diagnostics(MarketingIntegration $integration): array;
}
```

Event delivery is a second, narrower contract implemented only by providers that receive
server-side events (`meta_conversions`, `google_analytics`, and later an ESP):

```php
interface DispatchesMarketingEvents
{
    /** @return array{ok: bool, http_status: ?int, response: ?string, error: ?string} */
    public function dispatch(MarketingIntegration $integration, MarketingEvent $event): array;
}
```

`MarketingIntegrationRegistry` holds the `SCHEMA` map: provider key → label, credential
fields (name, label, `secret` flag, `required` flag, help text), capabilities and docs URL.
The UI renders from the registry; adding a provider is one class plus one schema entry.

## 4. Event pipeline

```
browser  ──POST /marketing/events──▶  MarketingEventService::record()
   │                                        │
   │  (consent checked first)               ├─ dedupe on event_id (uuid)
   │                                        ├─ resolve/refresh visitor
   │                                        ├─ enrich: UTMs, channel, device, country
   │                                        ├─ persist marketing_events
   │                                        └─ dispatch DispatchMarketingEventJob per
   │                                           provider that is connected AND consented
   │
server   ──domain action──────────▶  MarketingEventService::record()
          (registration, trial,              (server-side truth; no client trust)
           checkout, payment)
```

`DispatchMarketingEventJob`:
- re-reads the event and the integration inside the job (IDs only are serialized);
- writes a `marketing_event_deliveries` row keyed **unique (provider, external_event_id)**,
  which is the dedupe guarantee — replaying the job cannot send twice;
- honours `$tries = 3` with `backoff = [10, 60, 300]`; a 429/5xx is retried, a 4xx is
  terminal and recorded;
- hashes match keys (email, phone, name, country, city) with SHA-256 before sending, and
  never sends restaurant end-customer data;
- reads `marketing_integrations.credentials` through the encrypted cast, so the token exists
  only in memory.

Confirmed conversions are also written to `marketing_attributions` so revenue reporting does
not depend on the ad platform's own attribution.

## 5. Attribution

- A first-party `md_vid` visitor id (UUID, 13-month, `SameSite=Lax`) is issued by
  `TrackMarketingVisit`. It is **not** a tracking cookie in the advertising sense: it is
  first-party, server-readable and disclosed in the cookie policy.
- Every visit records first-touch and last-touch context on `marketing_visitors`.
- On a conversion event (registration, subscription start, payment settled),
  `AttributionService` writes up to two `marketing_attributions` rows — one per model —
  guarded by **unique (tenant_id, model)** so a conversion can never be double-counted.
- The attribution window (default 30 days, configurable) bounds how old a touchpoint may be
  to qualify; a touchpoint outside the window is not attributed.
- Referral and UTM capture happen on the first party visit; the `logger`/`referrer` value is
  retained as-is but never used to overwrite an existing UTM set.
- Revenue is read from `subscription_invoices` (settled only) and converted to the
  attribution currency **per currency** — never summed across currencies.

## 6. Consent

`ConsentService` is consulted **before** any non-essential write or dispatch:

| Category | Behaviour |
|---|---|
| `essential` | Always on (session, CSRF, the consent record itself) |
| `analytics` | Required for `marketing_events`, GA4 and GTM script injection |
| `advertising` | Required for the Meta Pixel and Conversions API dispatch |

With consent absent or withdrawn:
- no script tag is rendered for that category;
- `MarketingEventService::record()` stores nothing for that category;
- any already-queued dispatch re-checks consent at send time and is skipped with the reason
  recorded — so withdrawal takes effect even for in-flight work.

Records are append-only in `marketing_consent_records` with a version and the category set,
giving a defensible audit trail. Retention is enforced by `marketing:prune-events`.

The third-party IP geolocation used today by `use-pricing-region.ts` (ipwho.is, ipinfo.io) is
**gated on analytics consent** and the `pricing_country` cookie is disclosed in the cookie
policy as part of this work — closing an existing gap.

## 7. Jobs

| Job | Trigger | Behaviour |
|---|---|---|
| `DispatchMarketingEventJob` | Event recorded | Delivers one event to one provider; dedupe row; retries; records terminal errors |
| `SendMarketingEmailJob` | Campaign send / automation step | One recipient per job; checks suppression + consent + subscriber status at send time; rate limited; writes `marketing_email_sends` |
| `RunAutomationStepJob` | `marketing:run-automations` | Executes one step for one enrolment; idempotency key (enrolment, step, attempt) |
| `SyncMarketingIntegrationJob` | `marketing:sync-integrations`, or "Sync now" | Pulls GA4/GSC/Ads data; writes `marketing_sync_logs`; updates health |
| `EvaluateMarketingInsightsJob` | `marketing:evaluate-alerts` | Evaluates rules, writes `marketing_insights`, raises a platform alert |
| `RunSeoAuditJob` | `marketing:seo-audit`, or "Run audit" | Crawls this site's own public routes; writes findings |

All are `ShouldQueue` with explicit `tries` and `backoff`; a failure surfaces through the
existing `NotifyPlatformOnFailedJob` listener, so a failed marketing job raises a platform
alert rather than disappearing.

## 8. Scheduler additions

Added to `bootstrap/app.php` → `withSchedule()` alongside the existing eleven entries:

```php
$schedule->command('marketing:run-automations')->everyFiveMinutes()->withoutOverlapping();
$schedule->command('marketing:sync-integrations')->hourly()->withoutOverlapping();
$schedule->command('marketing:evaluate-alerts')->hourly()->withoutOverlapping();
$schedule->command('marketing:generate-sitemap')->dailyAt('05:00');
$schedule->command('marketing:seo-audit')->weeklyOn(1, '05:30');
$schedule->command('marketing:prune-events')->dailyAt('04:30');
```

Each records a run in `scheduled_task_runs` through the existing listener, so "configured" is
never confused with "ran".

## 9. Middleware

| Middleware | Where | Behaviour |
|---|---|---|
| `TrackMarketingVisit` | public site (web) | Issues/reads `md_vid`, upserts `marketing_visitors`, records a pageview event. **Wrapped so any failure is swallowed** — marketing must never break a page render |
| `ApplySeoMetadata` | public site (web) | Resolves the `seo` prop (stored metadata or inherited default) |
| `HandleMarketingRedirect` | fallback (after routing) | Looks up an active redirect for the missed path, follows chains with a depth guard, records the hit |

## 10. Server-side head rendering (SEO)

The app is Inertia without SSR, so `<Head>` output only exists after JavaScript runs. Crawlers
therefore saw a bare `<title>Touch Dine</title>`. The fix requires **no SSR build**: Inertia
passes the whole page object to the root Blade view, which already uses it
(`resources/js/Pages/{$page['component']}.tsx`), so the same object can render metadata
server-side.

In `resources/views/app.blade.php`:

```blade
@php $seo = $page['props']['seo'] ?? null; @endphp
<title>{{ $seo['title'] ?? config('app.name') }}</title>
@if ($seo)
    <meta name="description" content="{{ $seo['description'] }}">
    <link rel="canonical" href="{{ $seo['canonical'] }}">
    <meta name="robots" content="{{ $seo['robots'] }}">
    <meta property="og:title" content="{{ $seo['og_title'] }}"> … etc
    @if ($seo['schema']) <script type="application/ld+json">{!! $seo['schema'] !!}</script> @endif
@endif
```

`ApplySeoMetadata` supplies `seo` for public routes. During client-side navigation
`MarketingHead` keeps the tags current, so both first paint and SPA navigation are correct.
`@inertiaHead` stays for SSR compatibility if SSR is added later.

**Root-cause fixes delivered here:**
- the title double-suffix (both the `app.tsx` title callback and `MarketingHead` append the
  brand) is resolved so a page title is composed once;
- `Welcome` and `Marketing/Pricing` stop bypassing `MarketingHead` and gain canonical, OG,
  robots and JSON-LD;
- unknown `/resources/{slug}` returns **404** instead of 200 with fallback content;
- `/sitemap.xml` and `/robots.txt` are generated from admin configuration, replacing static
  files whose host was hardcoded and whose URLs had drifted from the published articles. The
  static files remain the fallback when generation is disabled.

## 11. Frontend structure

```
resources/js/
├── Layouts/PlatformLayout.tsx          + the 9 Marketing & Growth nav groups
├── Layouts/AppShell.tsx                + optional collapsible NavGroup (additive)
├── Pages/Platform/Marketing/**         one directory per group, one page per entry
├── Components/Growth/**                marketing-console components
│   ├── KpiBlock.tsx · FunnelChart.tsx · ChannelChart.tsx · CohortTable.tsx
│   ├── IntegrationCard.tsx · ProviderCredentialForm.tsx · EventStatusBadge.tsx
│   ├── LeadKanban.tsx · LeadTimeline.tsx · LeadDrawer.tsx
│   ├── CampaignForm.tsx · UtmBuilder.tsx · LandingPageBuilder.tsx
│   ├── WorkflowBuilder.tsx · TemplatePicker.tsx · DeliveryReport.tsx
│   ├── SeoPreview.tsx · SitemapPreview.tsx · RobotsEditor.tsx · RedirectTable.tsx
│   ├── ConsentBanner.tsx · PreferenceCenter.tsx
│   └── MarketingFilters.tsx            period + channel + campaign + country + device + plan
└── Components/Marketing/**             existing PUBLIC site components (unchanged namespace)
```

`Components/Growth/**` is deliberate: `Components/Marketing/**` already holds the public
website components, and the two must not be confused.

**Public-site additions** live with the existing marketing components: a consent
banner/provider mounted by `MarketingLayout`, a `TrackingScripts` component that emits the
configured pixel/GTM/GA4 tags **per consent category**, and the landing-page renderer.

**Landing page sections** reuse existing blocks (hero, feature grid, pricing, testimonial,
CTA, FAQ, lead form) driven by a JSON section schema in `marketing_landing_pages.sections`.
No second builder.

**i18n.** All existing `Pages/Platform/*` screens are English-only by convention and the
marketing console follows that. Every **public-facing** new string (consent banner,
preference centre, unsubscribe page, landing-page chrome) is added to both `en` and `bn` in
`resources/js/i18n/translations.ts`.

**Design.** Follows [docs/DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md): `PlatformLayout` + `Card`,
`Badge`, `DataTable`, `PageHeader`, `KpiCard`, `EmptyState`, `ConfirmDialog`, `Toast`;
semantic tokens (`bg-card`, `text-muted-foreground`, `border-border`); status never conveyed
by colour alone; dense and calm — no gradients, no decorative motion on admin screens;
loading, empty, error and success states on every screen.

## 12. Public routes added

| Route | Purpose |
|---|---|
| `GET /lp/{slug}` | Published landing page (404 when unpublished) |
| `GET /m/o/{token}` | Open-tracking pixel (1×1 GIF, no cache) |
| `GET /m/c/{token}` | Click-tracking redirect to the target URL |
| `GET /m/u/{token}` | Unsubscribe page + action (signed, one-click) |
| `POST /marketing/events` | Client event ingestion — throttled, CSRF-protected, consent-gated |
| `GET /sitemap.xml` | Generated sitemap (static file fallback) |
| `GET /robots.txt` | Generated robots (static file fallback) |

## 13. Failure isolation

Marketing is a **secondary concern**. Consistent with the existing fail-safe convention:

- `TrackMarketingVisit`, the consent write and the visitor upsert swallow their own failures
  (logged, never thrown) — an un-migrated or unhealthy marketing table cannot break a public
  page render;
- a provider outage never blocks a registration, trial start or payment: delivery is queued
  and retried, and the conversion is still recorded locally;
- email campaign failures are per-recipient, so one bad address cannot abort a send;
- every failure is **visible**: `last_error` on the integration card, the failed row in
  `marketing_event_deliveries`, the failed recipient in the delivery report, and the platform
  alert from `NotifyPlatformOnFailedJob`.
