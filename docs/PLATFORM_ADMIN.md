# Platform Admin Control Center

Operational documentation for the SaaS platform-owner workspace (`/platform`).

**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [SECURITY.md](./SECURITY.md) · [PRODUCTION.md](./PRODUCTION.md) · [PHASES.md](./PHASES.md)

---

## 1. Overview

The control center is a separate workspace from the restaurant application and the
POS terminal. It is guarded by the `platform` middleware (platform admins only) and,
per route, by a granular `platform.permission:` check.

Platform admins carry `is_platform_admin = true` and `tenant_id = null`. They resolve
`platform.*` permissions from their platform roles and **never** inherit tenant
business permissions (three-access model — see SECURITY.md).

### Navigation

Overview · Business Management · Subscriptions & Plans · Financial Management ·
Payment Infrastructure · Communications · Maintenance & Recovery · System Operations ·
Security & Access · Platform Configuration. The sidebar is permission-filtered in the
UI **and** enforced on every route.

---

## 2. Roles and permissions

| Role | Slug | Scope |
|------|------|-------|
| SaaS Super Admin | `saas_super_admin` | Every `platform.*` permission. **Locked** — cannot be edited. |
| Platform Owner | `platform_owner` | Full platform authority. |
| Platform Administrator | `platform_admin` | Tenants, subscriptions, plans, billing, invoices, payments, refunds, email, backups, maintenance. |
| Billing Administrator | `billing_admin` | Billing, invoices, payments, refunds (read elsewhere). |
| Support Operator | `support_operator` | Tenant viewing, diagnostics, impersonation, support tickets. |
| Operations Engineer | `operations_engineer` | Monitoring, logs, backups/restore, maintenance, gateways. |
| Platform Auditor | `platform_auditor` | Read-only across billing, logs, audit, security. |

Granular permissions are managed under **Security & Access → Roles & Permissions**
(a checkbox matrix). Changing a role's permissions is audited with before/after values.

---

## 3. Settings

Configuration lives in `platform_settings` (grouped key/value, values optionally
encrypted; cached 60s). Screens: General, Branding, Localization, Billing, Payments,
Operations, Security, Data Retention, Feature Flags.

**Settings that drive behaviour today**

| Setting | Effect |
|---------|--------|
| `security.session_lifetime_minutes` | Applied to `session.lifetime` at boot. |
| `billing.invoice_prefix` | New subscription invoice numbers. |
| `billing.grace_days` / `billing.dunning_days` | Subscription dunning pipeline. |
| `general.platform_name` | Platform name on invoice documents. |
| `operations.backup_retention_days` | Backup expiry. |
| `features.impersonation` | Blocks support impersonation when off. |
| `features.gateway_checkout` | Blocks gateway invoice checkout when off. |
| `realtime.driver` / `realtime.credentials.{driver}` | Websocket provider (off / reverb / pusher), applied to `broadcasting.*` at boot; credentials encrypted. |
| `realtime.streams` | Which alert streams are pushed live (staff, platform, customer, billing). |

Credentials are **never** stored here — email passwords live in the Email Provider
screen and gateway credentials in Payment Infrastructure (both encrypted at rest).

---

## 4. Operational runbooks

### Backups and tenant restore

