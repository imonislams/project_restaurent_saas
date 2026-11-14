# Marketing & Growth Center — Product Requirements

Platform Admin → **Marketing & Growth** (`/platform/marketing`).

**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATA-MODEL.md](./DATA-MODEL.md) ·
[METRICS.md](./METRICS.md) · [INTEGRATIONS.md](./INTEGRATIONS.md) ·
[SECURITY.md](./SECURITY.md) · [ROADMAP.md](./ROADMAP.md)

---

## 1. Problem

The restaurant SaaS sells subscriptions to restaurants. Today the business has:

- a public marketing site whose contact form **stores nothing** (it validates and shows a
  success flash — no lead is captured, no one is notified, no attribution is kept);
- **no analytics at all** — no Meta Pixel, no GA4, no GTM, no Search Console, no Google Ads
  conversion tracking. The `Telemetry.ts` dispatcher in the frontend pushes to
  `dataLayer`/`gtag`/`plausible` objects that are never created, so every call is a no-op;
- **no SEO management** — a static `public/sitemap.xml` and `public/robots.txt` with the
  host `https://touchdine.cafe/` hardcoded, no per-page metadata store, no redirects;
- **no consent mechanism** of any kind, while a `pricing_country` cookie and third-party IP
  geolocation (`ipwho.is`, `ipinfo.io`) run unconditionally and are not disclosed in the
  cookie policy;
- no campaign records, no lead CRM, no email marketing beyond two simple blast screens, and
  no acquisition/retention reporting beyond the platform dashboard's MRR/ARR.

The result: money is spent on acquisition with no reliable record of what it produced, and
trial-to-paid performance cannot be measured.

## 2. Objective

Give the SaaS owner one workspace that answers four questions with real data:

1. **Where do restaurant signups come from?** → attribution, channel and campaign reporting.
2. **What happens between visiting and paying?** → the 10-step funnel and its drop-off.
3. **Which marketing money worked?** → CAC, ROAS, campaign ROI, per-currency revenue.
4. **Who is at risk of leaving?** → churn, retention cohorts, LTV, reactivation.

…and gives them the tools to act on the answers: campaigns, a lead CRM, email automation,
promotional offers, and control of the site's SEO surface.

## 3. Success measures

| Measure | Target |
|---|---|
| Leads captured per month | > 0 (today: structurally impossible — nothing is persisted) |
| Contact/demo submissions persisted with attribution | 100% |
| Public pages with server-rendered title + description + canonical | 100% of the marketing route set |
| Sitemap URLs that resolve to the content they claim | 100% (today 5 of 5 resource URLs drift from the published articles) |
| Tracked funnel steps | all 10, from visitor to paid subscription |
| Money metrics shown without a currency label | 0 |
| Metrics displayed without a real data source | 0 |

## 4. Personas & permissions

All users here are **platform admins** (`is_platform_admin = true`, `tenant_id = null`) — no
restaurant tenant can reach this workspace.

| Persona | Platform role | Uses |
|---|---|---|
| Growth owner / founder | `platform_owner`, `saas_super_admin` | Everything, including integrations and credentials |
| Marketing manager | `platform_admin` | Dashboards, campaigns, leads, SEO, email — **not** integration credentials |
| Sales rep | `platform_admin` (scoped) | Lead queue, follow-ups, demo requests, lead assignment |
| Analyst / auditor | `platform_auditor` | Read-only dashboards, reports and exports |

Permission slugs (added to the existing `platform.*` catalog — see [SECURITY.md](./SECURITY.md)):

| Slug | Gates |
|---|---|
| `platform.marketing.view` | Read every Marketing & Growth screen *(exists today)* |
| `platform.marketing.manage` | Create/edit campaigns, leads, landing pages, email, automations, SEO metadata *(exists today)* |
| `platform.marketing.publish` | Publish a landing page, activate a campaign or automation |
| `platform.marketing.leads.assign` | Reassign a lead to a different owner |
| `platform.marketing.integrations.manage` | Configure providers, credentials and OAuth |
| `platform.marketing.consent.manage` | Consent banner, categories, versioning, retention |
| `platform.marketing.reports.view` | Reports and Channel Performance |
| `platform.marketing.export` | CSV export |

## 5. Scope

### In scope

