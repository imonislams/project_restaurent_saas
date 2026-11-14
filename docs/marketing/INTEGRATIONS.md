# Marketing & Growth Center — Integrations

**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [METRICS.md](./METRICS.md) · [SECURITY.md](./SECURITY.md) ·
[PRD.md](./PRD.md)

---

## 1. How integrations work here

Every external connection is a row in `marketing_integrations` configured from the admin UI —
**no `.env` editing and no terminal required**, consistent with how payment gateways, the mail
provider, SMS and real-time already work on this platform.

- Credentials are stored with the `encrypted:array` cast (AES-256 via `APP_KEY`). The browser
  receives **key names and which are set**, never a value. Updating one field does not clear the
  others.
- Every card shows **connection status · configuration status · last successful sync · last
  error**, and offers **Test connection · Reconnect · Diagnostics · Documentation**.
- **Status is earned, not declared.** `connected` requires a successful test or sync;
  `configured` means the keys are present but nothing has been proven yet. A card never shows
  green because a field was filled in.
- Each short-lived API failure is recorded in `marketing_sync_logs` and reflected in
  `last_error`, so a broken integration is visible on its card rather than only in logs.

### Status vocabulary

| Status | Meaning |
|---|---|
| `not_configured` | Required credentials missing. Pages show an empty state with a Connect action and **no data**. |
| `configured` | Credentials present, never verified. |
| `connected` | A test or sync succeeded; `last_ok_at` set. |
| `error` | The last attempt failed; `last_error` holds the provider's message. |
| `disabled` | Configured but switched off — no dispatch, no sync. |

---

## 2. Meta (Facebook / Instagram)

### 2.1 Meta Pixel — `meta_pixel`

| | |
|---|---|
| **Capabilities** | Browser-side event tracking |
| **Credentials** | `pixel_id` (required) |
| **Where it runs** | A script tag emitted by `TrackingScripts` **only when advertising consent is present** |
| **Events** | `PageView`, `ViewContent`, `Lead`, `CompleteRegistration`, `StartTrial`, `InitiateCheckout`, `AddPaymentInfo`, `Subscribe`, `Purchase`, `Contact` |
| **Settings** | Advanced matching on/off, consent requirement, per-event enable/disable, event mapping |
| **Test connection** | Validates the pixel id format and confirms the tag would render; the live check is the browser's own network panel |
| **Limits** | A pixel id is public by nature — it is the only credential in this system that is exposed to the browser, and the UI says so. It cannot be verified server-side without a live page view. |

### 2.2 Meta Conversions API — `meta_conversions`

| | |
|---|---|
| **Capabilities** | Server-side event delivery, deduplication, test events |
| **Credentials** | `access_token` (required, secret), `pixel_id` (required), `business_id`, `ad_account_id`, `test_event_code` |
| **Endpoints** | `POST https://graph.facebook.com/v21.0/{pixel_id}/events` |
| **Deduplication** | Each event carries a stable `event_id` shared with the browser pixel, so Meta can deduplicate browser + server delivery of the same action. A `marketing_event_deliveries` row is keyed **unique (provider, external_event_id)**, so our own retries cannot send twice either. |
| **Match keys** | Hashed with **SHA-256** before transmission, as the API requires. Only truncated, normalised values for email, phone, first/last name, country and city are sent, and **only** for platform-level lead/visitor events. |
| **Never sent** | Restaurant end-customers, restaurant staff, order contents, payment details — nothing belonging to a tenant's own business data. This is enforced in `MetaConversionsProvider`, not by convention. |
| **Test events** | With a `test_event_code` set, events are dispatched as tests and appear in Events Manager's Test Events tab; the UI links there and states that test events are not counted in reporting. |
| **Delivery status** | Every attempt writes a row with HTTP status, response body, attempt count and next retry. Re-send is available per event. |
| **Limits** | Requires a Business account with the Pixel; token permissions expire and must be re-issued — a `190`/`OAuthException` response is surfaced verbatim as `last_error` with a Reconnect action. |

### 2.3 Privacy rule (hard)

This platform does **not** send restaurant customer, staff or diner personal information to any
advertising platform. Meta dispatch is restricted to platform-level events about the SaaS
visitor and the restaurant lead — the person evaluating the product, never the restaurant's own
customers.

---

## 3. Google

One Google connection can serve all three Google integrations. Two credential styles are
supported, and the UI explains the trade-off.

