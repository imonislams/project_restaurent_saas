# Marketing & Growth Center — Data Model

**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [PRD.md](./PRD.md) · [METRICS.md](./METRICS.md) ·
[docs/DATABASE.md](../DATABASE.md)

---

## 1. Principles

1. **Additive only.** Every migration creates a table or adds nullable columns. No existing
   table is dropped, renamed, truncated or rewritten, and no existing row is modified.
2. **Global, not tenant-scoped.** Marketing tables belong to the platform. They carry **no
   `BelongsToTenant`** trait, so the global scope is not involved. Where a link to a restaurant
   exists (`tenant_id` on a lead or an attribution) it is a plain nullable foreign key used for
   reporting and customer linking — never a scoping mechanism.
3. **Reuse before create.** Settings go to `platform_settings`; audit goes to `audit_logs`;
   email templates to `email_templates`; the email attempt log to `email_logs`; discounts to
   `coupons`. Only genuinely new entities get new tables.
4. **Enums are strings + PHP backed enums**, matching the house pattern (`string('status', 20)`
   in the migration, an enum cast in the model).
5. **Every migration declares `down()`** and is asserted reversible by
   `tests/Feature/Production/PlatformReadinessTest.php`.
6. **Append-only where it matters**: `marketing_consent_records`, `marketing_event_deliveries`,
   `marketing_automation_logs` and `marketing_sync_logs` are never updated in place except for
   their own status fields.

Naming: `marketing_` prefix, snake_case, plural. Money is `decimal(15,2)` + a `char(3)`
currency column, **never a bare number**. Timestamps are UTC; period bucketing happens in the
reporting timezone (see [METRICS.md](./METRICS.md) §2).

---

## 2. Integration & configuration

### `marketing_integrations`

| Column | Type | Notes |
|---|---|---|
| `id` | id | |
| `provider` | string(40) | registry key: `meta_pixel`, `meta_conversions`, `google_analytics`, `google_tag_manager`, `search_console`, `google_ads`, `platform_mail` |
| `name` | string(120) nullable | operator label |
| `environment` | string(20) | `sandbox` \| `production` |
| `is_enabled` | boolean | offered to outgoing dispatch |
| `credentials` | text nullable | **cast `encrypted:array`** — never returned to the browser |
| `settings` | json nullable | non-secret config: scopes, property ids, event mapping, options |
| `status` | string(30) | `not_configured` \| `disabled` \| `configured` \| `connected` \| `error` |
| `health_status` | string(20) | `unknown` \| `ok` \| `degraded` \| `down` |
| `last_ok_at`, `last_error_at`, `last_synced_at` | timestamp nullable | |
| `last_error` | text nullable | the operator-visible failure reason |
| `sort_order` | unsigned int | |
| timestamps | | |

**unique(provider, environment)** · index(provider)

Credential **key names** are derived from the registry schema, not stored separately; the API
returns `credential_keys` (a list of names) plus which keys are set, never a value.

### `marketing_sync_logs`

`integration_id` (FK cascade) · `direction` (`pull`\|`push`) · `entity` (e.g. `ga4_report`,
`gsc_searchanalytics`, `ads_spend`, `meta_event`) · `status` (`ok`\|`failed`\|`skipped`) ·
`items_count` int · `started_at` · `finished_at` · `duration_ms` · `error` text nullable ·
`meta` json nullable · timestamps.
index(integration_id, entity, started_at).

This is the record behind every "Last successful sync" and every honest **"no data yet"**
state.

### `marketing_alert_rules`

`key` unique · `name` · `metric` (e.g. `cac`, `trial_conversion`, `churn_rate`,
`integration_errors`, `leads_unworked`) · `operator` (`gt`,`gte`,`lt`,`lte`,`eq`) ·
`threshold` decimal(15,4) · `window` string(20) (`24h`,`7d`,`30d`,`period`) · `channel`
(`database`,`email`,`both`) · `recipients` json nullable · `is_enabled` · `last_triggered_at` ·
`cooldown_minutes` unsigned int default 1440 · timestamps.

### `marketing_insights`

