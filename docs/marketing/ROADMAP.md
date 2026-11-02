# Marketing & Growth Center — Roadmap

**Related:** [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATA-MODEL.md](./DATA-MODEL.md) ·
[INTEGRATIONS.md](./INTEGRATIONS.md) · [docs/ROADMAP.md](../ROADMAP.md)

Nine phases. **Each phase ends with a written report and an approval gate** — the next phase does
not begin until the report has been reviewed. Within an approved phase, work runs end to end
(implementation → tests → typecheck → build → written report).

---

## Working agreement

| Rule | Detail |
|---|---|
| Discovery first | Complete. Findings are in [PRD.md §1](./PRD.md) and the section 1 table of the plan. |
| Documentation first | This document set is written **before** any migration. |
| Additive only | No existing table is dropped, truncated or rewritten; no existing row is modified. |
| Reuse before build | Settings, audit, templates, email log, coupons, subscriptions and the provider-registry pattern are all reused. |
| Honest reporting | A phase report states what is finished, what is blocked, what is unverified, and which tests actually ran. |
| Deterministic verification | `php artisan migrate` + `migrate:rollback` · `php artisan test` · `npx tsc --noEmit` · `npm run build` · `vendor/bin/pint --test`. |
| No live provider calls in tests | All external HTTP is faked; no test or development environment sends a real marketing email or advertising event. |
| Tenant safety | Every phase re-runs the existing tenant-isolation and POS/ordering suites to prove nothing regressed. |

---

## Phase 0 — Documentation — **complete**

**Deliverables:** `docs/marketing/README.md`, `PRD.md`, `ARCHITECTURE.md`, `DATA-MODEL.md`,
`METRICS.md`, `INTEGRATIONS.md`, `SECURITY.md`, `ROADMAP.md`; index link added to
`docs/README.md`.

**Gate:** documentation reviewed before a single migration is written.

---

## Phase 1 — Core infrastructure — **complete**

**Delivered**

- The 13 migrations from [DATA-MODEL.md §10](./DATA-MODEL.md), applied and rolled back cleanly on
  MySQL, and reversible under the existing `PlatformReadinessTest` assertion.
- `app/Domain/Marketing/`: 12 enums, 26 models, the `MarketingProvider` SPI, the
  `MarketingIntegrationRegistry` schema, `MarketingProviderManager`, `MarketingIntegrationService`,
  `VisitorTracker`, `MarketingEventService`, `ConsentService`, `MarketingOverviewService` and
  `Support/IpHasher`.
- Six new `platform.marketing.*` permissions in the catalog, the role seeder and a data
  migration. Default split: super admin and platform owner hold all 8 (including
  `integrations.manage`), platform admin holds 7, platform auditor holds 3.
- The `platform.marketing.*` route group with the dashboard, plus the Marketing & Growth sidebar
  section and additive collapsible-group support in `AppShell`.
- `Components/Growth/KpiBlock`, `Components/ui/Alert`, and a `PeriodFilter` extended with
  today / yesterday / last 7 / 30 / 90 days / 12 months / custom — additive for existing callers.
- The Marketing Dashboard, rendering real figures across the four availability states.
- 79 automated tests covering access control, credential handling, event tracking, consent and
  the dashboard arithmetic.

**Verification performed:** `php artisan migrate` + `migrate:rollback --step=13` clean on MySQL ·
838 tests passing (4,928 assertions), including the pre-existing platform, tenant-isolation, POS,
QR, billing and security suites · `npx tsc --noEmit` clean · `npm run build` succeeded ·
`vendor/bin/pint` clean on all new files.

**Deviations from the planned phase, and why**

1. **Sidebar entries appear only once their page exists.** The nine sub-groups are added as their
   phases land, rather than shipping ~40 links to unbuilt screens — a link that goes nowhere is
   exactly the placeholder this workspace must not contain. Phase 1 contributes one group
   (`Marketing & Growth`) holding the dashboard.
2. **`IntegrationCard` was not built.** It renders integration configuration for drivers that do
   not exist until Phase 2, and an unused component is dead code. It ships with Phase 2.
3. **The tenant-blast email campaigns moved** from `/platform/marketing/campaigns` to
   `/platform/marketing/automation/campaigns`, freeing `/platform/marketing/campaigns` for real
   campaigns in Phase 4. A temporary GET redirect keeps old bookmarks working and is removed in
   Phase 4. Announcements moved into the *Communications* section (routes unchanged).
