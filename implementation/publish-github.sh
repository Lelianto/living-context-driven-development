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

publish_pkg() {
  local dir="$1" name="$2" deps="$3"
  echo ""
  echo "=== Publishing ${name} to GitHub Packages ==="
  cd "$BASE/packages/$dir"

  echo "//npm.pkg.github.com/:_authToken=${TOKEN}" > .npmrc
  echo "@${OWNER}:registry=https://npm.pkg.github.com" >> .npmrc

  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const bak = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    fs.writeFileSync('package.json.bak', JSON.stringify(bak, null, 2) + '\n');
    pkg.name = '@${OWNER}/${name}';
    pkg.publishConfig = { registry: '${REGISTRY}', access: 'public' };
    ${deps}
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "

  npm publish

  mv package.json.bak package.json
  rm -f .npmrc
}

publish_pkg "core" "lcdd-core" ""
publish_pkg "cli" "lcdd-cli" "pkg.dependencies = Object.fromEntries(Object.entries(pkg.dependencies).filter(([k]) => k !== '@lcdd/core')); pkg.dependencies['@${OWNER}/lcdd-core'] = '^0.2.1';"

echo ""
echo "Done."
echo "  https://github.com/${OWNER}/living-context-driven-development/pkgs/npm/lcdd-core"
echo "  https://github.com/${OWNER}/living-context-driven-development/pkgs/npm/lcdd-cli"
