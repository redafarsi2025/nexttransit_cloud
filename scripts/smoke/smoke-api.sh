#!/usr/bin/env bash
set -e

echo "[Smoke] Starting smoke-api.sh"

API_URL="http://localhost:3000"

# 1. Check Liveness
echo "[Smoke] Testing API /health/live..."
LIVE_HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health/live")
if [ "$LIVE_HTTP_STATUS" != "200" ]; then
  echo "[Smoke-Error] Liveness probe failed. HTTP status: $LIVE_HTTP_STATUS"
  exit 1
fi
echo "[Smoke] API is Live."

# 2. Check Readiness
echo "[Smoke] Testing API /health/ready..."
READY_HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health/ready")
if [ "$READY_HTTP_STATUS" != "200" ]; then
  echo "[Smoke-Error] Readiness probe failed. HTTP status: $READY_HTTP_STATUS"
  curl -s "$API_URL/health/ready" | jq . || true
  exit 1
fi
echo "[Smoke] API is Ready."

echo "[Smoke] API smoke tests passed."
exit 0
