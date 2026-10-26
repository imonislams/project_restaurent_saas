# CI/CD

**Related:** [RELEASE.md](./RELEASE.md) · [DEPLOY-CPANEL.md](./DEPLOY-CPANEL.md) · [PRODUCTION.md](./PRODUCTION.md)

Everything below is already implemented in `.gitlab-ci.yml` — this is the procedure around it.

---

## 1. What the pipeline does

Stages: **test → build → deploy.**

| Job | Runs on | Does |
|---|---|---|
| `test:php` | every branch, MR and tag | `vendor/bin/pint --test`, `php artisan test` |
| `test:frontend` | every branch, MR and tag | `npm ci`, `npx tsc --noEmit`, `npm run test:js` |
| `build:assets` | `main` or a `v*` tag | `npm ci && npm run build` → `public/build` artifact |
| `build:package` | a `v*` tag, **only after both test jobs and `build:assets` pass** | `composer install --no-dev`, `scripts/package.sh` → `dist/application-vX.Y.Z.zip` + `.sha256` |
| `release` | a `v*` tag | attaches the ZIP and checksum to a GitLab **Release** |
| `deploy:production` | a `v*` tag, **manual** | uploads the ZIP over SSH and runs `scripts/deploy-release.sh` |

A failed test job stops the pipeline, so a broken tag can never produce or publish a package.

## 2. One-time setup

1. **GitLab → Settings → CI/CD → Variables** (masked + protected):
   `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH` (e.g. `/home/<user>/app`), `DEPLOY_SSH_KEY` (private key), `APP_URL`.
2. **On the server** — add the matching public key (cPanel → *SSH Access* → *Manage SSH Keys*), then create `~/app/scripts/deploy.conf` from `scripts/deploy.conf.example` and set `APP_ROOT` and `PHP_BIN`.
3. Leave `deploy:production` un-played until both are in place — it is `when: manual` for that reason.

## 3. Releasing

1. Work on `feature/*`, open a merge request, let CI go green, merge into `develop`.
2. Add the `CHANGELOG.md` entry.
3. Cut the release:

   ```bash
   ./scripts/release.sh minor        # patch|minor|major
   ```

   It runs `composer release:check`, bumps `VERSION`, commits, pushes `develop`, merges to `main`, and pushes the annotated tag `vX.Y.Z`.
4. CI now runs the tag pipeline and produces the package. Check **Pipelines → the tag pipeline → `build:package`** — the artifact is `dist/application-vX.Y.Z.zip`, and the same files are linked on the GitLab Release page.
5. Press **▶** on `deploy:production`.
6. Verify: `GET /health` reports the new version, and `shared/deployments.jsonl` on the server has a `success` entry.

## 4. Rollback

```bash
ssh <user>@<host> "cd ~/app && bash scripts/deploy-release.sh --rollback"
```

Or re-run `deploy:production` for the previous tag. `deploy-release.sh` also rolls back automatically when the post-deploy health check fails.

## 5. If the host has no SSH

CI still does the important half — tests, the production build and the checksummed ZIP — but the
`deploy:production` job cannot run. Take the ZIP from the Release page and follow the package's
`INSTALL.md` (first install) or `UPGRADE.md` (upgrades). Two practical notes:

- The scheduler and queue worker can still be configured: cPanel → **Cron Jobs** is a UI.
- Migrations/caches can be run without a shell: cPanel → Cron Jobs (schedule once, then remove),
  or the platform admin's **command runner** in the app once it is installed.

## 6. Building a package by hand

```bash
composer install --no-dev --optimize-autoloader
npm ci && npm run build
bash scripts/package.sh vX.Y.Z                    # platform check enforced (CI default)
IGNORE_PLATFORM=1 bash scripts/package.sh vX.Y.Z  # platform check disabled (older host PHP)
```

`IGNORE_PLATFORM=1` is recorded in `RELEASE-MANIFEST.json` (`"platform_check": "disabled"`) so such
a build is never mistaken for a normal one. Prefer fixing the host's PHP version.
