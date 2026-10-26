# Release & Versioning

**Related docs:** [PRODUCTION.md](./PRODUCTION.md) · [ROADMAP.md](./ROADMAP.md) · [PHASES.md](./PHASES.md) · [PWA-OFFLINE.md](./PWA-OFFLINE.md)

How this project is versioned, branched, tagged and released. Deploy mechanics live in
[PRODUCTION.md](./PRODUCTION.md); this document defines the *process* around them.

---

## 1. Version number

- **Semantic Versioning** `MAJOR.MINOR.PATCH`, optionally with a pre-release suffix
  (`-rc.1`). The platform is a business application: `MAJOR` for a breaking change to
  tenant data or workflows, `MINOR` for a backward-compatible feature, `PATCH` for fixes.
- **Single source of truth:** a `VERSION` file at the repository root containing the bare
  version (e.g. `0.1.0`). It **must not** be duplicated in `package.json`/`composer.json`.
- The version is read by `config/version.php` and shared with the frontend through Inertia,
  so PHP, the UI and `/health` all report the same value.
- The **build commit** (short SHA) is captured at build time. It is build metadata, not part
  of the version; the build uses it to revision the precached offline shell.
- A deploy may set `APP_VERSION` / `APP_COMMIT` in the environment (for example from the tag
  being released); otherwise the committed `VERSION` file is used, and outside production the
  commit is detected from git.

Where the version is surfaced: the app-shell sidebar footer, `GET /health`, and the
`php artisan app:version` command. A deploy that changes the frontend **must** change the
version so installed PWAs pick up new assets.

## 2. Branch model

| Branch | Purpose |
|---|---|
| `main` | Production. Every commit is a released (or hotfix) state. Tagged. |
| `develop` | Integration. Default working branch. |
| `feature/*`, `fix/*`, `chore/*` | Short-lived, branched from `develop`, merged back via PR. |
| `release/x.y` | Optional stabilisation branch cut from `develop` before tagging `main`. |
| `hotfix/x.y.z` | Branched from `main` for an urgent production fix; merged to `main` **and** `develop`. |

Rules:

- Work **must not** be committed directly to `main`.
- A release is only tagged from `main`.
- Merge `develop` → `main` for a release; tag `main` with `vX.Y.Z`.

## 3. Commit convention

Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
Example: `fix(email): record outbound mail when the body column is missing`.

This gives the changelog its structure and makes history scannable — the current history
("Added this", "added") is the reason this convention exists.

## 4. Changelog

`CHANGELOG.md` at the repository root, [Keep a Changelog](https://keepachangelog.com/)
format, newest first, grouped as `Added / Changed / Fixed / Removed / Security`. Every
release **must** add an entry. Unreleased work accumulates under `## [Unreleased]`.

## 5. Release procedure

1. Ensure `develop` is green (build + tests) and `CHANGELOG.md` has the release entry.
2. Bump `VERSION` (`php artisan version:bump patch|minor|major`).
3. Merge `develop` → `main`.
4. Tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"` and push the tag.
5. CI builds the versioned package and publishes it as a Release asset (§5.1).
6. Deploy per [PRODUCTION.md](./PRODUCTION.md) §2.
7. Verify `/health` reports the new version; confirm queue workers restarted.

### 5.1 Release artifact

Tagging `vX.Y.Z` runs the `build:package` job once the test suites pass, producing
`application-vX.Y.Z.zip` and its `application-vX.Y.Z.zip.sha256`; the `release` job attaches
both to the GitLab Release so every tag has a downloadable, checksummed build. The archive
contains the application source, `vendor/` (without dev packages), `public/build/` (compiled
assets + PWA manifest and service worker), the empty writable `storage/` and `bootstrap/cache/`
directories, install/upgrade instructions and a `RELEASE-MANIFEST.json` (version, commit, build
time, PHP and Laravel versions). Build the same package locally with:

```bash
composer install --no-dev --optimize-autoloader
npm ci && npm run build
bash scripts/package.sh vX.Y.Z
```

Always verify a package before installing or deploying it:
`sha256sum -c application-vX.Y.Z.zip.sha256`.


Pre-release gate (`composer release:check`) runs the type-check, code style and test suite.
Tests are only executed when explicitly authorised.

## 6. Rollback

- Deploy the previous tag's build (`git checkout vX.Y-1`, rebuild) — the previous release
  is always a valid artifact.
- Additive migrations may be rolled back with `php artisan migrate:rollback`; **never** roll
  back a migration that dropped or rewrote data without restoring a backup (§7 of
  [PRODUCTION.md](./PRODUCTION.md)).
- Because installed PWAs cache assets, a rollback **must** ship a version change and let the
  update prompt take effect; a browser may otherwise serve the previous service worker's
  cache.

## 7. First release

There are currently **no tags** in this repository, so the first release establishes the
baseline. Proposed: **`v0.1.0`** (the PWA/versioning milestone), with `v1.0.0` reserved for
the first full production go-live. This is a product decision — confirm before tagging.

---

## Status

Phased delivery with approval gates (see [ROADMAP.md](./ROADMAP.md) Phase 17). Per-phase
reports are recorded in [PHASES.md](./PHASES.md).
