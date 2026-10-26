# Deploying to cPanel

Target: **cPanel on a VPS/dedicated server with SSH + cron.** Releases ship as versioned
packages (see [RELEASE.md](./RELEASE.md) §5.1) and are deployed into release directories that
are switched atomically.

Related: [PRODUCTION.md](./PRODUCTION.md) · [RELEASE.md](./RELEASE.md) · [SECURITY.md](./SECURITY.md)

---

## 1. One-time server setup

1. **SSH access.** Enable Shell access for the account (cPanel → *Terminal* or an SSH key) —
   required for Composer-free deploys, `artisan`, the queue worker and cron.
2. **Document root → `app/current/public`.** cPanel → *Domains* → the domain → *Manage* →
   Document Root: `/home/<user>/app/current/public`. Never serve the repository root — that
   would expose `.env`, `storage/` and `vendor/`.
3. **PHP version + extensions.** MultiPHP Manager: select **PHP 8.4** (8.4.1 or newer —
   the lock requires it) for the domain. Ensure
   `pdo_mysql, mbstring, openssl, ctype, fileinfo, bcmath, tokenizer, xml, curl, zip` and
   `gd` (or `imagick`) are enabled (MultiPHP INI Editor / *Select PHP Version → Extensions*).
4. **HTTPS.** Enable AutoSSL (or install a certificate) and force HTTPS redirects.
5. **Deploy config.** Copy `scripts/deploy.conf.example` → `scripts/deploy.conf` and set
   `APP_ROOT`, `PHP_BIN`, `KEEP_RELEASES`. `deploy.conf` is gitignored and stays on the server.
6. **Directory layout.**

   ```
   /home/<user>/app/
     releases/<version>/     extracted packages
     shared/.env             environment (symlinked into every release)
     shared/storage/         uploads + logs (symlinked into every release)
     current -> releases/<version>
     scripts/deploy-release.sh
   ```
7. **First install.** Upload/extract the first package, create `.env`, then run
   `php artisan app:install` (unattended options make it runnable from a Cron Jobs entry on a
   host without SSH) — see the package's `INSTALL.md`.

### If you cannot change the document root

Some plans keep the document root at `public_html`. The package ships a `.htaccess` at the
application root for exactly that case — it routes every request through `public/`:

- Extract the package **inside** the document root, and keep the root `.htaccess` in place.
- Verify: `https://your-host/.env` must return **404**, and `https://your-host/health` must
  return JSON.
- A **500** here means the host disallows `Options`/`RewriteRule` in `.htaccess`
  (`AllowOverride`). Ask the host to allow it, or move `public/` into the document root
  instead — with the root exposed and rewriting unavailable, `.env`, `storage/` and
  `vendor/` are downloadable.
- Do **not** add a `%{REQUEST_URI}` condition to the rewrite — `REQUEST_URI` does not change
  during an internal rewrite, so the rule then loops (500).
- A **403 on `/`** while static files still load means the bare URL resolved to a *directory*
  instead of the front controller, and the host's `DirectoryIndex` does not list `index.php`.
  Both `.htaccess` files shipped in the package handle this (root and `public/`), so `/` reaches
  `index.php` whichever layout you use.
- `https://your-host/build-info.txt` reports which build is actually deployed (version, commit,
  build time). It is a static file, so it answers even when the application is erroring —
  use it to confirm an upload really took effect.

`/resources/*` and `/storage/*` are real application URLs (marketing pages and uploaded
files) — never add a deny rule for those prefixes.

## 2. Scheduled tasks and background work

Add a cron entry (cPanel → *Cron Jobs*):

```
* * * * * /usr/local/bin/php /home/<user>/app/current/artisan schedule:run >> /dev/null 2>&1
```

A **queue worker** is required (kitchen tickets, notifications, email, offline sync, plus the
whole subscription/billing schedule). Two options:

- **Preferred — a supervised long-running worker** where the host supports it (VPS/dedicated
  cPanel with systemd or Supervisor):
  `php artisan queue:work --tries=3 --timeout=120`, restarted on deploy via `queue:restart`.
- **Fallback — cron-driven drain** where no process manager is available:
  ```
  * * * * * /usr/local/bin/php /home/<user>/app/current/artisan queue:work --stop-when-empty --tries=3 --timeout=120 >> /dev/null 2>&1
  ```
  This processes queued jobs once per minute rather than continuously — acceptable, but
  delivery is less immediate.

> The runbook standardises on the **cron drain** so it works on any cPanel plan; move to a
> supervised worker when the host allows it.

## 3. Deploying a release

### Automatically (CI)

Tagging `vX.Y.Z` builds the package in CI; the **manual** `deploy:production` job then uploads
it over SSH and runs `scripts/deploy-release.sh`. Configure these masked/protected CI/CD
variables (Settings → CI/CD → Variables): `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`,
`DEPLOY_SSH_KEY`, `APP_URL`. Leave the job un-run until the host and keys are configured.

### Manually

```bash
scp application-v1.0.0.zip* user@host:~/app/tmp/
ssh user@host
cd ~/app
bash scripts/deploy-release.sh v1.0.0 tmp/application-v1.0.0.zip
```

`deploy-release.sh` will:

1. verify the package checksum;
2. back up the database (`php artisan db:backup`) from the current release;
3. extract into `releases/<version>`;
4. link `shared/.env` and `shared/storage`;
5. run **only the pending migrations**;
6. swap `current` **atomically** (new symlink + rename);
7. rebuild config/route/view caches and `queue:restart`;
8. probe `/health` and **automatically roll back** if it fails;
9. append a record to `shared/deployments.jsonl` and prune old releases.

## 4. Rollback

```bash
cd ~/app && bash scripts/deploy-release.sh --rollback
```

Re-points `current` at the previous release (code rollback only). Migrations are additive and
reversible — roll one back with `php artisan migrate:rollback` **only** with a fresh backup in
hand, and never reverse a migration that dropped or rewrote data.

## 5. What survives a deploy

`shared/.env`, `shared/storage/` (uploads, logs, framework cache) and the database live outside
the release directories, so administrators, tenant data, uploads and configuration are never
replaced by a release. `.env` is never bundled in a package.
