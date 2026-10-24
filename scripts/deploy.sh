#!/usr/bin/env bash
# Deploy the current branch (or a tag) on the production server.
#   ./scripts/deploy.sh            # pull origin/main and deploy
#   ./scripts/deploy.sh v0.2.0     # deploy a specific tag (also used for rollback)
set -euo pipefail
cd "$(dirname "$0")/.."

REF="${1:-main}"

git fetch --tags --prune origin
if git show-ref --verify --quiet "refs/tags/$REF"; then
  git checkout --force "tags/$REF"
else
  git checkout "$REF"
  git pull --ff-only origin "$REF"
fi

export APP_COMMIT="$(git rev-parse --short HEAD)"

composer install --no-dev --optimize-autoloader --no-interaction
npm ci
npm run build
php artisan app:deploy

curl -fsS "${APP_URL:-http://localhost}/health" >/dev/null && echo "Health OK" || echo "WARNING: health check failed"
