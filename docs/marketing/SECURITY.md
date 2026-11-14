# Marketing & Growth Center — Security & Privacy

**Related:** [docs/SECURITY.md](../SECURITY.md) · [PRD.md](./PRD.md) · [DATA-MODEL.md](./DATA-MODEL.md) ·
[INTEGRATIONS.md](./INTEGRATIONS.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)

This document extends the platform's [three-access model](../SECURITY.md) to the Marketing &
Growth Center. Nothing here weakens an existing rule.

---

## 1. Workspace boundary

The Marketing & Growth Center is **platform-level only**.

- Every route sits inside the existing `['auth', 'platform']` group with a
  `platform.permission:<slug>` check.
- `platform` resolves `is_platform_admin`; `platform.permission` additionally requires the
  specific slug. A tenant user is refused by the first and can never reach the second.
- **No marketing table is tenant-scoped**, and no marketing route is reachable from the tenant
  workspace. Restaurant tenants do not see campaigns, funnels, pixels or leads — this is
  deliberate and is not configurable.
- The UI nav filter (`auth.platform_permissions`) is a **convenience only**. Every route
  enforces on the server; hiding a menu item is never the control.
- Marketing tables are held by platform admins (whose `tenant_id` is `null`), so the
  `BelongsToTenant` global scope is not part of this boundary — the route perimeter is. This is
  asserted by a test that walks the whole `platform.marketing.*` route list as a tenant user and
  expects `403`/redirect on every entry.

## 2. Permissions

Added to `Permissions::map()['platform']` and granted through the existing seeder plus a
data migration for existing installs:

| Slug | Grants |
|---|---|
| `platform.marketing.view` | Read every marketing screen *(pre-existing)* |
| `platform.marketing.manage` | Create/edit campaigns, leads, landing pages, email, automations, SEO metadata *(pre-existing)* |
| `platform.marketing.publish` | Publish a landing page; activate a campaign or automation |
| `platform.marketing.leads.assign` | Reassign a lead to another operator |
| `platform.marketing.integrations.manage` | Configure providers, enter credentials, run OAuth, test connections |
| `platform.marketing.consent.manage` | Change consent categories, banner text, version, retention |
| `platform.marketing.reports.view` | Reports and Channel Performance |
| `platform.marketing.export` | CSV export of any marketing dataset |

Role defaults: `saas_super_admin` and `platform_owner` receive all; `platform_admin` receives
all **except** `integrations.manage`; `platform_auditor` receives `view`, `reports.view` and
`export` only. Least privilege is the default — not everyone needs to hold API tokens.

**Server-side checks beyond the route.** Actions that change who can see what, or that move data
out of the platform, re-check in the controller even though the route already guards them:
publishing (`publish`), assignee change (`leads.assign`), credential write
(`integrations.manage`), consent version change (`consent.manage`) and every export
(`export`). This mirrors the existing `TenantController::bulk()` pattern.

## 3. Credential handling

| Rule | Implementation |
|---|---|
| Encrypted at rest | `marketing_integrations.credentials` cast `encrypted:array` (AES-256 via `APP_KEY`) |
| Never returned to the browser | The API returns `credential_keys` — **names** — plus which are set. Values are never serialised, not even masked, into an Inertia prop |
| Partial updates never wipe | A blank field means "keep the stored value"; merges are `array_merge` of supplied keys only |
| Not in logs | Provider HTTP clients log status codes and provider error messages; request bodies containing tokens or hashed identifiers are never logged |
| Not in exports | The Export Center has no credential dataset |
| Not in the audit trail | Audit metadata records **which** key changed and when, never a value |
| Rotation | Re-saving a key replaces it; the card shows "changed at". A rotated `APP_KEY` is reported through the existing `PlatformSettings::unreadableKeys()` warning shared with the mail/gateway screens |
| Revocation | Disconnect clears the credential set and sets `status = not_configured` |
| Test isolation | Tests assert that a page render and an update response contain no credential value, by scanning the serialised Inertia payload |

