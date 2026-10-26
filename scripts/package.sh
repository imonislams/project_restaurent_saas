#!/usr/bin/env bash
# Build a versioned production package: dist/application-<version>.zip (+ .sha256).
#
#   scripts/package.sh v1.0.0        # or 1.0.0
#
# Preconditions (the CI build stage satisfies these):
#   - vendor/ installed with --no-dev --optimize-autoloader
#   - public/build/ built with `npm ci && npm run build`
#   - VERSION matches the version being packaged
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "usage: scripts/package.sh <version>" >&2
  exit 1
fi
VERSION="${VERSION#v}"

FILE_VERSION="$(tr -d '[:space:]' < VERSION)"
if [ "$FILE_VERSION" != "$VERSION" ]; then
  echo "VERSION file ($FILE_VERSION) does not match $VERSION" >&2
  exit 1
fi

[ -d vendor ] || { echo "vendor/ missing — run composer install --no-dev --optimize-autoloader" >&2; exit 1; }
[ -d public/build ] || { echo "public/build/ missing — run npm ci && npm run build" >&2; exit 1; }
command -v zip >/dev/null 2>&1 || { echo "zip is required" >&2; exit 1; }

# IGNORE_PLATFORM=1 builds a package whose Composer platform check is disabled, for a
# host that cannot run the PHP version the lock requires. The code still needs that
# PHP at runtime — Composer's guard is removed, not the requirement. Recorded in the
# manifest so the artifact is never mistaken for a normal build.
IGNORE_PLATFORM="${IGNORE_PLATFORM:-0}"
export IGNORE_PLATFORM

DIST="$ROOT/dist"
mkdir -p "$DIST"

STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

# --- application tree (explicit include set; dev files never copied) -------
INCLUDE=(
  app bootstrap config database lang public resources routes
  artisan composer.json composer.lock VERSION CHANGELOG.md .env.example .htaccess vendor
)
for path in "${INCLUDE[@]}"; do
  [ -e "$path" ] || { echo "missing include: $path" >&2; exit 1; }
  cp -R "$path" "$STAGING/"
done

# Drop anything inside an included directory that must not ship.
rm -rf "$STAGING"/public/hot "$STAGING"/public/storage "$STAGING"/public/build/.vite
rm -f  "$STAGING"/bootstrap/cache/*.php
find "$STAGING" -name '.DS_Store' -delete
find "$STAGING" -name '*.log' -delete

# Disable the generated platform check. autoload_real.php requires this file, so it
# is replaced with a no-op rather than deleted.
if [ "$IGNORE_PLATFORM" = "1" ]; then
  cat > "$STAGING/vendor/composer/platform_check.php" <<'PHP'
<?php

// Platform check disabled at build time (IGNORE_PLATFORM=1).
// The application still requires the PHP version declared in composer.json.
return array();
PHP
fi

# --- writable, shipped-empty runtime directories ---------------------------
mkdir -p \
  "$STAGING"/storage/app/private \
  "$STAGING"/storage/app/public \
  "$STAGING"/storage/framework/cache/data \
  "$STAGING"/storage/framework/sessions \
  "$STAGING"/storage/framework/views \
  "$STAGING"/storage/framework/testing \
  "$STAGING"/storage/logs \
  "$STAGING"/bootstrap/cache

for dir in \
  storage/app/private storage/app/public storage/framework/cache \
  storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
do
  printf '*\n!.gitignore\n' > "$STAGING/$dir/.gitignore"
done

# --- instructions + manifest ----------------------------------------------
cp deploy/INSTALL.md deploy/UPGRADE.md "$STAGING/"
php scripts/release-manifest.php "$VERSION" "$STAGING" >/dev/null

# --- guard: files the application reads at runtime ------------------------
# resources/views/app.blade.php uses Ziggy's @routes, which reads this asset from
# vendor/ at render time. A build that drops vendor/*/dist (for example an
# over-broad "dist" exclusion when staging) produces a package that 500s on
# every page, so fail loudly here instead.
for required in vendor/autoload.php vendor/tightenco/ziggy/dist/route.umd.js; do
  [ -f "$STAGING/$required" ] || { echo "PACKAGE INCOMPLETE: missing $required" >&2; exit 1; }
done

# --- archive + checksum ----------------------------------------------------
PKG="application-v$VERSION.zip"
ZIP="$DIST/$PKG"
rm -f "$ZIP" "$ZIP.sha256"
( cd "$STAGING" && zip -X -q -r "$ZIP" . )

if command -v sha256sum >/dev/null 2>&1; then
  ( cd "$DIST" && sha256sum "$PKG" > "$PKG.sha256" )
else
  ( cd "$DIST" && shasum -a 256 "$PKG" > "$PKG.sha256" )
fi

echo "Built $ZIP"
echo "Checksum $ZIP.sha256"
