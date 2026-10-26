# Installation

This package is a complete, versioned production build. Its contents:

| Item | Notes |
|---|---|
| `RELEASE-MANIFEST.json` | Version, Git commit, build time, PHP/Laravel versions |
| `application-<version>.zip.sha256` | Checksum that ships beside this archive |
| `app/ bootstrap/ config/ database/ lang/ public/ resources/ routes/` | Application source |
| `vendor/` | Production PHP dependencies (no dev packages) |
| `public/build/` | Compiled frontend assets + PWA manifest and service worker |
| `storage/ bootstrap/cache/` | Empty, writable runtime directories |

Verify the archive before extracting:

```bash
sha256sum -c application-<version>.zip.sha256
```

## Option A — first-time install via the setup wizard (cPanel)

1. Upload `application-<version>.zip` through **cPanel → File Manager** and extract it
   outside the web root, e.g. `/home/<user>/app`.
2. Point the domain's **document root** at `<extract-dir>/public`
   (cPanel → Domains → the domain → Manage → Document Root).
3. Set permissions so the web server can write: `storage/` and `bootstrap/cache/`
   (normally `755` for directories, `644` for files).
4. Create the database and user in **cPanel → MySQL Databases**.
5. Open the application URL in a browser. The **setup wizard** runs:
   system requirements → database → application → database initialization →
   administrator account → validation → completion.
6. The wizard writes `.env`, generates `APP_KEY`, runs migrations, seeds roles/plans/email
   templates, creates the first administrator and then **locks the installer**.

## Option B — install over SSH

```bash
# from the extracted application directory
cp .env.example .env
php artisan app:install       # interactive: database, application, administrator
```

## After installation

Add the scheduler entry to crontab (**cPanel → Cron Jobs**):

```
* * * * * /usr/local/bin/php /home/<user>/app/current/artisan schedule:run >> /dev/null 2>&1
```

Run a queue worker (see `docs/DEPLOY-CPANEL.md` for the Supervisor and cron-fallback options).

Then verify:

```bash
curl -fsS https://your-host/health
```

> The wizard at `/install` locks itself once installed (a lock file in `storage/app/private`),
> and over SSH `php artisan app:install` does the same headlessly. Both write `.env`, run
> migrations, seed roles/plans/email templates and create the first administrator. To provision
> by hand instead: copy `.env.example` to `.env`, then `php artisan key:generate`,
> `php artisan migrate --force`, `php artisan db:seed --force` and create an administrator.
