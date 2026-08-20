#!/usr/bin/env bash
set -e

echo "[Smoke] Starting smoke-redis-recovery.sh"

API_URL="http://localhost:3000"

# 1. Kill Redis
echo "[Smoke] Stopping Redis container..."
docker stop nexttransit-redis

# 2. Wait a bit, check readiness (API should degrade)
sleep 5
echo "[Smoke] Testing API /health/ready while Redis is down..."
READY_HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health/ready")
if [ "$READY_HTTP_STATUS" != "503" ]; then
  echo "[Smoke-Error] API did not degrade its readiness when Redis is down. Status: $READY_HTTP_STATUS"
  exit 1
fi
echo "[Smoke] API correctly degraded."

# 3. Restore Redis
echo "[Smoke] Starting Redis container again..."
docker start nexttransit-redis

# 4. Wait for recovery
echo "[Smoke] Waiting for API to recover..."
TIMEOUT=30
START_TIME=$(date +%s)
RECOVERED=false

while true; do
  READY_HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health/ready")
  if [ "$READY_HTTP_STATUS" == "200" ]; then
    RECOVERED=true
    break
  fi

  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "[Smoke-Error] API did not recover within timeout."
    curl -s "$API_URL/health/ready" || true
    exit 1
  fi
  sleep 2
done

echo "[Smoke] API recovered successfully."
echo "[Smoke] Redis recovery smoke test passed."
exit 0
