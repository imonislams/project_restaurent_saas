#!/usr/bin/env bash
# Cut a release from develop: bump VERSION, merge to main, tag, push.
#   ./scripts/release.sh patch|minor|major
set -euo pipefail
cd "$(dirname "$0")/.."

PART="${1:-patch}"

[ "$(git branch --show-current)" = "develop" ] || { echo "Run from develop."; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Working tree not clean."; exit 1; }

composer release:check
php artisan version:bump "$PART"
VERSION="$(tr -d '[:space:]' < VERSION)"

git commit -am "chore(release): v$VERSION"
git push origin develop
git checkout main
git pull --ff-only origin main
git merge --no-ff develop -m "Release v$VERSION"
git tag -a "v$VERSION" -m "Release v$VERSION"
git push origin main "v$VERSION"
git checkout develop

echo "Released v$VERSION. CI deploys the tag; or run ./scripts/deploy.sh v$VERSION on the server."