Tracking pixels and Conversions API · GA4 · GTM · Search Console · Google Ads conversion
tracking · technical and on-page SEO · sitemap and robots management · redirect management ·
campaign management · UTM builder · landing pages · lead capture and marketing CRM · email
marketing and automation · promotional offers over the existing coupon engine · funnel,
acquisition, subscription, retention, LTV and attribution analytics · reports and CSV export ·
cookie consent and privacy · integration management · automated insights and alerts.

### Out of scope (deliberate)

- **No tenant-level marketing features.** Restaurant tenants do not get campaigns, pixels or
  funnels. Tenants keep their existing customer/loyalty features only.
- **No second discount engine.** Promotional offers reuse `CouponService` unchanged.
- **No second page builder.** Landing pages compose the existing `Components/Marketing/*`
  blocks via a section schema.
- **No second settings store.** Global SEO/consent values live in `platform_settings`.
- **No second audit table.** Marketing actions write to `audit_logs`.
- **No restaurant end-customer data to advertising platforms.** Only platform-level visitor
  and lead events are dispatched.

## 6. Navigation and screens

New collapsible sidebar section **Marketing & Growth**: 9 groups, 40 entries. Two existing
entries move so nothing appears twice: **Announcements** → *Communications*, and the existing
tenant-blast **Campaigns** → *Automation → Email Campaigns*.

### 6.1 Overview (3)

**Marketing Dashboard** — `/platform/marketing`

KPI cards in five blocks, each hidden with a reason when its source is unavailable:

| Block | KPIs |
|---|---|
| Website | Total visitors · unique · new · returning · landing page views · organic traffic |
| Leads | Total · new · qualified · demo requests · contact submissions · lead conversion rate |
| Acquisition | Registered restaurants · new registrations · active trials · expired trials · active paid · inactive |
| Subscription | Active subscriptions · new · renewals · cancellations · MRR · ARR · ARPA · LTV · churn rate |
| Marketing | Spend · CAC · attributed revenue · ROAS · lead→customer rate · trial→paid rate |

Filters: Today · Yesterday · Last 7/30/90 days · Last 12 months · Custom range · Channel ·
Campaign · Country · Device · Plan. One period filter drives every period-scoped metric;
genuinely point-in-time metrics (lifetime LTV, all-time outstanding) are labelled and kept
out of it.

Charts: visitors vs registrations · leads vs qualified · registration trend · trials vs paid ·
MRR/ARR growth · subscription revenue vs marketing spend · acquisition by channel ·
campaign-wise acquisition · churn trend · country distribution · plan distribution ·
registration funnel drop-off · trial→paid conversion · monthly customer growth.

**Conversion Funnel** — `/platform/marketing/funnel`

Tabs: **Funnel** (the 10 steps with unique visitors, conversion rate and drop-off per step) ·
**Drop-off** (largest leaks, ranked) · **By source** (channel / campaign / landing page).

Steps: Website Visitor → Landing Page Visit → Pricing Page Visit → Lead Submitted →
Registration Started → Restaurant Registered → Trial Started → Checkout Started →
Payment Completed → Active Paid Subscription.

**Revenue Attribution** — `/platform/marketing/attribution`

First-touch vs last-touch side by side, the configured attribution window, attributed revenue
per channel/campaign, and **marketing-attributed revenue shown separately from total revenue**
so the two are never conflated.

### 6.2 Tracking & Analytics (5)

**Tracking Pixels** — `/platform/marketing/tracking/pixels` — tabs: **Meta Pixel** ·
**Conversions API** · **Event Mapping** · **Test Events**. Pixel ID, Business ID, Ad Account
ID, CAPI token, test event code, advanced matching, consent requirement, integration status.
Event mapping binds real application actions to Meta events:

| Application action | Event |
|---|---|
| Pricing page opened | `ViewContent` |
| Contact form submitted | `Lead` |
| Restaurant registered | `CompleteRegistration` |
| Trial started | `StartTrial` |
| Checkout initiated | `InitiateCheckout` |
| Payment method added | `AddPaymentInfo` |
| Subscription payment succeeded | `Subscribe` / `Purchase` |

**Google Analytics & Tag Manager** — `/platform/marketing/tracking/analytics` — GA4
connection, property selection, token refresh, sync status, and reports (active users, new
users, sessions, engagement rate, traffic sources, landing pages, geography, devices,
conversion events). **GTM** tab: container ID, environment, installation validation,
duplicate-container prevention, consent mode, diagnostics.