`rule_id` FK nullOnDelete · `severity` (`info`,`warning`,`critical`) · `title` · `body` text ·
`data` json · `generated_at` · `acknowledged_at` nullable · `acknowledged_by` FK users nullOnDelete.
index(generated_at), index(severity).

---

## 3. Visitor, event & attribution

### `marketing_visitors`

| Column | Type | Notes |
|---|---|---|
| `id` | id | |
| `visitor_id` | uuid | **unique** — the `md_vid` cookie value |
| `first_seen_at`, `last_seen_at` | timestamp | |
| `first_path`, `last_path` | string(500) | |
| `first_referrer`, `last_referrer` | string(500) nullable | |
| `first_source`, `first_medium`, `first_campaign`, `first_term`, `first_content` | string(120) nullable | first-touch |
| `last_source`, `last_medium`, `last_campaign`, `last_term`, `last_content` | string(120) nullable | last-touch |
| `channel` | string(30) | resolved `MarketingChannel` |
| `device` | string(20) | desktop / mobile / tablet / bot |
| `user_agent` | string(500) nullable | |
| `country` | char(2) nullable | from the trusted country header only |
| `ip_hash` | string(64) nullable | SHA-256, never a raw IP |
| `user_id` | FK users nullOnDelete | set once the visitor authenticates |
| `tenant_id` | FK tenants nullOnDelete | set once the visitor becomes a customer |
| `is_bot` | boolean | heuristic |
| `pageview_count` | unsigned int default 0 | |
| `first_seen_at` … timestamps | | |

index(channel), index(country), index(user_id), index(tenant_id)

### `marketing_events`

| Column | Type | Notes |
|---|---|---|
| `id` | id | |
| `event_id` | uuid | **unique** — the dedupe key, stable across retries |
| `name` | string(60) | e.g. `page_view`, `view_content`, `lead`, `registration_completed`, `trial_started`, `initiate_checkout`, `payment_completed` |
| `category` | string(20) | `essential` \| `analytics` \| `advertising` |
| `source` | string(20) | `client` \| `server` |
| `visitor_id` | uuid nullable | |
| `user_id`, `tenant_id`, `lead_id`, `campaign_id`, `landing_page_id` | FK nullable | |
| `occurred_at` | timestamp | |
| `path`, `url`, `referrer` | string(500) nullable | |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | string(120) nullable | |
| `channel` | string(30) nullable | |
| `device` | string(20) nullable | |
| `country` | char(2) nullable | |
| `value` | decimal(15,2) nullable | monetary events only |
| `currency` | char(3) nullable | |
| `properties` | json nullable | non-PII payload |

index(name, occurred_at) · index(visitor_id) · index(tenant_id) · index(campaign_id) ·
index(occurred_at)

### `marketing_event_deliveries`

`marketing_event_id` FK cascade · `provider` string(40) · `external_event_id` string(120) ·
`status` (`pending`,`sent`,`failed`,`skipped`) · `attempts` unsigned int default 0 ·
`http_status` unsigned int nullable · `response` text nullable · `error` text nullable ·
`sent_at` nullable · `next_retry_at` nullable · timestamps.

**unique(provider, external_event_id)** — the dedupe guarantee. index(status, next_retry_at).

### `marketing_attributions`

`visitor_id` uuid · `user_id`, `tenant_id`, `campaign_id`, `landing_page_id` FK nullable ·
`model` string(20) (`first_touch`,`last_touch`) · `channel` string(30) · `source`, `medium`,
`utm_campaign` string(120) nullable · `touchpoint_at` timestamp · `window_days` unsigned int ·
`value` decimal(15,2) nullable · `currency` char(3) nullable · `converted_at` timestamp ·
timestamps.

**unique(tenant_id, model)** — one attribution per model per customer, so a conversion is
never double counted. index(model, channel) · index(campaign_id) · index(converted_at).

---

## 4. Campaigns & landing pages

### `marketing_campaigns`