**The only credential exposed to the browser is a Meta Pixel ID and a GTM container ID.** Both
are public identifiers by design (they ship in every page's HTML on any site that uses them).
The UI states this explicitly so it is never mistaken for a secret, and the Conversions API
token is never placed in a client-side payload.

## 4. Tenant data isolation

The marketing workspace reads platform-level data and, for growth and attribution reporting,
**aggregates** tenant commercial records. The following must hold:

- Attribution and acquisition reporting read `tenants`, `subscriptions`,
  `subscription_invoices` and `platform_payments` in **read-only, aggregated** form — counts,
  sums and buckets. No service writes to those tables.
- Customer-level detail exposed anywhere in the marketing console is limited to the platform's
  **own lead** (the person evaluating the product) and the **tenant's business identity** (name,
  country, plan, status) — never a restaurant's diners, staff, orders or payments.
- Restaurant end-customer records (`customers`, `loyalty_*`, `orders`, tenant `payments` and
  `invoices`) are **never** read by marketing analytics and **never** transmitted to an external
  platform.
- Should any marketing screen need a tenant's business record, it must render it from the
  platform's existing read-only access with the same permissions a platform admin already has —
  not a new, wider path.

## 5. Advertising-platform data minimisation

Non-negotiable, and enforced inside `MetaConversionsProvider` rather than by convention:

1. Only **platform-level** events are dispatched — the SaaS visitor, the lead and the resulting
   subscription. No restaurant's own customers, staff, orders, or payment details.
2. Match keys (email, phone, name, country, city) are normalised and **SHA-256 hashed** before
   transmission, as the Meta API requires. Raw values never leave the server.
3. **IP addresses are never sent.** Where a provider expects a client IP, the value is omitted
   rather than substituted.
4. Consent is re-checked **at dispatch time inside the job**, not only when the event was
   recorded, so withdrawing consent stops in-flight delivery. The skip reason is recorded.
5. A `DispatchMarketingEventJob` that cannot prove advertising consent marks the delivery
   `skipped` with the reason — it does not "try anyway".

## 6. Consent & privacy

| Rule | Implementation |
|---|---|
| Nothing non-essential before consent | With no consent record, no analytics or advertising script is rendered and no such event is stored |
| Granular | `essential` (always on), `analytics`, `advertising` — separate grants, separately revocable |
| Recorded | `marketing_consent_records` is **append-only**: visitor id, category set, version, action, IP hash, user agent, source, timestamp. A change writes a new row; an existing row is never edited |
| Versioned | The banner carries a version; changing categories or text bumps it, and consent granted against an older version is visible as such |
| Withdrawable | Withdrawal is recorded and takes effect immediately, including for queued dispatch |
| Retention | `consent.retention_days` bounds how long records are kept; `marketing:prune-events` enforces it |
| Disclosed | The cookie policy lists the `pricing_country` cookie and the IP-geolocation fallback, which today are undisclosed — a gap this work closes |
| Gated | The third-party IP lookup (`ipwho.is`, `ipinfo.io`) that `use-pricing-region.ts` performs is **functional, not analytics**: it decides which region's pricing and payment methods to show. Gating it on analytics consent would show a Bangladeshi visitor dollar pricing when they decline, so it is disclosed in the preference centre and the public cookie policy instead of being gated. It runs only when the host supplied no country header. |
| No identifier before consent | A visitor id is issued only by the consent endpoint. A page view before any decision stores nothing at all — no visitor row, no cookie, no event. Attribution therefore also requires analytics consent, which is the deliberate trade. |

Storage preferences (period, region) remain essential-function cookies and are described as
such, which is why they are allowed to work before consent — the visitor is told rather than
assumed.

## 7. Input validation & transport

