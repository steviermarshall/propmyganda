#!/usr/bin/env bash
# audit.sh — run the four-dimension audit. Exits non-zero on any failure.
# Usage: bash audit.sh [--push]
# Without --push, runs audit only and reports.
# With --push, auto-pushes to main on full success.

set -e

PUSH=false
if [[ "$1" == "--push" ]]; then
  PUSH=true
fi

echo "=== PMG REPO AUDIT ==="
echo

# Safety: never let this script touch Lovable
if grep -rEq "lovable (publish|deploy)" package.json 2>/dev/null; then
  echo "BLOCKED: package.json contains a lovable publish/deploy script."
  echo "Remove it before running audit."
  exit 2
fi

# Confirm clean tree
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree not clean. Stash or commit first."
  git status --short
  exit 2
fi

git pull origin main

echo
echo "--- D1: lint / types / build ---"
npm ci
npx eslint . --max-warnings=0
npx tsc --noEmit
npm run build

echo
echo "--- D2: tests / security ---"
if npm run | grep -qE "^  (test|test:run)$"; then
  npm test -- --run 2>/dev/null || npm test
else
  echo "(no test script — skipping)"
fi
npm audit --audit-level=high

echo
echo "--- D3: quality checks (informational) ---"
# Find files over 300 lines
find src -name "*.tsx" -o -name "*.ts" 2>/dev/null | xargs wc -l 2>/dev/null | awk '$1 > 300 && $2 != "total" {print "  large:", $2, "("$1" lines)"}'
# Find console.log in src
grep -rn "console.log" src/ 2>/dev/null | grep -v ".test." | head -20 | sed 's/^/  console: /'

echo
echo "--- D4: structure ---"
node -e "
const pkg = require('./package.json');
const fs = require('fs');
const checks = [
  ['package.json type=module', pkg.type === 'module'],
  ['vite.config exists', fs.existsSync('vite.config.ts') || fs.existsSync('vite.config.js')],
  ['index.html at root', fs.existsSync('index.html')],
  ['src/main entry exists', fs.existsSync('src/main.tsx') || fs.existsSync('src/main.jsx')],
  ['.env in .gitignore', fs.existsSync('.gitignore') && fs.readFileSync('.gitignore','utf8').includes('.env')],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log((ok ? '  OK   ' : '  FAIL ') + name);
  if (!ok) failed++;
}
if (failed) process.exit(1);
"

echo
echo "=== AUDIT PASSED ==="

if $PUSH; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Changes detected — committing and pushing to main"
    git add -A
    git commit -m "audit: automated cleanup pass"
    git push origin main
  else
    echo "No changes to push."
  fi
fi