**Google Search Console** — `/platform/marketing/tracking/search-console` — connected site,
impressions, clicks, average CTR, average position, top queries, top landing pages, country
and device performance, trend.

**Google Ads** — `/platform/marketing/tracking/google-ads` — conversion ID/label per
conversion action, conversion tracking status, and **spend sync only when the Ads API is
connected**; otherwise spend is entered manually and labelled as such.

**Event Manager** — `/platform/marketing/tracking/events` — the internal event ledger:
every event with name, source, visitor, campaign, UTMs, result and delivery state per
provider, plus dedupe key, retry count, last error and a resend action.

### 6.3 SEO (6)

**SEO Dashboard** — `/platform/marketing/seo/dashboard` — health summary and the **Technical
SEO Audit** (crawl of this site's own public routes checking title, description, canonical,
robots directive, sitemap membership, redirect chains, HTTP status and schema presence;
issues ranked by severity with the offending URL).

**Website SEO** — `/platform/marketing/seo/website` — tabs **Global defaults** (default
title, description, canonical host, robots directives) · **Schema** (Organization, WebSite,
SoftwareApplication, Product, FAQ) · **Social** (Open Graph + Twitter card, share image) ·
**Verification**.

**Page Meta Tags** — `/platform/marketing/seo/pages` — per-page title, meta description,
slug, canonical, OG title/description/image/type, image alt text, indexing control, schema,
validation, and a **live Google search preview**. Every field has an inherited default so a
page is never left without metadata.

**Sitemap & Robots** — `/platform/marketing/seo/sitemap` — sitemap source registry (public
routes, landing pages, published articles) with include/exclude, priority and changefreq, a
generated-XML preview, last-generated timestamp and a regenerate action; **robots.txt** tab
with a safe editor, syntax and conflict validation (e.g. `Disallow: /` versus `Allow`), and a
diff against the currently served file.

Included: homepage, pricing, features, products, resources/articles, landing pages.
Excluded: `/platform/*`, `/dashboard`, `/pos`, tenant dashboards, auth pages, `/qr/*`,
`/payments/*`, `/webhooks/*`, `/health`, `/invitations/*`, `/profile`.

**Redirects** — `/platform/marketing/seo/redirects` — 301/302, target validation, duplicate
detection, **loop detection** (chain depth limit with the offending chain named), bulk
CSV import/export, hit counter and last-hit, active/inactive, history.

**SEO Performance** — `/platform/marketing/seo/reports` — tabs Queries · Pages · Countries ·
Devices · Trend, straight from Search Console.

### 6.4 Campaigns (5)

**Campaigns** — `/platform/marketing/campaigns` — list ↔ calendar toggle. Fields: name,
objective, description, channel, owner, start/end date, target country, target audience,
target restaurant category, target business size, target subscription plan, landing page,
budget, actual spend (+ currency), UTM parameters, status, and the counters leads,
registrations, paid subscriptions, attributed revenue.

Channels: Meta Ads · Google Ads · Organic Search · Email · Social · Referral · Affiliate ·
Direct · Content · Other.

**UTM Builder** — `/platform/marketing/campaigns/utm` — builds `utm_source`, `utm_medium`,
`utm_campaign`, `utm_term`, `utm_content` onto any URL while **preserving existing query
parameters**; copyable output, saved per campaign.

**Landing Pages** — `/platform/marketing/campaigns/landing-pages` — list, builder, preview,
publish. Sections: title, slug, SEO settings, hero, feature blocks, pricing, testimonials,
case studies, CTA, lead form, demo request form, media, publication status, conversion
tracking. Rendered at `/lp/{slug}` using existing marketing blocks. Publishing requires
`platform.marketing.publish`.

**Promotional Offers** — `/platform/marketing/campaigns/offers` — tabs **Offers** ·
**Coupon Campaigns** · **Redemptions**. Supports percentage, fixed, free-trial extension,
first-payment discount, limited-time, plan-specific, country-specific, campaign-specific and
referral discounts. Every field from the existing coupon model is exposed: code, type, value,
start, expiry, usage limit, per-customer limit, eligible plans, eligible cycles, minimum
purchase, campaign association, active state. **Validation stays entirely server-side in
`CouponService`**; the discount is applied to the outstanding invoice so the gateway total
matches, and a redemption is counted when the invoice is settled, not when it is quoted.

