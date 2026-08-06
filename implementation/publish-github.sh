#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./publish-github.sh <github_token>"
  echo ""
  echo "Create a token at: https://github.com/settings/tokens"
  echo "Required scope: write:packages"
  exit 1
fi

TOKEN=$1
REGISTRY="https://npm.pkg.github.com"
OWNER="Lelianto"
BASE=$(dirname "$0")
ROOT_NPMRC="$BASE/.npmrc"

cleanup() {
  rm -f "$ROOT_NPMRC"
  for d in packages/core packages/cli; do
    [ -f "$BASE/$d/package.json.bak" ] && mv "$BASE/$d/package.json.bak" "$BASE/$d/package.json"
    rm -f "$BASE/$d/.npmrc"
  done
}
trap cleanup EXIT

echo "//npm.pkg.github.com/:_authToken=${TOKEN}" > "$ROOT_NPMRC"

publish_pkg() {
  local dir="$1" name="$2" deps="$3"
  echo ""
  echo "=== Publishing ${name} to GitHub Packages ==="

  local pkgjson="$BASE/packages/$dir/package.json"
  cp "$pkgjson" "$pkgjson.bak"

  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$pkgjson', 'utf-8'));
    pkg.name = '@${OWNER}/${name}';
    pkg.publishConfig = { registry: '${REGISTRY}', access: 'public' };
    ${deps}
    fs.writeFileSync('$pkgjson', JSON.stringify(pkg, null, 2) + '\n');
  "

  cd "$BASE/packages/$dir"
  cp "$ROOT_NPMRC" .npmrc
  npm publish --registry "$REGISTRY"
  rm -f .npmrc
  cd "$BASE"

  mv "$pkgjson.bak" "$pkgjson"
}

publish_pkg "core" "lcdd-core" ""
publish_pkg "cli" "lcdd-cli" "pkg.dependencies = Object.fromEntries(Object.entries(pkg.dependencies).filter(([k]) => k !== '@lcdd/core')); pkg.dependencies['@${OWNER}/lcdd-core'] = '^0.2.1';"

echo ""
echo "Done."
echo "  https://github.com/${OWNER}/living-context-driven-development/pkgs/npm/lcdd-core"
echo "  https://github.com/${OWNER}/living-context-driven-development/pkgs/npm/lcdd-cli"
