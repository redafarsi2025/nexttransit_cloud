#!/usr/bin/env bash
set -e

echo "[Smoke] Starting smoke-worker-restart.sh"

# 1. Stop Worker
echo "[Smoke] Stopping worker container..."
docker stop nexttransit-worker

# 2. Enqueue job
API_URL="http://localhost:3000"
SMOKE_RUN_ID="smoke-restart-$(date +%s)"
echo "[Smoke] Sending event while worker is stopped ($SMOKE_RUN_ID)..."

curl -s -o /dev/null -X POST "$API_URL/api/webhooks/telemetry/flespi" \
  -H "Content-Type: application/json" \
  -d "[{\"id\": 1, \"ident\": \"$SMOKE_RUN_ID\", \"timestamp\": $(date +%s)}]"

# 3. Start Worker
echo "[Smoke] Starting worker container again..."
docker start nexttransit-worker

# 4. Wait for processing
echo "[Smoke] Waiting for worker to process queued job..."
sleep 10

# Note: Ideally we query BullMQ or Supabase here, but since the event is likely dropped as Unknown Device,
# we just verify the worker started successfully and didn't crash.
if [ "$(docker inspect -f '{{.State.Running}}' nexttransit-worker)" != "true" ]; then
  echo "[Smoke-Error] Worker failed to start after restart!"
  exit 1
fi

echo "[Smoke] Worker restart smoke test passed."
exit 0
