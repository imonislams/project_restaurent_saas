# Marketing & Growth Center — Metric Definitions

**Related:** [PRD.md](./PRD.md) · [DATA-MODEL.md](./DATA-MODEL.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) ·
[INTEGRATIONS.md](./INTEGRATIONS.md) · [docs/PLATFORM_ADMIN.md §7](../PLATFORM_ADMIN.md)

---

## 1. The three rules

1. **A metric is either computed from records this platform holds, or it is shown as not
   available with its reason.** There is no third state — no estimate presented as a
   measurement, no placeholder number, no "typical" value.
2. **Money is never summed across currencies.** Every monetary metric is presented per
   currency. There is no FX conversion in this platform (consistent with the existing
   limitation in [PLATFORM_ADMIN.md](../PLATFORM_ADMIN.md)).
3. **Attributed revenue is never conflated with total revenue.** They are labelled and
   displayed separately, always.

Every metric shown in the UI carries a short definition and its source, surfaced through the
info affordance on its card or column — the operator should never have to guess what a number
means.

---

## 2. Time base

| Concern | Rule |
|---|---|
| Storage | All timestamps are stored in **UTC**. |
| Period buckets | Resolved in the **reporting timezone** — `platform_settings.localization.reporting_timezone` falling back to `config('platform.reporting_timezone')` — so a "day" matches the operator's day and stays consistent across the UTC boundary. |
| Range filters | Resolved to `[fromUtc, toUtc]` once, then applied to `occurred_at` / `paid_at` / `created_at`. |
| Charts | Buckets label in local terms (hour, day, week, month) derived from the resolved range. |
| Owner-facing tenant dates | Tenant-scoped screens continue to use the **tenant's** timezone (`tenant.getSetting('region.timezone')`); this document covers platform metrics only. |
| Period filter scope | One period filter drives every period-scoped metric. Point-in-time / lifetime metrics (current MRR, all-time outstanding, lifetime LTV) are explicitly labelled **"point in time"** and are not silently filtered. |

---

## 3. Attribution model