**Campaign Performance** — `/platform/marketing/campaigns/performance` — per-campaign leads,
registrations, conversions, attributed revenue, spend, CAC and ROAS, with the spend source
labelled (`manual`, `google_ads`, `meta_ads`).

### 6.5 Leads & CRM (4 + detail)

**Lead Dashboard** — pipeline KPIs, stage funnel, source mix, oldest unworked lead.

**Leads** — `/platform/marketing/leads` — table ↔ **Kanban** by status, advanced search,
filters (source, channel, campaign, country, status, owner, date), bulk assign, duplicate
detection, CSV export (requires `platform.marketing.export`). Detail view: full record,
activity timeline, notes, status transitions, follow-up date, consent state, and the linked
tenant once converted.

**Sources & Conversion** — `/platform/marketing/leads/sources` — performance by source,
channel, campaign and UTM; lead→customer conversion; time-to-conversion.

**Follow-ups** — `/platform/marketing/leads/followups` — tabs **Reminders** (due and
overdue) · **Demo Requests**.

Lead statuses: New · Contacted · Qualified · Demo Scheduled · Demo Completed · Trial Started ·
Proposal Sent · Converted · Lost.

**Must:** a lead that becomes a registered restaurant links to the existing tenant record —
the customer is never duplicated.

### 6.6 Automation (4)

**Email Campaigns** — `/platform/marketing/automation/campaigns` — builder, subject/body
with the existing rich-text editor, **template selection**, **segment selection**, schedule
(date, time, timezone), test send, and a delivery report (sent, failed, delivered, opens,
clicks, bounces, unsubscribes) with a per-recipient list.

**Email Templates** — `/platform/marketing/automation/templates` — extends the existing
`email_templates` screens with marketing categories; live preview with sample data, test
send, reset to default.

**Automation Workflows** — `/platform/marketing/automation/workflows` — builder over
trigger → conditions → delay → action, with activation, enrolment and a per-step execution
log. The ten required sequences ship as **seeded presets** (not as ten separate menu items):

| # | Sequence | Trigger |
|---|---|---|
| 1 | New lead welcome | Lead created |
| 2 | Demo request confirmation | Demo requested |
| 3 | Incomplete registration follow-up | Registration started, not completed |
| 4 | New restaurant welcome | Tenant created |
| 5 | Trial onboarding | Trial started |
| 6 | Trial feature education | Days after trial start |
| 7 | Trial expiry reminder | Trial ending within N days |
| 8 | Subscription payment reminder | Invoice unpaid at N days |
| 9 | Subscription renewal reminder | Period ending within N days |
| 10 | Failed payment recovery | Payment failed / past due |
| 11 | Cancellation follow-up | Subscription cancelled |
| 12 | Win-back | Cancelled N days ago |
| 13 | Inactive restaurant re-engagement | No activity for N days |
| 14 | Upgrade promotion | Usage near plan limit |

**Audience** — `/platform/marketing/automation/audience` — tabs **Segments** (dynamic rules
or static lists) · **Subscribers** · **Suppression list** · **Consent**.

**Must:** promotional email respects unsubscribe and consent; transactional email (invoices,
verification, password reset) is never suppressed by a marketing unsubscribe.

### 6.7 Customer Growth (5)

**Acquisition** — new restaurants by country, campaign, restaurant type and plan.
**Subscription Analytics** — active, trial, expired, cancelled, renewed, failed payments,
upgrades, downgrades.
**Churn & Retention** — customer churn rate, revenue churn rate, retention rate,
trial→paid conversion, monthly cohort retention, renewal rate, reactivation rate.
**Lifetime Value** — LTV from actual subscription and invoice history, with cohorts.
**Segments & Upsell** — saved segments and upgrade/cross-sell candidates (near limit, high
usage, single branch on a multi-branch plan).

All money metrics are **per currency** and never summed across currencies.

### 6.8 Reporting (3)

**Reports** — `/platform/marketing/reports` — one tab per report with a documented
definition: Traffic · SEO · Campaigns · Leads · Acquisition · Subscription conversion ·
Churn · Retention · Spend · CAC/ROAS · Revenue attribution · Email performance. Each shows
its definition, its source and its limitations inline.