4. **`PlatformPeriod` gained `yesterday`, `90d` and `12m` presets**; existing preset behaviour is
   unchanged.

**Gate:** approve the schema, the permission split and the navigation before provider work begins.

---

## Phase 2 — Tracking & analytics — **complete**

**Delivered**

- Six provider drivers behind the registry: Meta Pixel, Meta Conversions API, GA4, GTM,
  Search Console and Google Ads, each exposed through `marketing.provider.*` container
  bindings so the core names no provider class.
- `GoogleConnection` with **both** credential styles — an OAuth 2.0 refresh-token flow and a
  service-account JWT assertion signed with `openssl_sign` — plus token caching and a
  `invalid_grant` message that tells the operator to reconnect rather than showing an empty report.
- `DispatchMarketingEventJob`: a unique `(provider, external_event_id)` row as the dedupe
  guarantee, consent re-checked at send time, 429/5xx retried with backoff, other 4xx recorded
  as terminal, and `failed()` stamping a delivery the queue gave up on.
- `SyncMarketingIntegrationJob`: GA4, Search Console and Google Ads pulls into stamped
  snapshots, with Ads spend written as real `google_ads`-sourced records.
- The consent layer: `ConsentBanner` + preference centre, `TrackingScripts` (consent mode
  default emitted before any container, nothing injected for a denied category), the
  `/marketing/events` and `/marketing/consent` endpoints, and the first-party visitor id.
- Eight screens: Integrations (+ API credentials), Tracking Pixels (Meta Pixel / CAPI / Event
  mapping / Test events), Google Analytics & Tag Manager, Search Console, Google Ads, Event
  Manager, Tracking Preferences and Consent & Privacy.
- **Server-side SEO head**: `ApplySeoMetadata` resolves the metadata and `app.blade.php`
  renders title, description, canonical, robots, Open Graph, Twitter card and JSON-LD into the
  first response. Verified from the raw HTML of a running server (see below).

**Verification performed:** 861 tests passing (5,094 assertions) · `npx tsc --noEmit` clean ·
`npm run build` succeeded · a live `php artisan serve` response contains the full metadata block
with the brand appended exactly once, and `/resources/{unknown}` returns 404 ·
`vendor/bin/pint` clean on all new files.

**Root-cause fixes delivered:** the title double-suffix; `Welcome` and `Pricing` bypassing
`MarketingHead`; the soft-404 on unknown resource slugs; and the sitemap's resource URLs, which
named five guides the site never published.

**Deviations from the planned phase, and why**

1. **The visitor id is issued only by the consent endpoint.** The plan implied the visit
   middleware would mint it. Minting an identifier on a first page view that stores nothing is
   still handing out an identifier before consent, so a GET now stores nothing at all and the
   cookie is created when the visitor answers the banner.
2. **The IP-geolocation fallback is disclosed, not consent-gated.** Gating it would break
   region-appropriate pricing for anyone who declines analytics — the exact defect the region
   work exists to avoid. It is a functional request, now disclosed in the preference centre.
3. **`IntegrationCard` landed here**, as planned last phase, and is now used by five screens.
4. **The default Open Graph image points at `/icon-512.png`.** The previous default was an SVG
   favicon (unsupported by social scrapers) and the planned `/og-default.png` does not exist;
   a real 512px asset does.

---

## Phase 3 — SEO management — **complete**

**Delivered**

- `SitemapService` — the URL list is derived from the same `MarketingController` slug
  constants the router uses, so the sitemap cannot advertise a page the site does not serve.
  Private prefixes are excluded by construction, per-path exclusions are stored, and the XML is
  cached and regenerated on demand.
- `RobotsService` — generated default (including `/qr/` and `/payments/`, which the static file
  missed), a validator that refuses unknown directives and a missing `User-agent`, and warnings
  for contradictory or self-defeating rules.
- `RedirectService` — 301/302/307/308 with duplicate detection, **loop detection that names the
  chain**, a five-hop limit, bulk CSV import/export, hit counting, and a runtime chain walk with
  its own depth guard. Applied by a framework fallback route, so an admin redirect really serves.
- `SeoAuditService` — title/description length, canonical host and absoluteness, noindex on a
  public page, duplicate titles and descriptions, sitemap membership, redirects that shadow a
  live route, and missing homepage schema. It audits the metadata generation produces rather
  than a crawled snapshot, and says so on the screen.
- Seven screens: SEO Dashboard (with the audit), Website SEO (globals / schema / social /
  verification), Page Meta Tags with a search-result preview, Sitemap, robots.txt, Redirects and
  SEO Performance.