| Column | Type | Notes |
|---|---|---|
| `id` | id | |
| `name` | string(150) | |
| `slug` | string(160) | **unique** |
| `objective` | string(40) | awareness / leads / trials / conversions / retention |
| `description` | text nullable | |
| `channel` | string(30) | `MarketingChannel` |
| `owner_id` | FK users nullOnDelete | |
| `status` | string(20) | `CampaignStatus` |
| `start_date`, `end_date` | date nullable | |
| `budget` | decimal(15,2) nullable | |
| `currency` | char(3) nullable | budget/spend currency |
| `target_country` | char(2) nullable | |
| `target_audience` | string(255) nullable | |
| `target_restaurant_category` | string(60) nullable | |
| `target_business_size` | string(40) nullable | |
| `target_plan_id` | FK plans nullOnDelete | |
| `landing_page_id` | FK marketing_landing_pages nullOnDelete | |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | string(120) nullable | |
| `leads_count`, `registrations_count`, `conversions_count` | unsigned int default 0 | **cached counters**, recomputed by the reporting service |
| `attributed_revenue` | decimal(15,2) default 0 | cached, per `currency` |
| `notes` | text nullable | |
| `created_by` | FK users nullOnDelete | |
| timestamps, softDeletes | | |

index(status, start_date) · index(channel) · index(owner_id)

> **Cached counters are derived data.** They are recomputed from the source tables by the
> reporting service; [METRICS.md](./METRICS.md) records where each comes from, and a counter is
> never allowed to become the source of truth for money.

### `marketing_campaign_spends`

`campaign_id` FK cascade · `period_start`, `period_end` date · `channel` string(30) ·
`amount` decimal(15,2) · `currency` char(3) · `source` string(20) (`manual`,`google_ads`,
`meta_ads`) · `imported_at` nullable · `notes` nullable · timestamps.
index(campaign_id, period_start).

`source` exists so the UI can state plainly that a spend figure was **entered by hand** rather
than fetched from an ad platform.

### `marketing_landing_pages`

`name` · `slug` **unique** · `title` · `seo_meta` json (title, description, canonical, og_*,
robots, schema) · `sections` json (the block schema) · `status` (`draft`,`published`,`archived`) ·
`campaign_id` FK nullOnDelete · `view_count` unsigned int default 0 · `lead_count` unsigned int
default 0 · `published_at` nullable · `preview_token` string(64) nullable · `created_by` FK ·
timestamps, softDeletes.
index(status) · index(campaign_id).

---

## 5. Leads & CRM

### `marketing_leads`

| Column | Type | Notes |
|---|---|---|
| `id` | id | |
| `name`, `email`, `phone` | string | |
| `business_name` | string(150) | |
| `restaurant_category` | string(60) nullable | |
| `country` | char(2) nullable | |
| `city` | string(80) nullable | |
| `branches_count` | string(20) nullable | the form's banded value (`1`, `2-5`, `6-15`, `15+`) |
| `current_software` | string(120) nullable | |
| `source` | string(30) | `LeadSource` |
| `channel` | string(30) nullable | |
| `campaign_id` | FK nullOnDelete | |
| `landing_page_id` | FK nullOnDelete | |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | string(120) nullable | |
| `visitor_id` | uuid nullable | links to the visit chain |
| `status` | string(30) | `LeadStatus` |
| `score` | unsigned int default 0 | rule-based, documented |
| `assigned_to` | FK users nullOnDelete | |
| `assigned_at` | timestamp nullable | |
| `notes` | text nullable | |
| `message` | text nullable | the original enquiry text |
| `follow_up_at` | timestamp nullable | |
| `last_contacted_at` | timestamp nullable | |
| `consent_marketing` | boolean default false | |
| `consent_at` | timestamp nullable | |
| `consent_ip_hash` | string(64) nullable | |
| `tenant_id` | FK tenants nullOnDelete | **set on conversion** — the link to the customer |
| `converted_at` | timestamp nullable | |
| `lost_reason` | string(255) nullable | |
| `meta` | json nullable | |
| timestamps | | |

index(status, follow_up_at) · index(assigned_to) · index(email) · index(phone) ·
index(campaign_id) · index(created_at) · index(tenant_id)

