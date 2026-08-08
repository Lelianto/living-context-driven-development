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
BASE="$(cd "$(dirname "$0")" && pwd)"
ROOT_NPMRC="$BASE/.npmrc"

cleanup() {
  rm -f "$ROOT_NPMRC"
  for d in packages/core packages/cli packages/mcp; do
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

# Core first; cli/mcp depend on it, so they must resolve @Lelianto/lcdd-core at the
# version being published right now, not a stale hardcoded range.
CORE_VERSION="$(node -e "console.log(require('$BASE/packages/core/package.json').version)")"

publish_pkg "core" "lcdd-core" ""
publish_pkg "cli" "lcdd-cli" "pkg.dependencies = Object.fromEntries(Object.entries(pkg.dependencies).filter(([k]) => k !== '@lcdd/core')); pkg.dependencies['@${OWNER}/lcdd-core'] = '^${CORE_VERSION}';"
publish_pkg "mcp" "lcdd-mcp" "pkg.dependencies = Object.fromEntries(Object.entries(pkg.dependencies).filter(([k]) => k !== '@lcdd/core')); pkg.dependencies['@${OWNER}/lcdd-core'] = '^${CORE_VERSION}';"

echo ""
echo "Done."
echo "  https://github.com/${OWNER}/living-context-driven-development/pkgs/npm/lcdd-core"
echo "  https://github.com/${OWNER}/living-context-driven-development/pkgs/npm/lcdd-cli"
echo "  https://github.com/${OWNER}/living-context-driven-development/pkgs/npm/lcdd-mcp"
