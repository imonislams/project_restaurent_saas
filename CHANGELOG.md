# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
