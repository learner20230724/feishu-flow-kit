#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

EXPECTED_REMOTE="https://github.com/learner20230724/feishu-flow-kit.git"
CURRENT_BRANCH="$(git branch --show-current)"

if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "error: expected current branch to be main, got: $CURRENT_BRANCH" >&2
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$EXPECTED_REMOTE"
fi

REMOTE_URL="$(git remote get-url origin)"
if [ "$REMOTE_URL" != "$EXPECTED_REMOTE" ]; then
  echo "error: origin remote mismatch" >&2
  echo "expected: $EXPECTED_REMOTE" >&2
  echo "actual:   $REMOTE_URL" >&2
  exit 1
fi

echo "Pushing main to origin..."
git push -u origin main

echo "Pushing tags..."
git push origin --tags
