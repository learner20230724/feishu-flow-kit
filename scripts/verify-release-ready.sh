#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

red() { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }

section() {
  echo
  echo "==> $*"
}

require_file() {
  local path="$1"
  if [ ! -f "$path" ]; then
    red "missing required file: $path"
    exit 1
  fi
}

section "Environment"
echo "node: $(node -v)"
echo "npm:  $(npm -v)"

section "Repo hygiene"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  red "not inside a git repository"
  exit 1
fi

echo "branch: $(git branch --show-current)"
if [ -n "$(git status --porcelain)" ]; then
  yellow "warning: git status is not clean"
  git status --porcelain
else
  green "git status clean"
fi

section "Required files"
require_file "README.md"
require_file "README.zh-CN.md"
require_file "LICENSE"
require_file "CHANGELOG.md"
require_file "CONTRIBUTING.md"
require_file ".env.example"
require_file "docs/demo-webhook-doc-flow.svg"
require_file ".github/workflows/ci.yml"

green "required files present"

section "Typecheck"
npm run -s check

green "typecheck ok"

section "Test"
npm test

green "tests ok"

section "npm pack (dry-run)"
PACK_OUT="$(npm pack --dry-run 2>/dev/null | sed -n '1,200p')"
echo "$PACK_OUT"

# Basic sanity: avoid shipping local env files.
if echo "$PACK_OUT" | grep -E "(^|/)\.env(\.|$)" -n >/dev/null 2>&1; then
  red "pack list contains .env files — abort"
  exit 1
fi
if echo "$PACK_OUT" | grep -E "(^|/)node_modules(/|$)" -n >/dev/null 2>&1; then
  red "pack list contains node_modules — abort"
  exit 1
fi

green "npm pack dry-run ok"

echo
GREEN_LINE="All checks passed."
green "$GREEN_LINE"