- The site-wide defaults, per-page overrides (a blank field inherits again) and a Google
  verification token rendered into `<head>`.

**Verification performed:** 888 tests passing (5,689 assertions) · live `php artisan serve`
confirms `/sitemap.xml` returns 46 generated URLs with `X-Sitemap-Source: generated`, and
`/robots.txt` returns the generated default · generated XML parses with the sitemap namespace ·
`npx tsc --noEmit` clean · `npm run build` succeeded · `vendor/bin/pint` clean on new files.

**Root-cause fix found only by the live check:** `public/sitemap.xml` and `public/robots.txt`
physically shadowed the routes — the web server served the files before Laravel was reached, so
the generated versions were unreachable. The files moved to `storage/app/seo/*.static.*` (kept as
the fallback) and the public copies were removed.

**Deviations from the planned phase, and why**

1. **The audit inspects generated metadata, not fetched HTML.** A real crawl would need the app
   to reach itself over the network, which is unreliable on shared hosting and unavailable in
   tests. The screen states exactly what it checked so the report cannot be mistaken for a crawl.
2. **The redirect chain limit is five hops**, enforced at save and at request time.

---


## Phase 4 — Campaigns & CRM

**Deliverables**

- Campaigns (list ↔ calendar), `MarketingCampaignService`, spend entries with a labelled
  `source`.
- UTM Builder preserving existing query parameters.
- Landing pages: section schema, builder, preview, publish (gated on `marketing.publish`),
  public rendering at `/lp/{slug}` using existing marketing blocks.
- Promotional Offers over the **unchanged** `CouponService`, with `marketing_campaign_id`
  association, and the coupon-campaigns and redemptions views.
- Lead CRM: `LeadService` (capture, dedupe, assignment, status transitions, conversion
  linking), table ↔ Kanban, detail with activity timeline, follow-ups, sources & conversion,
  CSV export.
- **The contact/demo form now persists** — with throttle, honeypot, consent capture and full
  UTM attribution. Registration links the lead to the created tenant without duplicating the
  customer.

**Verification**

- Submitting the contact form creates exactly one lead carrying its UTM chain; a second
  identical submission dedupes rather than duplicating.
- Converting a lead links it to the tenant and sets `tenant_id`/`converted_at`; the tenant is
  not duplicated.
- Coupon rules are still enforced entirely by `CouponService` (existing coupon tests still
  pass, plus new ones for the campaign association).
- The contact endpoint is throttled; the honeypot rejects a filled trap field.
- Landing-page publish requires the permission and an unpublished page 404s publicly.

**Gate:** approve the CRM and campaign flows before automation is layered on them.

---

## Phase 5 — Marketing automation

**Deliverables**

- Email campaigns over the **existing** `campaigns` table (extended), with builder, template and
  segment selection, scheduling with timezone, test send, per-recipient delivery rows and the
  delivery report.
- Marketing templates through the existing `email_templates` + `RichTextEditor` + live preview +
  test send.
- Audience: segments (dynamic rules / static), subscribers, suppression list, consent view.
- Automation workflows: builder over trigger → conditions → delay → action, activation,
  enrolments and per-step execution log.
- The **14 sequences from [PRD.md §6.6](./PRD.md) seeded as presets** (`is_system = true`).
- `SendMarketingEmailJob` and `RunAutomationStepJob`: queued, rate limited, one recipient per
  job, idempotent, checking suppression and consent **at send time**.
- Open pixel, click redirect, signed one-click unsubscribe; every send recorded in the existing
  `email_logs`.

**Verification**

- A campaign of N recipients produces N delivery rows and N `email_logs` entries; "sent" is
  reported only after the transport accepted the message.
- Replaying a step produces no duplicate email (idempotency key asserted).
- An unsubscribed or suppressed address is refused on the next promotional send, while
  transactional mail (invoice) to the same address still goes out.
- A withdrawal of consent stops an already-queued automation email, with the reason recorded.
- Bounce metrics show *not available* with the reason when no ESP is connected — asserted, so
  the limitation cannot silently turn into a fabricated number.

**Gate:** approve automation behaviour before growth analytics is computed from it.

---

## Phase 6 — Growth analytics & attribution

**Deliverables**

- `AttributionService` writing first-touch and last-touch rows (unique per customer per model),
  window-bounded, with direct traffic reported rather than dropped.