| Style | How it works | Best for |
|---|---|---|
| **OAuth 2.0** (primary) | Authorization-code flow; the refresh token is stored encrypted and used to mint access tokens on demand. Redirect URI is shown in the UI to paste into the Google Cloud console. Tokens refresh automatically; a `invalid_grant` surfaces on the card with a Reconnect action. | GA4, Search Console, Google Ads |
| **Service account** (alternative) | The operator pastes a service-account JSON key; the connection signs a JWT assertion to obtain tokens. No redirect URI, no consent screen, no user to re-authorise. | GA4 and Search Console, where the service-account address can simply be added as a user on the property. |

### 3.1 Google Analytics 4 — `google_analytics`

| | |
|---|---|
| **Capabilities** | Property selection, reporting read, and (optionally) Measurement Protocol event send |
| **Credentials** | OAuth client id + secret (or service-account JSON), `property_id` |
| **Scopes** | `https://www.googleapis.com/auth/analytics.readonly` (`analytics.edit` only if Measurement Protocol is enabled) |
| **Endpoints** | Admin API (list properties) · Data API `properties/{id}:runReport` |
| **Reports** | Active users, new users, sessions, engagement rate, traffic sources, landing pages, geography, devices, conversion events, plus restaurant registration / trial / subscription conversion events where they have been marked as conversions in GA4 |
| **Sync** | Hourly and on demand; each pull writes `marketing_sync_logs` and updates `last_synced_at` |
| **Limits** | Data appears **only after a successful sync** and is read-only. GA4's own reporting identity settings and data thresholds can make its numbers differ from this platform's internal visitor counts — both are shown, labelled by source, and never merged. The Data API quota is per-property and per-project; a quota error is reported verbatim. |
| **Not done here** | No GA4 property creation, no admin mutations, no user management. |

### 3.2 Google Tag Manager — `google_tag_manager`

| | |
|---|---|
| **Capabilities** | Container configuration, installation validation, duplicate prevention, consent mode |
| **Credentials** | `container_id` (required, public `GTM-XXXXXX`); OAuth is optional and used only for the validation check |
| **Where it runs** | The container snippet is emitted by `TrackingScripts` when analytics consent is present |
| **Validation** | Checks that the container id is well-formed; that **no other GTM container is already configured** (duplicate containers are refused with an explanation); that the tag is not also injected from a hardcoded template |
| **Consent mode** | A `consent` default of `denied` for `analytics_storage` and `ad_storage` is emitted before the container loads, and updated when the visitor grants consent — so tags do not fire ahead of consent |
| **Limits** | Server-side GTM and Tag Assistant deep-links are not implemented. Validation is by inspection, and the page says so. |

### 3.3 Google Search Console — `search_console`

| | |
|---|---|
| **Capabilities** | Site list, search analytics, indexing visibility |
| **Credentials** | Google connection + `site_url` (the exact verified property string, `sc-domain:` or `https://` form) |
| **Scopes** | `https://www.googleapis.com/auth/webmasters.readonly` |
| **Endpoints** | `GET /webmasters/v3/sites` · `POST /webmasters/v3/sites/{site}/searchAnalytics/query` |
| **Reports** | Impressions, clicks, CTR, average position, top queries, top landing pages, country, device, trend — all with the API's own definitions |
| **Limits** | Data lags 2–3 days behind reality; the UI states this rather than implying freshness. A property must already be verified in Search Console — this integration cannot verify a site. Row limits are paged and the UI notes when a report is truncated. |
| **Not done here** | No sitemap submission to Google, no URL inspection API, no indexing requests. The sitemap manager produces a correct file; submitting it is done in Search Console (documented on the page). |

### 3.4 Google Ads — `google_ads`

Two capabilities, deliberately separated because they have very different setup costs:

**(a) Conversion tracking — works without a developer token.**

| | |
|---|---|
| **Capabilities** | Conversion ID and per-conversion-action labels emitted through the GTM/gtag layer |
| **Credentials** | `conversion_id` (required for this capability) |
| **Where it runs** | Emitted by `TrackingScripts` when advertising consent is present |
| **Events** | The mapped application actions from [PRD.md §6.2](./PRD.md) |

**(b) Spend and performance sync — requires the Ads API.**