**No unique constraint on `email`** — a person may legitimately re-enquire, and duplicate
detection is a service-level decision that must be visible to the operator rather than a hard
database error.

### `marketing_lead_activities`

`lead_id` FK cascade · `user_id` FK nullOnDelete · `type` (`note`,`status_change`,`assignment`,
`email`,`call`,`demo`,`conversion`,`consent`) · `title` · `body` text nullable · `meta` json
nullable · `occurred_at` · `created_at` only.
index(lead_id, occurred_at) · index(type).

### `marketing_email_sends`

`campaign_id` FK cascade · `lead_id`, `subscriber_id`, `tenant_id` FK nullOnDelete ·
`email` string(150) · `token` uuid **unique** · `status` (`pending`,`sent`,`delivered`,`opened`,
`clicked`,`bounced`,`failed`,`unsubscribed`) · `sent_at`, `delivered_at`, `opened_at`,
`first_click_at`, `bounced_at`, `failed_at`, `unsubscribed_at` nullable · `click_count`
unsigned int default 0 · `error` text nullable · timestamps.

**unique(campaign_id, email)** — one send per recipient per campaign.
index(status) · index(email).

### `marketing_email_clicks`

`send_id` FK cascade · `url` string(1000) · `user_agent` string(500) nullable · `ip_hash`
string(64) nullable · `created_at` only. index(send_id).

### `marketing_subscribers`

`email` string(150) **unique** · `name` nullable · `lead_id`, `tenant_id` FK nullOnDelete ·
`source` string(40) · `status` (`subscribed`,`unsubscribed`,`bounced`,`complained`) ·
`consent_at` nullable · `consent_source` nullable · `unsubscribed_at` nullable ·
`unsubscribe_reason` nullable · `locale` string(5) default `en` · `meta` json nullable ·
timestamps. index(status).

### `marketing_email_suppressions`

`email` string(150) **unique** · `reason` (`unsubscribe`,`bounce`,`complaint`,`manual`,
`invalid`) · `added_by` FK users nullOnDelete · `created_at` only.

Checked at send time, so adding an address to the list stops an already-queued campaign.

---

## 6. Automation

### `marketing_segments`

`name` · `slug` **unique** · `description` nullable · `type` (`dynamic`,`static`) ·
`rules` json nullable · `member_count` unsigned int default 0 · `last_evaluated_at` nullable ·
`created_by` FK nullOnDelete · timestamps. index(type).

### `marketing_automations`

`name` · `key` string(60) **unique** · `description` nullable · `trigger_type` string(40) ·
`trigger_config` json nullable · `status` (`draft`,`active`,`paused`,`archived`) ·
`is_system` boolean default false · `last_run_at` nullable · `run_count` unsigned int default 0 ·
`created_by` FK nullOnDelete · timestamps. index(trigger_type, status).

`is_system = true` marks the seeded presets (see [PRD.md](./PRD.md) §6.6) — they may be
duplicated and customised, and the operator is told which are built in.

### `marketing_automation_steps`

`automation_id` FK cascade · `sort_order` unsigned int · `type` string(20) (`email`,`wait`,
`condition`,`action`) · `config` json nullable · `template_key` string(60) nullable ·
`delay_value` unsigned int nullable · `delay_unit` string(10) nullable (`minutes`,`hours`,`days`) ·
timestamps. index(automation_id, sort_order).

### `marketing_automation_enrollments`

`automation_id` FK cascade · `subject_type` string(60) · `subject_id` unsigned big int ·
`status` (`active`,`completed`,`stopped`,`failed`) · `current_step` unsigned int default 0 ·
`enrolled_at` · `completed_at` nullable · `stopped_at` nullable · `stop_reason` nullable ·
`next_run_at` nullable · timestamps.

**unique(automation_id, subject_type, subject_id)** — a subject is enrolled once per workflow.
index(status, next_run_at).

### `marketing_automation_logs`

`enrollment_id` FK cascade · `step_id` FK marketing_automation_steps cascade · `status`
(`ok`,`skipped`,`failed`) · `message` text nullable · `executed_at` · `next_run_at` nullable ·
`attempts` unsigned int default 0 · `created_at` only.

