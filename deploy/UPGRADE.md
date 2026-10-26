# Upgrading

An upgrade replaces **code only**. The database, the administrator account, tenant data and
uploaded files are preserved across releases.

## What is shared (never replaced by a release)

- `shared/.env` — environment configuration (symlinked into each release)
- `shared/storage/` — uploads, logs, framework cache (symlinked into each release)
- The MySQL database

## Release-directory upgrade (recommended — cPanel with SSH)

Deployment keeps one directory per version and switches an atomic `current` symlink:

```
app/releases/<version>/     extracted release
app/shared/.env             symlinked into the release
app/shared/storage/         symlinked into the release
app/current -> releases/<version>
```

```bash
# on the server, with the new package uploaded
./scripts/deploy-release.sh v1.1.0 /path/to/application-v1.1.0.zip
```

The script verifies the checksum, backs up the database, extracts the release, links the
shared `.env` and `storage/`, runs **only the pending migrations**, swaps `current`
atomically, runs health checks, and reverts to the previous release if the checks fail.

## Manual upgrade (no SSH)

1. Back up the database and download a copy of the current release directory.
2. Extract the new package into a new directory (e.g. `releases/<new-version>`).
3. Copy the existing `.env` into the new directory and symlink (or copy) `storage/`.
4. Run `php artisan migrate --force` from the new directory.
5. Repoint the document root / move `current` to the new directory.
6. Visit `/health` to confirm the new version.

## Rollback

Point `current` (or the document root) back at the previous release directory — the previous
release is always a valid artifact. Only roll back an additive migration with
`php artisan migrate:rollback` and a fresh backup in hand; never reverse a migration that
dropped or rewrote data without restoring a backup.

> **Note (current phase).** `scripts/deploy-release.sh` is delivered in the deployment phase.
> Until it ships, apply the manual steps above.
