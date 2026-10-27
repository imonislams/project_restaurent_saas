# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Real-time notifications with a driver the Platform Admin chooses.** New *Real-time
  Notifications* screen (Platform Configuration) selects **Pusher** (cloud) or **Reverb**
  (self-hosted); credentials are encrypted at rest and only the public key/endpoint reach the
  browser. A `BroadcastConfigurator` applies the choice to `broadcasting.*` at boot — `off`
  resolves to the null broadcaster, never `log` — `routes/channels.php` authorises private
  channels with the same permission that gates the screen they feed, and **Send test event**
  proves the driver actually delivers. Each alert stream (staff, platform admin, customer
  tracking, billing/dashboard) can be silenced without a deploy. Adds `laravel/reverb`,
  `pusher/pusher-php-server`, `laravel-echo` and `pusher-js`.
- **Live staff alerts.** A QR order awaiting approval reaches the Orders badge, a toast and the
  chime the moment it is placed; a kitchen ticket appears on the board as soon as it is opened
  (including auto-accepted orders, which raise no in-app notification at all); accepted,
  rejected, voided and served orders update an open list. Each is sent with
  `ShouldBroadcastNow` on a permission-scoped tenant channel, so a slow queue cannot delay it.
  The 15-second notification poll and the kitchen board's 12-second refresh are demoted to
  60-second fallbacks — a blocked socket or an offline till still loses nothing.
- **Live Platform Admin alerts and a real bell.** The control center header now has a notification
  bell with an unread badge (there was none) fed by a `platform_notifications` shared count, and
  these events raise a live alert: manual payment awaiting approval, payment settled or failed, a
  new tenant registration, a failed queued job or scheduled task, a failed sign-in on an
  administrator account (one alert per account per ten minutes — ordinary failed logins are only
  recorded), and a new support ticket. Each writes a database notification for every platform
  admin holding the area's permission *and* broadcasts on that area's channel, so the badge and
  toast are immediate. The platform Notifications page now renders the alert body and links to the
  record.
- **Live billing, inventory and diner updates.** An online payment received, or a bill requested
  from a table, now alerts the billing staff instantly (with a chime for money) and refreshes the
  dashboard counters; stock that crosses the low-stock threshold on a sale raises a live warning
  instead of waiting for the nightly scan; and a diner's tracking page refreshes the moment their
  order moves or the payment lands — its own poll drops from 8s to a 30s fallback. The diner
  channel is public and keyed by the table's QR token, and carries only a reason: the page then
  re-reads its token-authorised status endpoint, so the socket never transports order data.
- **Manual payments need an explicit approval.** A pending manual/offline payment can now be
  approved or rejected from the payment's page — approve with an optional verified reference and
  note, reject with a required reason. Approving settles the invoice, activates the pending plan
  change and records who confirmed it, when and with what note (new
  `platform_payments.confirmed_by`/`confirmed_at`/`confirmation_note`; `settlement_status` is real
  now). Rejecting keeps the invoice open and tells the tenant why so they can retry. The tenant is
  notified either way. "Mark settled" delegates to approve, and the payments list offers
  Approve/Review only for pending rows. On the tenant side the pay form takes an optional transfer
  reference (kept with the payment so it can be matched), the flash says the payment is waiting for
  the team, and payment history reads "Awaiting confirmation" instead of "Pending".
- **Manual payments can no longer be changed by a public callback.** The manual driver has no
  verification API, so an unauthenticated POST to the IPN/webhook/return URL used to mark a
  waiting payment failed; provider callbacks for `manual` are now ignored — only an administrator
  can confirm one.
- **A tenant with an inactive plan is kept on the Subscription page.** `EnsureSubscriptionAccess`
  (alias `subscribed`) guards the whole tenant workspace: with no active plan — expired, cancelled
  or suspended — every route redirects to the Subscription page, which stays reachable and now
  shows a "plan not active" notice. The tenant stays **signed in**: billing suspension no longer
  flips the account to suspended (an account-level suspension still logs out). Paying the
  outstanding invoice restores access immediately, and a tenant with no subscription row at all can
  start one from that page — activation still happens only once the invoice is paid. Without a plan,
  `hasFeature()` is now false (it previously opened every module), and the customer QR menu is
  closed while a plan is inactive.
- **Payment gateway configuration is one tab per gateway.** The "Add Gateway" flow is gone:
  *Platform Configuration → Payment Gateways* now shows a tab per provider (Manual, SSLCommerz,
  bKash, Paddle) holding that gateway's configuration inline, with a single **Offer to customers**
  switch that decides whether it appears at plan upgrade/downgrade. Each tab states the effective
  visibility ("Shown for BDT, USD invoices · all countries · all plans"), keeps the credentials
  (encrypted; a blank field keeps the stored secret), connection test, default flag, webhook URL
  and delete, and lists any legacy duplicate configurations so none stays live unnoticed. Saving
  no longer flips the enabled flag — the switch owns it.
