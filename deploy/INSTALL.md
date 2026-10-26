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

## Install (cPanel)

1. **File Manager** → upload the ZIP and extract it outside the web root, e.g. `/home/<user>/app`.
2. **Domains** → your domain → **Manage** → set the **Document Root** to `<extract-dir>/public`.
   If the host keeps the root at `public_html` and will not change it, extract the package there
   instead and keep the shipped root `.htaccess` — it routes every request through `public/`.
3. Make `storage/` and `bootstrap/cache/` writable (**755**, recursive).
4. **MySQL Databases** → create a database and user, and give the user **ALL PRIVILEGES** on it.
   Migrations need `CREATE`, `ALTER` and `INDEX`, not just `SELECT`.
5. **Create `.env`** — enable *Show Hidden Files*, right‑click `.env.example` → **Copy** → name it
   `.env`, then **Edit** it:

   ```
   APP_NAME="Touch Dine"
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://your-host
   APP_KEY=
   APP_TIMEZONE=UTC

   DB_CONNECTION=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=youruser_dbname
   DB_USERNAME=youruser_dbuser
   DB_PASSWORD=your-db-password

   SESSION_DRIVER=database
   CACHE_STORE=database
   QUEUE_CONNECTION=database
   ```

6. Fill in `APP_KEY` (below), then create the schema and the first administrator (below).

## Generating `APP_KEY` without a shell

Upload this as `public/makekey.php`, open `https://your-host/makekey.php`, copy the value into
`APP_KEY=`, then **delete the file immediately**.

```php
<?php echo 'base64:'.base64_encode(random_bytes(32));
```

## Creating the schema and administrator without a shell

**cPanel → Cron Jobs is a command runner** — no SSH required. Add this job, let it run once
(it fires every minute), then delete it:

```
* * * * * /opt/cpanel/ea-php84/root/usr/bin/php /home/<user>/app/artisan app:install --no-interaction --url=https://your-host --db-database=youruser_dbname --db-username=youruser_dbuser --db-password=your-db-password --admin-email=you@your-host --admin-password=change-this-now9 >> /home/<user>/app/install.log 2>&1
```

Every prompt has an option, so it runs unattended. Then read `install.log`:

- `Installed v0.3.0. Administrator: …` → done; delete the cron job.
- anything else → the reason is on the last line.

The administrator password must be **at least 12 characters with letters and numbers**.
Find the PHP path in **MultiPHP Manager** (`/opt/cpanel/ea-php84/root/usr/bin/php` is the usual 8.4 CLI).

> The command line is visible in the crontab for that account. If that is a concern, rotate the
> database and administrator passwords after installing.

## Installing over SSH

```bash
php artisan app:install        # interactive; every option above also works here
```

## After installation

Add the scheduler (**Cron Jobs**):

```
* * * * * /opt/cpanel/ea-php84/root/usr/bin/php /home/<user>/app/artisan schedule:run >> /dev/null 2>&1
```

Run a queue worker — see `docs/DEPLOY-CPANEL.md` §2 for the supervised and cron options.

Then verify:

```bash
curl -fsS https://your-host/health
```