| | |
|---|---|
| **Capabilities** | Campaign spend, clicks, impressions, CPC, CTR |
| **Credentials** | Google connection + `developer_token` (required, secret) + `customer_id` + `login_customer_id` for MCC access |
| **Endpoint** | Google Ads API `v18` — `customers/{id}/googleAds:searchStream` with a `campaign` + `metrics` query |
| **Writes** | `marketing_campaign_spends` rows with `source = google_ads`, matched to internal campaigns by campaign name or id mapping |
| **Limits — stated plainly** | A developer token requires Google's approval and is not issued instantly. **Until it exists, spend is manual input**, stored with `source = manual`, and every ROAS/CAC built on it is labelled *"based on manually entered spend"*. The UI never presents manual spend as live ad-platform data. Currency follows the Ads account; if it differs from attributed revenue currency, no single ROAS figure is produced (see [METRICS.md](./METRICS.md) §6.7). |
| **Not done here** | No campaign creation, bidding or budget changes in Google Ads. Read-only. |

---

## 4. Email

### `platform_mail` — the shipped, working driver

| | |
|---|---|
| **Capabilities** | Campaign send, per-recipient delivery records, open/click tracking, unsubscribe, suppression, consent enforcement |
| **Credentials** | None of its own — it uses the **existing** Email Provider screen (SMTP or API mailer), already encrypted and already testable |
| **Transport** | The platform mailer, configured by `MailConfigurator`; every send is recorded by the existing `EmailLogger` in `email_logs` |
| **Tracking** | This platform's own endpoints: `GET /m/o/{token}` (open pixel) and `GET /m/c/{token}` (click redirect). Because they are first-party and tokenised, the open and click figures are real measurements of this platform's mail, not estimates. |
| **Unsubscribe** | Signed per-recipient token; one click, no login; honours the request immediately and adds a suppression row |
| **Rate limiting** | `SendMarketingEmailJob` is rate limited and processes one recipient per job, so a large campaign cannot exhaust the mailer or time out |
| **Limits — stated on the screen** | **Bounce and complaint states are not available** from a raw SMTP path; only immediate transport rejections are captured. Open rates are approximate (image blocking). The UI shows *not available* with this reason rather than an invented number. |

### ESP drivers (`contract only`)

`MarketingMailer` is the provider-independent contract, so an ESP can be added without touching
campaign, segment, automation or reporting logic:

```php
interface MarketingMailer
{
    public function key(): string;
    /** @return array{ok: bool, message_id: ?string, error: ?string} */
    public function send(string $to, string $subject, string $html, array $headers = []): array;
    /** @return array<string, mixed> webhook payload → normalised delivery state */
    public function handleWebhook(array $payload): array;
}
```

An ESP driver adds real bounce/complaint data through `handleWebhook`. Until one is configured,
the column reads *not available* — it is never faked from the SMTP path.

**Transactional vs promotional.** Invoice, verification and password-reset mail continues to
flow through the existing transactional path and is **not** affected by marketing unsubscribe or
suppression. Marketing campaigns check suppression, subscriber status and consent at send time.

---

## 5. What is verified, and how

| Integration | Automated verification | Live verification |
|---|---|---|
| Meta Pixel | Test asserts the tag is emitted **only** with advertising consent, and never without | Requires a real pixel id and a browser |
| Meta Conversions API | `Http::fake()` — success, auth failure, 429 retry with backoff, dedupe on replay, consent-blocked skip | Requires a real access token; the Test Events tab confirms receipt |
| GA4 | `Http::fake()` — property list, runReport, token refresh, quota error, `invalid_grant` | Requires OAuth or a service-account JSON |
| GTM | Test asserts a single container is emitted, duplicate refused, consent default precedes the container | Browser inspection |
| Search Console | `Http::fake()` — site list, searchanalytics query, paged results, 403 for an unverified property | Requires a verified property |
| Google Ads (tracking) | Test asserts the conversion id is emitted with advertising consent only | Browser inspection |
| Google Ads (spend) | `Http::fake()` — searchStream mapping, currency mismatch handling, no developer token → sync disabled with the reason shown | Requires an approved developer token |
| `platform_mail` | Queue/`Mail::fake()` — per-recipient rows, suppression and consent enforcement, unsubscribe, idempotent replay, `email_logs` written | Requires a configured mailer; the existing **Send test** button proves transport end-to-end |

**No test calls a real provider.** All external HTTP is faked in the suite, and no development
or test environment sends a real marketing email or advertising event.