- Every write validates with a Laravel `FormRequest` (server-side), including: URLs
  (`http`/`https` only, no `javascript:`/`data:`), redirect targets (internal or absolute HTTP
  URL, never a loop), UTM values (length, allowed characters), email addresses, country codes
  (ISO-3166-2 alpha-2), currency codes (ISO-4217), and JSON schemas for landing-page sections,
  automation step config and segment rules.
- `schema` JSON-LD stored for a page is validated as JSON and emitted escaped; stored HTML for
  emails is sanitised against the same allow-list the existing `RichTextEditor` emits, and is
  never rendered as raw HTML inside the admin UI.
- CSRF: all admin and ingestion routes are inside the `web` group. Marketing webhook-style
  endpoints that must live outside `web` are added to the existing `validateCsrfTokens(except:)`
  list with an explicit, provider-verified signature check — never as a blanket exemption.
- Rate limiting: `POST /marketing/events` is throttled; the public contact/demo submission is
  throttled and honeypot-protected (it currently has **no** throttle — fixed as part of this
  work); open/click/unsubscribe endpoints are token-addressed and throttled.
- Redirect targets are validated on save **and** re-validated on use, with a chain-depth guard,
  so a stored redirect cannot become an open redirect or an infinite loop.
- Exports require `platform.marketing.export` and are streamed server-side; no marketing dataset
  is ever loaded wholesale into the browser (server-side pagination everywhere).

## 8. Audit trail

Every marketing action writes to the existing `audit_logs` through `AuditLogger`, with the actor,
target, timestamp and result — consistent with the platform-wide audit convention:

`marketing.integration_updated` · `marketing.integration_connected` ·
`marketing.integration_disconnected` · `marketing.integration_tested` ·
`marketing.event_resent` · `marketing.campaign_created` · `marketing.campaign_updated` ·
`marketing.campaign_activated` · `marketing.landing_page_published` ·
`marketing.landing_page_unpublished` · `marketing.lead_created` · `marketing.lead_updated` ·
`marketing.lead_assigned` · `marketing.lead_converted` · `marketing.lead_exported` ·
`marketing.email_campaign_sent` · `marketing.email_campaign_scheduled` ·
`marketing.automation_activated` · `marketing.automation_paused` ·
`marketing.consent_settings_updated` · `marketing.consent_withdrawn` ·
`marketing.seo_updated` · `marketing.redirect_created` · `marketing.redirect_updated` ·
`marketing.sitemap_regenerated` · `marketing.robots_updated` · `marketing.report_exported` ·
`marketing.insight_acknowledged`

Metadata carries **what changed**, never a secret value. Consent changes record the version and
the category set. Lead exports record the filter used and the row count.

## 9. Failure visibility

A silent failure is treated as a defect, matching the platform rule that an operator must be
able to see what went wrong:

- a failing integration shows the provider's own error message on its card with the timestamp;
- a failed event delivery is listed in the Event Manager with its HTTP status and error, and can
  be resent;
- a failed campaign recipient is listed in the delivery report rather than only in a log;
- a failed job raises a platform alert through the existing `NotifyPlatformOnFailedJob`;
- marketing infrastructure failures are wrapped so they **never break the primary flow**, but
  the wrapped failure is always logged with the reason — fail-safe must not become silent.

## 10. Phase verification checklist

Every marketing phase must demonstrate:

- [ ] A tenant user is refused on every marketing route.
- [ ] A platform admin without the specific permission is refused, and receives **no data**.
- [ ] No credential value appears in any Inertia response, export or log.
- [ ] With consent absent, no analytics or advertising script is emitted and no event stored.
- [ ] With consent withdrawn, an already-queued dispatch is skipped with the reason recorded.
- [ ] No restaurant end-customer data is read by marketing analytics or sent to a provider.
- [ ] Match keys are hashed and raw IPs are never transmitted.
- [ ] Every mutation is written to `audit_logs` with actor, target and result.
- [ ] Public write endpoints are throttled and validated server-side.
- [ ] Money is grouped by currency and never summed across currencies.