- **The tenant SSLCommerz rail works end to end.** The driver now builds SSLCommerz's own payload
  (`total_amount`, a unique `tran_id`, product and customer fields) instead of forwarding the
  generic intent, so a diner's online payment can actually start. SSLCommerz **POSTs** the customer
  back, so a new `/payments/order-return/{provider}/{result}` handler receives that POST, settles
  the payment through the same verified, idempotent notification path as the IPN, finalises the
  order and forwards the diner to their tracking page. The tenant webhook now accepts
  form-encoded IPNs (SSLCommerz/bKash) with a dedupe id and the `VALID` / `Completed` statuses,
  verifies with `val_id`, and refuses a settled amount or currency that does not match ours. A
  failed checkout is recorded as failed instead of leaving a phantom pending payment.

### Changed

- Test fixture: `Tenant::factory()` now provisions an active subscription on a
  every-feature/no-limit fixture plan (a factory tenant is a ready-to-use restaurant), with a
  `withoutSubscription()` state for the lapsed cases.

### Fixed

- **Paying a gateway invoice logged the customer out.** The provider POSTs the browser back from
  its own origin; with a `SameSite=Lax` session cookie the browser withholds it, so Laravel started
  a fresh session there and its `Set-Cookie` replaced the signed-in one — the visitor landed on
  `/payments/result?status=success` already logged out. Both browser-return endpoints now live
  outside the `web` group (`routes/payments.php`: no session, cookie or CSRF middleware), so they
  verify server-side and redirect without touching the session. The result page also links back
  into the app (Control Center for admins, Subscription for tenants).
- **SSLCommerz payments could never be verified — in sandbox *and* live.** The transaction
  validation endpoint was built as `/validatorapi/validationserverAPI.php`, which answers
  **404** on both `sandbox.sslcommerz.com` and `securepay.sslcommerz.com`; the provider
  serves it from `/validator/api/validationserverAPI.php`. Every notification therefore
  looked unverifiable, so a customer who really paid had the payment marked failed and the
  invoice left unsettled (the plan change never activated). Fixed in the platform gateway
  *and* the tenant driver, with regression tests pinning the path.
  Three further defects in the same path, all of which would have kept failing after the URL
  was corrected:
  - SSLCommerz reports `amount`/`currency` **converted to BDT** and the merchant's original
    figures in `currency_amount`/`currency_type`. The verification compared the converted
    ones, so **every non-BDT payment** was failed with an amount/currency mismatch. Both
    drivers now compare the original figures.
  - A rejected session creation returns `failedreason`; only `error` was read, so the operator
    always saw a generic "Checkout could not be started." The provider's own reason is now
    stored on the payment *and* shown in the flash message.
  - A gateway that could not be reached (timeout, 404, an HTML error page) no longer marks the
    payment failed — that says nothing about the payment, so it stays **pending** with the
    reason recorded for an operator, and the customer's return page reports "still being
    confirmed" instead of "could not verify".
- **Platform email was accepted by the provider but never delivered.** The sender address
  fell back to `config/mail.php`'s `hello@example.com` placeholder, so every message left
  the platform claiming to be from a domain reserved for documentation — `example.com`
  publishes `v=spf1 -all` with `DMARC p=reject`, so receiving servers rejected or
  quarantined it and the failure was invisible (the SMTP server accepts the mail, the
  email log records `sent`, and the bounce is discarded because it is addressed to the same
  placeholder). The Email Provider settings screen also pre-filled that placeholder as a
  value to save. `MailConfigurator` now sends from the configured address only when it is
  deliverable and otherwise uses the authenticated SMTP mailbox, the settings screen shows
  the sender that will actually be used, and the From Address field explains the
  requirement.

## [0.3.0] - 2026-10-26

A production release pipeline: versioned packages built by CI, a self-locking first-run
installer, and atomic release-directory deployment.

### Added

- **Versioned production package.** Tagging `vX.Y.Z` builds `application-vX.Y.Z.zip` — production
  `vendor/` (no dev packages), compiled `public/build/`, empty writable `storage/` and
  `bootstrap/cache/`, plus `RELEASE-MANIFEST.json`, `INSTALL.md` and `UPGRADE.md` — with a
  `.sha256` checksum, published as a GitLab Release asset (`build:package` + `release` jobs).
  `bash scripts/package.sh vX.Y.Z` builds the same artifact locally.
- **Headless installer** — `php artisan app:install` checks server requirements, tests the
  database connection (refusing a populated database without explicit confirmation), writes `.env`
  (generating `APP_KEY`), migrates, seeds roles/plans/email templates, creates the first platform
  administrator and then **locks itself** (`storage/app/private/installed.lock`). Every prompt has
  a matching option, so it also runs unattended — for example from a cPanel Cron Jobs entry on a
  host without SSH.