- `MarketingAnalyticsService`: the 10-step funnel with drop-off, acquisition by
  country/campaign/type/plan, subscription analytics, churn & retention with monthly cohorts,
  renewal and reactivation rates, observed LTV, CAC, ROAS and campaign ROI — **all per currency**.
- Screens: Conversion Funnel, Revenue Attribution, Acquisition, Subscription Analytics,
  Churn & Retention, Lifetime Value, Segments & Upsell, Campaign Performance.
- The stale `available: false` KPIs in `PlatformAnalyticsService` (failed payments, refunds)
  replaced with real values from `platform_payments` / `platform_refunds`.

**Verification**

- Hand-computed fixtures: CAC, ROAS, churn rate, trial conversion, MRR, retention and LTV
  equal the service output exactly.
- Re-running attribution for the same conversion adds no second row; a touchpoint outside the
  window does not qualify.
- Every money metric shows a per-currency breakdown; a test asserts no cross-currency sum is
  produced.
- Attributed revenue and total revenue are asserted to be distinct values in the payload, never
  merged.

**Gate:** approve the numbers and their definitions before reporting and alerts wrap them.

---

## Phase 7 — Reporting, insights & alerts

**Deliverables**

- Tabbed Reports page with a documented definition, source and limitation on each report.
- Channel Performance.
- Export Center: permission-checked, streamed CSV, audited, filter-aware.
- `InsightService` + `marketing_alert_rules` → `marketing_insights` + platform notifications,
  with cooldowns and acknowledgement.
- `marketing:evaluate-alerts`, `marketing:sync-integrations`, `marketing:seo-audit`,
  `marketing:generate-sitemap`, `marketing:prune-events` scheduled and heartbeat-recorded.

**Verification**

- Each report's figures trace to a documented definition; definitions are asserted present in
  the payload so a number cannot render without one.
- Export without `platform.marketing.export` is refused; with it, a streamed CSV with the
  expected header and row count is produced and audited.
- A rule fires once and does not re-fire inside its cooldown; acknowledging an insight records
  the actor.
- Scheduled commands appear in `scheduled_task_runs` after a run, so "configured" is not
  reported as "ran".

**Gate:** freeze scope; the final phase is verification only.

---

## Phase 8 — Testing & production readiness

**Deliverables**

- Test coverage across the whole required list: permissions, API authorization, tenant
  isolation, integration configuration, secret encryption, Meta delivery, event deduplication,
  GA4, SEO metadata, sitemap, robots, redirect validation, campaigns, UTM generation, lead
  management, email automation, coupon integration, consent, subscription analytics, churn,
  CAC/ROAS, CSV export and migrations.
- `docs/marketing/DEPLOYMENT.md`: prerequisites, migration order, the cPanel-without-terminal
  procedure, cron entries, queue worker requirement, credential checklist, verification steps.
- The final developer report: completed modules · reused functionality · new migrations · new
  routes and services · new pages and components · jobs and scheduled tasks · required
  credentials · verified integrations · test results · remaining blockers · deployment and
  rollback instructions.

**Verification (run only on explicit approval)**

- `php artisan test` — full suite.
- `vendor/bin/pint --test`, `npx tsc --noEmit`, `npm run build`.
- `php artisan migrate` + `migrate:rollback` on a copy.
- The existing POS, orders, inventory, purchasing, accounting, QR ordering, subscription and
  billing suites re-run to prove nothing regressed.

---

## Cross-phase risk register

| Risk | Mitigation |
|---|---|
| A migration touches an existing table | Only Phase 1's table 12 alters `campaigns`/`coupons`, and only with nullable adds. Asserted in review. |
| Marketing code breaks a public page | All visitor/consent writes are wrapped and swallow their own failures; a test asserts a public page still renders with the marketing tables absent. |
| An integration is reported healthy when it is not | `connected` requires a successful test or sync; `configured` is never displayed as working; manual spend is always labelled. |
| A metric is fabricated to fill a screen | The four-state rule in [METRICS.md §5](./METRICS.md); tests assert the *not available* state renders for unconfigured sources. |
| Cross-currency money is summed | Grouped by currency everywhere; asserted by test. |
| Ads/analytics quota or token expiry silently stops data | `last_error` on the card, `marketing_sync_logs` rows, and an alert rule for `integration_errors`. |
| Marketing email sends to someone who unsubscribed | Suppression and consent are checked at send time inside the job, not at queue time. |
| Scope creep into tenant-facing marketing | Out of scope in [PRD.md §5](./PRD.md); no tenant route is added. |