**Channel Performance** — `/platform/marketing/reports/channels`
**Export Center** — `/platform/marketing/reports/export` — permission-checked streamed CSV.

### 6.9 Settings (5)

**Integrations** — `/platform/marketing/settings/integrations` — one card per provider with
connection status, configuration status, last successful sync, last error, connect /
disconnect / reconnect, **test connection**, diagnostics and documentation link. Second tab
**API credentials** listing which keys are stored (names only) and when they changed.

**Consent & Privacy** — banner configuration, categories (essential, analytics, advertising),
preference centre, consent records with version, withdrawal, retention, and disclosure of the
`pricing_country` cookie and IP geolocation.

**Tracking Preferences** — enabled events, attribution model and window, internal tracking
toggles, bot filtering.

**Alert Rules** — metric, operator, threshold, window, channel, recipients, cooldown, last
triggered.

**Marketing Audit Log** — `audit_logs` filtered to `marketing.*` actions, plus
`marketing_sync_logs`.

## 7. Journeys

**Visitor → paid customer (what the funnel records)**
Visitor lands on a campaign URL → UTM parameters and a stable visitor id are captured → the
landing or pricing view is recorded → the contact/demo form creates a lead with the full
attribution chain → the lead is assigned and worked → registration links the lead to the new
tenant → trial starts → checkout → payment settles → the funnel closes and the revenue is
attributed by channel and campaign.

**Lead → customer**
Lead arrives → dedupe by email/phone → assigned → contacted → demo scheduled and completed →
trial started → proposal → converted (lead linked to the tenant, never duplicated) — or Lost
with a recorded reason.

**Insight → action**
`marketing:evaluate-alerts` computes the configured rules hourly → a breach writes a
`marketing_insights` row and sends a platform notification → the operator opens the linked
screen → acts (pause a campaign, fix an integration, work the lead queue).

## 8. Acceptance criteria

1. Every Marketing & Growth menu entry opens a working page backed by real data or an honest
   empty state.
2. Integrations can be configured, tested and diagnosed; status reflects reality.
3. Website analytics are collected (visitor, pageview, UTM, landing page, referrer, device,
   country) and visible in the Event Manager.
4. Restaurant registrations are tracked and attributed.
5. Trial→paid conversion is measured from subscription records.
6. Subscription revenue attribution works, with attributed and total revenue kept distinct.
7. SEO settings, metadata, sitemap and robots are admin-managed and served server-side.
8. Campaigns, UTM builder, landing pages and the lead CRM are functional.
9. Email automation runs through the configured provider, queued and idempotently.
10. Acquisition, churn and retention reports use real records.
11. Credentials are encrypted at rest and never returned to the browser.
12. No tenant can reach any marketing route; no restaurant end-customer data is sent to ad
    platforms.
13. No fabricated metric and no misleading integration status exists anywhere.
14. POS, orders, kitchen, inventory, purchasing, accounting, QR ordering, tenant billing and
    all existing tenant pages are unaffected.
15. The automated test suite for the new surface passes.

## 9. Known limitations (honest, at design time)

1. **Live provider verification depends on credentials the operator supplies.** Until Meta,
   Google and (optionally) an ESP are configured, the corresponding screens show
   *Not configured* and no numbers. This is intentional — see
   [INTEGRATIONS.md](./INTEGRATIONS.md).
2. **The shipped email driver is the platform mailer** (the existing admin-configured
   SMTP/API mail transport). Open, click and unsubscribe are measured by this platform's own
   tracking endpoints, which is real data; **bounce and complaint** states require an ESP
   webhook and are reported as *not available* until one is connected.
3. **GA4, Search Console and Google Ads figures are read-only API data**, cached at sync time;
   they are never real-time and always show their last successful sync.
4. **Ad-attributed revenue is only as good as the ad platforms' own attribution.** This
   platform's attribution model is separate and is labelled as such.
5. **Platform money metrics are per currency.** Multi-currency revenue is never summed into a
   single figure; there is no FX conversion (consistent with
   [PLATFORM_ADMIN.md §7](../PLATFORM_ADMIN.md)).
6. **No click-fraud or bot filtering beyond user-agent heuristics.** Internal traffic
   (platform admins) is excluded from website metrics.
7. **Landing pages compose existing blocks** — they are not a free-form visual builder.
