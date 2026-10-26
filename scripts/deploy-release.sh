#!/usr/bin/env bash
# Deploy a versioned release on a cPanel/VPS host using a release-directory layout.
#
#   scripts/deploy-release.sh <version> [zip]     # deploy (zip optional if the release dir exists)
#   scripts/deploy-release.sh --rollback          # point `current` back one release
#
# Layout (APP_ROOT, default $HOME/app):
#   releases/<version>/   extracted release
#   shared/.env           symlinked into the release
#   shared/storage/       symlinked into the release
#   current -> releases/<version>
#
# Requires GNU coreutils (mv -T) — i.e. a Linux host, which is what cPanel runs on.
set -euo pipefail

SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
for conf in "$SELF_DIR/deploy.conf" "$HOME/app/deploy.conf"; do
  if [ -f "$conf" ]; then
    # shellcheck disable=SC1090
    . "$conf"
  fi
done

APP_ROOT="${APP_ROOT:-$HOME/app}"
PHP_BIN="${PHP_BIN:-php}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

RELEASES="$APP_ROOT/releases"
SHARED="$APP_ROOT/shared"
CURRENT="$APP_ROOT/current"
RECORD="$SHARED/deployments.jsonl"

read_link() { [ -L "$CURRENT" ] && readlink "$CURRENT" || true; }

relink() { # atomic swap: create the new link beside it, then rename over
  ln -sfn "$1" "$APP_ROOT/.current.tmp"
  mv -Tf "$APP_ROOT/.current.tmp" "$CURRENT"
}

record() { # record <version> <status> [commit]
  printf '{"version":"%s","status":"%s","commit":"%s","at":"%s","by":"%s"}\n' \
    "$1" "$2" "${3:-}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(whoami)" >> "$RECORD"
}

mkdir -p "$RELEASES" \
  "$SHARED/storage/app/public" "$SHARED/storage/app/private" \
  "$SHARED/storage/framework/cache/data" "$SHARED/storage/framework/sessions" \
  "$SHARED/storage/framework/views" "$SHARED/storage/logs"

# ------------------------------------------------------------------ rollback
if [ "${1:-}" = "--rollback" ]; then
  PREVIOUS="$(ls -1dt "$RELEASES"/*/ 2>/dev/null | sed -n '2p' || true)"
  [ -n "$PREVIOUS" ] || { echo "no previous release to roll back to" >&2; exit 1; }
  relink "${PREVIOUS%/}"
  record "$(basename "${PREVIOUS%/}")" "rolled-back"
  echo "Rolled back current -> ${PREVIOUS%/}"
  exit 0
fi

VERSION="${1:-}"
ZIP="${2:-}"
[ -n "$VERSION" ] || { echo "usage: scripts/deploy-release.sh <version> [zip]" >&2; exit 1; }

V="${VERSION#v}"
RELEASE="$RELEASES/$V"
PREVIOUS="$(read_link)"

# 1. verify the package checksum ------------------------------------------
if [ -n "$ZIP" ]; then
  [ -f "$ZIP" ] || { echo "package not found: $ZIP" >&2; exit 1; }
  if [ -f "$ZIP.sha256" ]; then
    ( cd "$(dirname "$ZIP")" && sha256sum -c "$(basename "$ZIP").sha256" ) || { echo "checksum verification FAILED" >&2; exit 1; }
  else
    echo "WARNING: no .sha256 beside the package; integrity not verified" >&2
  fi
fi

# 2. pre-deploy database backup -------------------------------------------
if [ -n "$PREVIOUS" ] && [ -f "$CURRENT/artisan" ]; then
  echo "Backing up the database before deploying $V..."
  "$PHP_BIN" "$CURRENT/artisan" db:backup || echo "WARNING: pre-deploy backup failed" >&2
fi

# 3. extract the new release ----------------------------------------------
rm -rf "$RELEASE"
mkdir -p "$RELEASE"
if [ -n "$ZIP" ]; then
  unzip -q "$ZIP" -d "$RELEASE"
else
  echo "No package supplied — assuming $RELEASE is already populated."
fi

# 4. shared configuration and storage -------------------------------------
[ -f "$SHARED/.env" ] || cp "$RELEASE/.env.example" "$SHARED/.env"
ln -sfn "$SHARED/.env" "$RELEASE/.env"

rm -rf "$RELEASE/storage"
ln -sfn "$SHARED/storage" "$RELEASE/storage"
ln -sfn "$SHARED/storage/app/public" "$RELEASE/public/storage"

COMMIT="$(sed -n 's/.*"commit": *"\([^"]*\)".*/\1/p' "$RELEASE/RELEASE-MANIFEST.json" 2>/dev/null | head -1 || true)"

# 5. run only the pending migrations --------------------------------------
"$PHP_BIN" "$RELEASE/artisan" migrate --force

# 6. atomic switch ---------------------------------------------------------
relink "$RELEASE"

# 7. rebuild caches and restart workers -----------------------------------
"$PHP_BIN" "$RELEASE/artisan" config:cache
"$PHP_BIN" "$RELEASE/artisan" route:cache
"$PHP_BIN" "$RELEASE/artisan" view:cache
"$PHP_BIN" "$RELEASE/artisan" queue:restart || true

# 8. health check + automatic rollback ------------------------------------
HEALTH_URL="${HEALTH_URL:-$(sed -n 's/^APP_URL=//p' "$SHARED/.env" | tr -d '"' | head -1)}"
HEALTH_URL="${HEALTH_URL%/}/health"

if [ -n "${HEALTH_URL#/health}" ]; then
  if ! curl -fsS --max-time 15 "$HEALTH_URL" >/dev/null; then
    echo "HEALTH CHECK FAILED at $HEALTH_URL" >&2
    if [ -n "$PREVIOUS" ]; then
      relink "$PREVIOUS"
      echo "Rolled back to $(basename "$PREVIOUS")." >&2
    fi
    record "$V" "failed" "$COMMIT"
    exit 1
  fi
  echo "Health check OK ($HEALTH_URL)"
fi

# 9. record + prune --------------------------------------------------------
record "$V" "success" "$COMMIT"
ls -1dt "$RELEASES"/*/ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf

echo "Deployed $V. current -> $RELEASE"
