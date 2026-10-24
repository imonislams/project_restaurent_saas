# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