- **cPanel release-directory deployment** — `scripts/deploy-release.sh` verifies the package
  checksum, backs the database up, extracts into `releases/<version>`, links `shared/.env` and
  `shared/storage`, runs **only the pending migrations**, swaps the `current` symlink atomically,
  rebuilds caches, probes `/health`, rolls back automatically when the check fails, records the
  deployment and prunes old releases; `--rollback` reverts to the previous release. Runbook in
  `docs/DEPLOY-CPANEL.md`.

### Changed

- `DatabaseSeeder` no longer creates a known platform administrator outside `local`/`testing` —
  production installs create their own via `app:install`.
- `.env.example` documents the version/build keys, `SESSION_SECURE_COOKIE` and a production
  (cPanel) reference block.
- The CI `deploy:production` job consumes the packaged artifact instead of building on the server.

### Fixed

- **A failed installation reported nothing useful.** `app:install` caught `RuntimeException` but
  not driver or migration failures, so a failing install gave a stack trace instead of the reason.
  It now prints the underlying message and reports the exception to the log.
- **The package could not boot below PHP 8.4.1 while `composer.json` advertised `^8.2`.** The
  lock had resolved `symfony/* 8.1.x` and `endroid/qr-code 6.1.x`, both requiring PHP `>= 8.4.1`,
  because no `config.platform` was pinned. The requirement is now declared as `^8.4.1`, the
  platform is pinned to `8.4.1` so the lock cannot drift above the supported runtime, and
  `RequirementsChecker` enforces it before installing.

## [0.2.0] - 2026-10-25

Subscription plan changes now follow payment: a requested change is held as *pending* and the
tenant keeps their current plan, limits and features until its invoice is settled.

### Added

- **Pending plan changes.** Switching plan issues an invoice for the **target** plan and cycle
  and records the change as pending on the subscription instead of activating it immediately.
  The live plan is switched, the paid period started and a `subscription.plan_changed` audit
  entry written only once that invoice settles. A zero-amount (free or fully discounted) change
  still activates at once, and re-requesting the same change reuses the outstanding invoice.
  New columns `subscription_invoices.plan_id` / `billing_cycle` and `subscriptions.pending_plan_id`
  / `pending_billing_cycle` / `pending_invoice_id` / `pending_since` (additive and reversible).
- **Subscription page** surfaces the pending change: the target plan is marked *Pending
  activation* and a notice explains that the current plan stays active until the invoice is
  paid. New audit action `subscription.plan_change_requested`.

### Changed

- Invoices now record and bill the **effective** plan/cycle they are issued for, so a pending
  change is priced from — and described with — its target plan, and the provider price-id lookup
  uses the invoice's effective plan/cycle rather than the subscription's still-current ones.

### Fixed

- **`docs/PHASES.md` shipped unresolved git merge-conflict markers.** The Phase 16D–16G records
  were committed interleaved with `<<<<<<< HEAD` / `=======` / `>>>>>>>` markers, so the file was
  not valid Markdown. Both sides are kept and re-ordered (16D → 16E(A) → 16E(B) → 16F → 16G);
  all of those phases are implemented in the codebase.

## [0.1.0] - 2026-10-24

First tagged release. Establishes the versioning baseline, makes the application
installable as a Progressive Web App, and fixes outbound email recording in the platform
control centre.

### Added

- **PWA shell** — web manifest, maskable icons, a hand-written service worker
  (`resources/js/pwa/sw.ts`), a branded offline page, and install / update prompts in the
  app shell. Build assets are precached; navigations are network-first with an offline
  fallback; no application data is ever cached.
- **Application versioning** — the repository-root `VERSION` file is the single source of
  truth, surfaced in the app shell, `GET /health` and the `app:version` command, with
  `version:bump` for releases.
- **Documentation** — `docs/PWA-OFFLINE.md` (caching policy, offline model, sync design,
  conflict rules, offline auth) and `docs/RELEASE.md` (versioning, branches, commits,
  changelog, release and rollback).
- **Email log preview** — Platform Admin → Email Logs can now preview the message that was
  actually delivered, with the body captured at send time.

### Fixed

- **Outbound email recorded nothing at all.** The message body and content type were written
  to `email_logs` before that migration had run, every insert failed on the missing column,
  and `EmailLogger` swallowed the exception silently — so neither successful nor failed
  emails appeared in the log. Recording failures are now reported instead of disappearing.
- **Platform mail settings were ignored.** `MailConfigurator` read unprefixed keys from a
  prefixed settings array and passed the UI's `tls` / `ssl` choice straight through as a
  transport scheme, which Symfony rejects (it accepts only `smtp` / `smtps`). Settings saved
  in the admin UI now actually apply.

### Security

- The service worker never caches Inertia/XHR/JSON responses, and its image rule cannot match
  uploaded tenant files under `/storage/…`.
