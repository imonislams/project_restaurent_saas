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

DIST="$ROOT/dist"
mkdir -p "$DIST"

STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

# --- application tree (explicit include set; dev files never copied) -------
INCLUDE=(
  app bootstrap config database lang public resources routes
  artisan composer.json composer.lock VERSION CHANGELOG.md .env.example vendor
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
