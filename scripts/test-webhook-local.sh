#!/usr/bin/env bash
# test-webhook-local.sh
# Send sample webhook events to a locally running feishu-flow-kit server.
# Usage: ./scripts/test-webhook-local.sh [event-file.json]
#   or  ./scripts/test-webhook-local.sh all    — send every sample in order
# Defaults to localhost:8787; override with BASE_URL env var.
#
# Requirements: curl, bash, jq (optional, for pretty-printing responses)

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8787}"
WEBHOOK_EVENTS_DIR="$(dirname "$0")/../examples/webhook-events"
export VERIFY_TOKEN="${VERIFY_TOKEN:-test-verify-token}"
export FEISHU_APP_ID="${FEISHU_APP_ID:-test-app-id}"
export FEISHU_APP_SECRET="${FEISHU_APP_SECRET:-test-app-secret}"

# Colour helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[→]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err() { echo -e "${RED}[✗]${NC} $*" >&2; }

# Check server is up
check_server() {
  local status_url="${BASE_URL}/status"
  if curl -sf --max-time 3 "${status_url}" > /dev/null 2>&1; then
    log "Server is up at ${BASE_URL}"
  else
    warn "Server not responding at ${BASE_URL}/status — make sure it is running (npm start)"
    warn "Start with:  npm start"
    exit 1
  fi
}

# Send a single event file
send_event() {
  local file="$1"
  local name
  name="$(basename "$file" .json)"

  log "Sending: $name"
  local http_code response
  http_code=$(curl -s -o /tmp/curl-response-${name}.txt -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d @"$file" \
    "${BASE_URL}/webhook" \
    --max-time 10 \
  )
  response=$(cat /tmp/curl-response-${name}.txt)
  rm -f /tmp/curl-response-${name}.txt

  if [[ "$http_code" == "200" ]]; then
    log "  ✓ $name → HTTP 200"
  else
    warn "  HTTP $http_code for $name"
    echo "    Response: ${response:0:200}"
  fi
}

# ── Main ─────────────────────────────────────────────────────────────────────

check_server

if [[ $# -eq 0 ]]; then
  warn "Usage: $0 <event-file.json>   or   $0 all"
  warn "Sending all events…"
  echo
  for f in "${WEBHOOK_EVENTS_DIR}"/*.json; do
    [[ -e "$f" ]] || { err "No JSON files found in ${WEBHOOK_EVENTS_DIR}"; exit 1; }
    echo
    send_event "$f"
  done
elif [[ "$1" == "all" ]]; then
  for f in "${WEBHOOK_EVENTS_DIR}"/*.json; do
    [[ -e "$f" ]] || { err "No JSON files found in ${WEBHOOK_EVENTS_DIR}"; exit 1; }
    echo
    send_event "$f"
  done
else
  if [[ -f "$1" ]]; then
    send_event "$(realpath "$1")"
  else
    err "File not found: $1"
    exit 1
  fi
fi

echo
log "Done — check server logs for processed replies."