**unique(enrollment_id, step_id, attempts)** — the idempotency key that makes a replayed step a
no-op instead of a second email.

---

## 7. Consent

### `marketing_consent_records` (append-only)

`visitor_id` uuid nullable · `user_id`, `tenant_id` FK nullOnDelete · `categories` json
(`{essential: true, analytics: false, advertising: false}`) · `version` string(20) ·
`action` (`granted`,`updated`,`withdrawn`) · `ip_hash` string(64) nullable · `user_agent`
string(500) nullable · `source` string(30) (`banner`,`preference_center`,`api`,`import`) ·
`created_at` only (no `updated_at` — a record is never modified).
index(visitor_id, created_at) · index(action, created_at).

---

## 8. SEO

### `marketing_seo_meta`

`route_key` string(120) **unique** (Laravel route name, e.g. `pricing`) · `path` string(255) ·
`title` string(200) nullable · `description` string(320) nullable · `canonical` string(500)
nullable · `og_title`, `og_description` nullable · `og_image` string(500) nullable · `og_type`
string(30) nullable · `twitter_card` string(30) nullable · `robots` string(60) nullable ·
`schema` json nullable · `alt_texts` json nullable · `is_auto` boolean default true ·
`updated_by` FK users nullOnDelete · timestamps. index(is_auto).

A NULL field means **inherit the global default**, which is what makes `is_auto` meaningful and
prevents a page ever being left without metadata.

### `marketing_sitemap_entries`

`path` string(500) · `priority` decimal(2,1) nullable · `changefreq` string(20) nullable ·
`is_enabled` boolean default true · `lastmod` date nullable · `source` string(30)
(`route`,`landing_page`,`article`,`manual`) · timestamps.
**unique(path)**.

### `marketing_redirects`

`from_path` string(500) **unique** · `to_url` string(1000) · `status_code` unsigned small int
default 301 · `is_active` boolean default true · `hits` unsigned big int default 0 ·
`last_hit_at` nullable · `notes` nullable · `created_by` FK users nullOnDelete · timestamps,
softDeletes. index(is_active).

---

## 9. Reused tables (not re-created)

| Existing table | How marketing uses it | Change made |
|---|---|---|
| `platform_settings` | SEO globals (`seo.default_title`, `seo.default_description`, `seo.default_og_image`, `seo.organization_schema`, `seo.website_schema`, `seo.canonical_host`), consent config (`consent.banner_enabled`, `consent.version`, `consent.categories`, `consent.text_en`, `consent.text_bn`, `consent.retention_days`, `consent.block_before_consent`), tracking preferences (`marketing.attribution_model`, `marketing.attribution_window_days`, `marketing.internal_traffic_excluded`) | New keys only |
| `audit_logs` | Every `marketing.*` action | none |
| `email_logs` | Every outbound marketing email attempt (sent or failed), via the existing `LogOutboundEmail` listener | none |
| `email_templates` | Marketing templates, new keys + a `category` value in the existing `variables` JSON | none (new rows only) |
| `campaigns` | **Reused as Email Campaigns** | nullable columns added: `channel`, `template_key`, `segment_id`, `from_name`, `from_email`, `reply_to`, `marketing_campaign_id`, `utm` json, `track_opens`, `track_clicks`, `scheduled_timezone`, `total_recipients`, `sent_count`, `failed_count`, `open_count`, `click_count`, `bounce_count`, `unsubscribe_count` |
| `coupons` | Promotional offers — validation and redemption untouched | `marketing_campaign_id` FK nullable added |
| `coupon_redemptions` | Redemption reporting | none |
| `tenants`, `subscriptions`, `subscription_invoices`, `platform_payments` | **Read-only source of truth** for acquisition, subscription, churn, LTV, CAC and ROAS | none |
| `users` | Campaign owners, lead assignees, insight acknowledgers | none |
| `roles`, `permissions`, `permission_role` | New `platform.marketing.*` slugs | new permission rows only |
| `notifications` | Marketing alerts reuse `PlatformNotificationService` | none |
| `failed_jobs`, `jobs` | Marketing jobs | none |