- `php artisan db:backup` — platform snapshot (metadata-tracked). Scheduled daily 03:00.
- `php artisan db:verify-backup {id?}` — read back and verify the latest backup. Scheduled daily 04:00.
- `php artisan backups:prune` — delete backups past retention. Scheduled weekly.
- Tenant backups are created from **Backups** (or a tenant's Backups tab) and include
  every table carrying `tenant_id` plus child tables reached via foreign keys.
- Restore: **Restore Center → request** (reason required) then **execute** — requires a
  typed tenant-identifier confirmation, takes an automatic pre-restore checkpoint, holds
  a per-tenant lock, and runs post-restore isolation checks.

### Maintenance mode

Enable under **Maintenance** (message + optional auto-expire). Tenant traffic receives
503; the platform area, `payments/*` callbacks, `webhooks/*` and health checks continue.

### Payment gateways (SSLCommerz)

Configure under **Payment Gateways** (sandbox/production, credentials, supported
currencies). A payment is only marked successful after **server-side validation** with
the provider's validation API; the browser return URL is never trusted.

### Email

Monitor under **Communications**. Provider configured under **Email Provider**
(encrypted password; blank fields keep the stored secret). Failed invoice emails can be
retried.

### Real-time notifications (Pusher / Reverb)

Configure under **Platform Configuration → Real-time Notifications**. One driver is active
at a time — **Pusher** (cloud; nothing to run, works on shared hosting) or **Reverb**
(self-hosted; needs a persistent process and a reachable secure port). Credentials are
encrypted at rest and only the public key/endpoint are shared with the browser. Use
**Send test event** to prove the driver really delivers — *configured* is not the same as
*verified*.

Each alert stream (staff, platform admin, customer tracking, billing/dashboard) can be
switched off without a deploy. With real-time off, every page keeps its slow fallback
refresh: the socket changes *when* counts arrive, never *what* they are, so a blocked
socket or an offline till loses nothing.

- Pusher: set App ID, key, secret and cluster.
- Reverb: run `php artisan reverb:start` (Supervisor/systemd on a VPS), expose it on a
  secure port, then set App ID, app key/secret, host, port and scheme.

---

## 5. Deployment and rollback

Follow [PRODUCTION.md](./PRODUCTION.md). Control-center specifics:

- Run `php artisan migrate --force` (all migrations are additive and declare `down()`).
- Run `php artisan platform:check` to confirm health, queue, backups, gateways, email and
  maintenance state.
- Long-running processes required: web, one or more queue workers, and the scheduler
  (`* * * * * php artisan schedule:run`).
- Rollback: `php artisan migrate:rollback` reverses the last batch; the readiness test
  suite asserts every migration declares `down()`.

---

## 6. Testing

Run the full suite with `php artisan test`. Relevant coverage includes:

- `tests/Feature/Production/PlatformReadinessTest.php` — migration reversibility, the
  platform route perimeter (tenant users forbidden, guests redirected), a reachability
  sweep of every control-center page, and secret-exposure checks.
- `tests/Feature/Platform/*` — tenants, subscriptions, billing/SSLCommerz, email,
  backups/restore, security/admins, settings.
- `tests/Feature/Identity/RolePermissionTest.php` — platform/tenant permission separation.

---

## 7. Known limitations (honest report)

1. **Support impersonation is not time-boxed** — it is reason-required, audited and
   banner-tagged, but there is no automatic expiry; `security.impersonation_max_minutes`
   is recorded and not enforced.
2. **MFA is not implemented** — the flag exists; enforcement requires a provider.
3. **Full-platform restore is intentionally not a one-click action.** Only platform
   *backups* are offered; a full restore remains a documented manual procedure. Tenant
   restore is a **logical, row-level** restore, not point-in-time.
4. **File/upload backups are not implemented** — the application has no per-tenant file
   storage, so backups are database-only.
5. **Some settings are captured but not yet enforced**: localization date/number formats,
   branding colour/logo applied to the shell, log/email/audit retention (no pruning jobs
   yet; only backup retention is enforced).
   Payment gateways are **not** configured as a single platform-wide default — several
   gateways can be enabled at once and each carries its own credentials, under
   **Platform Configuration → Payment Gateways**.
6. **SSLCommerz refunds are recorded as pending** — they are issued from the merchant
   panel; there is no automatic refund API call. Settlement reconciliation compares local
   records only (no provider settlement file ingestion).
7. **Multi-currency is a price list, not FX conversion** — platform reporting sums a
   single currency; there is no exchange-rate conversion.
8. **No CI pipeline / containerisation / APM** is wired; hooks are the test suite, the
   `/health` endpoint, `platform:check`, and structured logs.
9. **Application logs capture warning and above only** (bounded volume, by design);
   delivered/bounced email states require provider webhooks that are not integrated.
10. **Tenant restore child-table discovery assumes a single-column foreign key** to the
    parent `id`; unusual/composite keys are not covered.

---

## 8. Production readiness checklist

- [ ] `php artisan migrate --force` completes; `platform:check` reports healthy.
- [ ] Queue worker and scheduler running under a process manager.
- [ ] Real mailer configured and a test email delivered.
- [ ] Payment gateway configured in production mode and a sandbox transaction verified.
- [ ] At least one verified platform backup, and a restore drill performed on a non-production copy.
- [ ] Platform admins provisioned with least-privilege roles (not everyone is super admin).
- [ ] Maintenance mode tested (tenant 503, platform/payments/health unaffected).
- [ ] `APP_KEY` backed up securely (encrypted backups and stored credentials depend on it).

---

## 9. Additions (platform v2)

### Currency
- **Reporting currency is now driven by the setting.** `localization.reporting_currency`
  (falling back to `general.default_currency`, then config) is what the dashboard and
  revenue analytics express amounts in — changing it changes the labels. Previously a
  config value was read and the setting was inert.
- **Enabled currencies** (`localization.enabled_currencies`, comma separated) limits the
  currency options offered for plans, gateways and coupons. Plans now warn on their card
  when they have no price for an enabled currency — tenants on that currency fall back to
  the plan's own currency, which was silent before.

### Email templates
- Platform emails (invoice issued, subscription expiring, etc.) are editable in
  **Communications → Email Templates**: subject + HTML body with `{{ variable }}`
  placeholders, live preview, **Send test**, and **Reset to default**. Stored in
  `email_templates`; when no row exists the code view is used. The invoice mail now renders
  through the template when customised.

### Marketing
- **Campaigns** (Marketing → Campaigns): compose an HTML email, target by tenant status or
  plan, and send (queued). Recipients are tenant owners; delivery is recorded via the email
  log.
- **Announcements** (Marketing → Announcements): short in-app banners shown to tenants while
  active and matching the audience window. Shared to the tenant shell and rendered next to
  the impersonation banner.

### Command runner
- **System Operations → Command Runner**: curated, whitelisted actions (migrations, cache,
  queue, backup, `platform:check`, `npm run build`) with captured output, plus an
  **advanced terminal** for the SaaS super admin behind the `features.command_terminal`
  flag. The terminal accept-lists command prefixes (`php artisan`, `composer`, `npm run`,
  `php`, `node`) and rejects shell operators and destructive patterns. Every run is stored
  in `command_runs` and audited; output is secret-redacted.

### Navigation
- Removed the duplicate **SSLCommerz** item (Payment Gateways already configures it) and the
  redundant **Tenant Backups** item (Database Backups already has a tenant filter).