| Aspect | Rule |
|---|---|
| Models | **First touch** (the visitor's first recorded touchpoint, within the window) and **last touch** (the touchpoint immediately before conversion). |
| Window | `platform_settings.marketing.attribution_window_days`, default **30**, applied to both models. A touchpoint older than the window does not qualify; the attribution row records the `window_days` used, so a historical figure can be explained later. |
| Key | The first-party `md_vid` visitor id, carried from first visit to registration. |
| Conversion events | Subscription start (invoice settled) is the money-conversion; registration and trial start are recorded as funnel conversions without revenue. |
| Uniqueness | `unique(tenant_id, model)` — a customer is attributed **once per model**. Re-processing never adds a second row. |
| Direct traffic | A conversion with no qualifying touchpoint is attributed to `direct` (or `none` when even the landing visit is missing) and is **reported explicitly** rather than dropped, so the channel table always accounts for 100% of conversions. |
| Platform vs provider attribution | This model is this platform's own measurement. Meta, Google Ads and GA4 each have their own attribution and will disagree; the UI states that these are different measurement systems and does not blend them. |
| Marketing-attributed vs total revenue | `marketing_attributions.value` (summed over a model and period) versus total settled invoice revenue in the same period. Both shown; the difference is never attributed to marketing. |
| Self-service exclusions | Platform-admin traffic is excluded from website metrics; internal/test tenants are excluded by the same rule set as the existing analytics. |

---

## 4. Core formulas

### Acquisition & marketing efficiency

| Metric | Formula | Source |
|---|---|---|
| **ROAS** | attributed advertising revenue ÷ advertising spend, **per currency** | attributed revenue from `marketing_attributions` (settled invoices only); spend from `marketing_campaign_spends` filtered to `source IN ('google_ads','meta_ads')` for the "live spend" figure, or all sources for the "all spend" figure — the two are labelled |
| **CAC** | eligible acquisition cost ÷ new paying restaurants acquired, **per currency** | cost = `marketing_campaign_spends.amount` (+ any configured additional cost lines); new paying restaurants = `tenants` whose subscription first became **active** in the period |
| **Cost per lead** | marketing spend ÷ leads created | as above ÷ `marketing_leads` |
| **Cost per registration** | marketing spend ÷ registrations in period | as above ÷ tenants created |
| **Lead conversion rate** | converted leads ÷ total leads × 100 | `marketing_leads.status = converted` over created-in-period |
| **Lead → customer rate** | leads linked to a tenant (`tenant_id` not null) ÷ total leads × 100 | `marketing_leads` |
| **Trial conversion rate** | new paying restaurants from trial ÷ eligible trial restaurants × 100 | converted = subscriptions whose first paid period started in the period and which had `trial_ends_at` set; eligible = subscriptions that ever trialed (still-trialing excluded) |
| **Marketing-attributed revenue** | Σ `marketing_attributions.value` for the model and period | per currency |
| **Marketing spend** | Σ `marketing_campaign_spends.amount` | per currency; source labelled |
| **Campaign ROI** | (attributed revenue − campaign spend) ÷ campaign spend × 100 | per campaign, per currency |

### Subscription & revenue

| Metric | Formula | Source |
|---|---|---|
| **MRR** | Σ monthly-normalised value of **active** recurring subscriptions (yearly ÷ 12) | `subscriptions` (status `active`) ∩ `plans`/`plan_prices` for the subscription's billing currency |
| **ARR** | MRR × 12 — a forward-looking run rate, **not** recognised revenue | derived |
| **ARPA** | MRR ÷ active subscriptions | derived, per currency |
| **Total collected** | Σ `subscription_invoices.amount` where status is settled, by `paid_at` in the period | per currency |
| **Outstanding** | Σ `subscription_invoices.amount` where the invoice is unsettled (point in time) | per currency |
| **New subscriptions** | subscriptions whose first active period started in the period | `subscriptions` |
| **Renewals** | renewal invoices settled in the period | `subscription_invoices` |
| **Cancellations** | subscriptions with `cancelled_at` in the period | `subscriptions` |
| **Upgrades / downgrades** | plan changes completed in the period, ranked by plan list price (a change to a higher-priced plan is an upgrade) | `subscriptions.plan_id` history via `audit_logs` `subscription.*` and `pending_plan_id` transitions |
| **Failed payments** | payments ending `failed` in the period | `platform_payments` |
| **Revenue churn rate** | MRR lost to cancellations and downgrades in the period ÷ MRR at period start × 100 | per currency |

### Retention

| Metric | Formula | Source |
|---|---|---|
| **Customer churn rate** | customers lost during the period ÷ customers at the start of the period × 100 | lost = subscription reached `cancelled` or `expired` in the period; customer = an active subscription |
| **Customer retention rate** | 100 − customer churn rate | derived |
| **Monthly cohort retention** | for each signup cohort, the share of that cohort still active N months later | `subscriptions` + `tenants` |
| **Subscription renewal rate** | renewals in the period ÷ subscriptions due for renewal in the period × 100 | `subscriptions.current_period_end` |
| **Reactivation rate** | previously cancelled/expired subscriptions that became active again in the period ÷ total cancelled/expired at period start × 100 | `subscriptions` + `audit_logs` |
| **LTV** | Σ settled invoice revenue per customer ÷ number of customers, computed over the **full available history** and additionally per cohort; a predictive LTV is **not** shown | `subscription_invoices` joined to `subscriptions` → `tenants`, per currency |
| **Average customer lifetime (observed)** | mean days from first active period start to cancellation (only for customers that have cancelled) — labelled as observed, not predicted | derived |

### Funnel

| Metric | Formula |
|---|---|
| **Step count** | distinct `visitor_id` (or `tenant_id`/`lead_id` from the registered step onward) reaching that step in the period |
| **Step conversion rate** | step count ÷ previous step count × 100 |
| **Drop-off rate** | 100 − step conversion rate |
| **Overall funnel conversion** | last step ÷ first step × 100 |

The ten steps and their sources:

| # | Step | Source |
|---|---|---|
| 1 | Website visitor | distinct `marketing_visitors` seen in the period |
| 2 | Landing page visit | `marketing_events.name = page_view` with a `landing_page_id` or a campaign entry path |
| 3 | Pricing page visit | `marketing_events.name = view_content` where `path` matches the pricing route |
| 4 | Lead submitted | `marketing_events.name = lead` (or `marketing_leads` created) |
| 5 | Registration started | `marketing_events.name = registration_started` (emitted on the register page) |
| 6 | Restaurant registered | `tenants` created in the period |
| 7 | Trial started | `subscriptions.trial_ends_at` set within the period |
| 8 | Checkout started | `marketing_events.name = initiate_checkout`, corroborated by an issued `subscription_invoices` row |
| 9 | Payment completed | `platform_payments` reaching `succeeded` in the period |
| 10 | Active paid subscription | subscriptions that became `active` in the period |

**Deduplication rule:** steps 1–5 count distinct visitors; steps 6–10 count distinct tenants.
A visitor is only counted once per step per period, so re-visiting the pricing page does not
inflate step 3.

### Email

| Metric | Formula | Source |
|---|---|---|
| **Delivery rate** | sent ÷ attempted × 100 | `marketing_email_sends` |
| **Open rate** | distinct sends with `opened_at` ÷ delivered × 100 — **stated as approximate**, because image-pixel opens are unreliable and are affected by mail-client privacy proxies | `marketing_email_sends` |
| **Click rate** | distinct sends with `click_count > 0` ÷ delivered × 100 | `marketing_email_sends`/`marketing_email_clicks` |
| **Click-to-open rate** | clickers ÷ openers × 100 | derived |
| **Bounce rate** | bounced ÷ attempted × 100 — **not available until an ESP with bounce webhooks is connected**, except for immediate SMTP rejections the transport reports | `marketing_email_sends` |
| **Unsubscribe rate** | unsubscribes ÷ delivered × 100 | `marketing_email_sends` / `marketing_subscribers` |
| **Suppression size** | count of `marketing_email_suppressions` | point in time |

### Website & SEO

| Metric | Formula | Source |
|---|---|---|
| **Total visitors** | count of `marketing_events` with `name = page_view` | internal |
| **Unique visitors** | distinct `visitor_id` | internal |
| **New / returning visitors** | new = first seen in the period; returning = first seen before the period | `marketing_visitors` |
| **Landing page views** | pageviews where the visit's entry path is a landing page | internal |
| **Organic traffic** | `channel = organic` | internal (referrer/search-engine heuristic, stated as such) |
| **Lead conversion rate (site)** | leads created ÷ unique visitors × 100 | internal |
| **GSC impressions / clicks / CTR / position** | read from the Search Console API for the property's own definition; CTR and position are the API's values, not recomputed | Search Console |
| **GA4 users / sessions / engagement rate** | read from the GA4 Data API | GA4 |
| **Ad spend** | Ads API when connected; otherwise manual entry labelled "manually entered" | Google Ads API / manual |
| **Ad clicks / CPC / CTR (ads)** | Ads API | Google Ads API |
| **SEO health** | audit findings weighted by severity, with the exact issue list always available — the score is never shown without it | `RunSeoAuditJob` |

**Internal vs Google metrics will differ.** Sessions in GA4, pageviews in this platform and
clicks in Search Console are three different measurements; the UI labels which system produced
each figure and does not present them as interchangeable.

---

## 5. Availability states

A metric card is rendered in one of four states. The state is data-driven, never cosmetic:

| State | When | What is shown |
|---|---|---|
| **Value** | Source configured and data exists | The number, its currency/unit, its period, its definition |
| **No data yet** | Source configured, genuinely zero rows in range | A zero with "no activity in this period" (a real zero is information) |
| **Not configured** | Required integration missing or disabled | The reason and a **Connect** action — no number at all |
| **Not available** | Computable in principle but impossible from current data | The specific reason, e.g. "Bounce rate requires an email provider with bounce webhooks" |

The existing `PlatformAnalyticsService` `available: false` KPIs (failed payments, refunds) carry
stale reasons ("Enabled with SSLCommerz payments (Phase 5)") even though payments and refunds now
exist. The growth phase replaces these with real values from `platform_payments` /
`platform_refunds` — or, in the payment-failure case, an honest current reason.

---

## 6. Known limitations (reported next to the numbers, not buried here)

1. **Open rates are approximate.** Image-pixel measurement is affected by privacy proxies and
   by clients that block remote images. The label says so.
2. **Email bounce and complaint data needs an ESP.** The shipped mail path cannot report them
   reliably; the metric shows *not available* with the reason until one is connected.
3. **This platform's attribution and the ad platforms' attribution will disagree.** Both are
   correct within their own definition; neither is presented as the single truth.
4. **Ad spend is only live when the ad API is connected**; otherwise it is manual input, clearly
   labelled, and CAC/ROAS built on it inherit that label.
5. **Directional, not causal.** CAC and ROAS are correlational — this platform does not run
   incrementality tests, and the docs say so.
6. **Organic channel detection is heuristic** (referrer plus UTM). A search visit with a
   stripped referrer is recorded as `direct`.
7. **No FX conversion.** A campaign whose spend is in one currency and whose attributed revenue
   is in another cannot produce a single ROAS figure; the UI shows both sides per currency and
   states that a ROAS is unavailable for that pair.
8. **Upgrade/downgrade classification** depends on plan list price; a plan repriced later
   changes the historical classification. Plan changes are otherwise reconstructed from audit
   records, which is reliable but not a dedicated history table.
9. **LTV is observed, not predicted.** It reflects revenue actually collected to date over the
   customers actually acquired. There is no churn-model forecast, and none is implied.
10. **Bot filtering is heuristic** (user-agent based). Sophisticated bots will still appear;
    the visitor table lets the operator inspect and exclude suspicious entries.