## 10. Migration order

Executed in this order, so a foreign key never references a table that does not exist
yet (each is an anonymous class with `up()` and a reverse `down()`):

| # | Migration | Creates / alters |
|---|---|---|
| 1 | `2026_11_01_000001_create_marketing_integrations_table` | `marketing_integrations`, `marketing_sync_logs` |
| 2 | `2026_11_01_000002_create_marketing_landing_pages_table` | `marketing_landing_pages` (`campaign_id` indexed without its constraint yet) |
| 3 | `2026_11_01_000003_create_marketing_campaigns_tables` | `marketing_campaigns`, `marketing_campaign_spends`, and the landing page ↔ campaign foreign key that completes the pair |
| 4 | `2026_11_01_000004_create_marketing_leads_tables` | `marketing_leads`, `marketing_lead_activities` |
| 5 | `2026_11_01_000005_create_marketing_visitors_and_events_tables` | `marketing_visitors`, `marketing_events`, `marketing_event_deliveries` |
| 6 | `2026_11_01_000006_create_marketing_attributions_table` | `marketing_attributions` |
| 7 | `2026_11_01_000007_create_marketing_consent_records_table` | `marketing_consent_records` |
| 8 | `2026_11_01_000008_create_marketing_email_tables` | `marketing_segments`, `marketing_subscribers`, `marketing_email_suppressions`, `marketing_email_sends`, `marketing_email_clicks` |
| 9 | `2026_11_01_000009_create_marketing_automation_tables` | `marketing_automations`, `marketing_automation_steps`, `marketing_automation_enrollments`, `marketing_automation_logs` |
| 10 | `2026_11_01_000010_create_marketing_seo_tables` | `marketing_seo_meta`, `marketing_sitemap_entries`, `marketing_redirects` |
| 11 | `2026_11_01_000011_create_marketing_insights_tables` | `marketing_alert_rules`, `marketing_insights` |
| 12 | `2026_11_01_000012_extend_campaigns_and_coupons_for_marketing` | alters `campaigns`, `coupons` (nullable adds only) |
| 13 | `2026_11_01_000013_add_marketing_permissions` | data-only: inserts the 6 new `platform.marketing.*` permissions and grants them to existing platform roles |

Tables 2 and 3 are split the way they are because `marketing_landing_pages.campaign_id` and
`marketing_campaigns.landing_page_id` reference each other — the second migration adds the
constraint once both tables exist.

Table 12 is the only migration touching existing tables, and it **only adds nullable columns**.
Table 13 is data-only and follows the `2026_10_24_000001_add_role_management_permissions.php`
precedent; its `down()` deletes the permission rows and the role grants it created.

Verified on MySQL (the development driver): `php artisan migrate` applies all thirteen cleanly
and `php artisan migrate:rollback --step=13` reverses them in order.

## 11. Indexing and query rules

- List screens paginate server-side (`paginate(25)`), never loading a full table into the
  browser — consistent with the existing platform pages.
- Aggregations run in SQL (`selectRaw` groups), not by hydrating models, on the large tables
  (`marketing_events`, `marketing_visitors`, `marketing_email_sends`).
- `marketing_events` is the only table expected to grow quickly; `marketing:prune-events`
  honours `consent.retention_days` and is indexed by `occurred_at` for that purpose.
- Every foreign key is indexed; every list filter column in the PRD has a covering index.
- Money columns are `decimal(15,2)` and are grouped by currency before being presented.

## 12. Rollback

- `php artisan migrate:rollback --step=13` reverses the batch in order; every table is dropped
  in reverse creation order, and the altered tables lose only the columns that were added.
- No data migration rewrites existing rows, so a rollback cannot lose customer, billing or
  tenant data.
- `public/sitemap.xml` and `public/robots.txt` are **left in place** and continue to serve if
  generation is switched off, so a rollback of the SEO phase does not break crawling.
- The permission rows are removed by the data migration's `down()`, which also removes the
  role grants it created (it does not touch any permission that existed before it).
