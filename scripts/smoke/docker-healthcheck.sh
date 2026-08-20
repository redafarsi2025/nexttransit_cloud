#!/usr/bin/env bash
set -e

echo "[Smoke] Starting docker-healthcheck.sh"
TIMEOUT=60
START_TIME=$(date +%s)

function check_health() {
  local container=$1
  # Check if container is running
  if [ "$(docker inspect -f '{{.State.Running}}' $container 2>/dev/null)" != "true" ]; then
    return 1
  fi
  # If it has a healthcheck, wait for it to be healthy
  local hc=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' $container 2>/dev/null)
  if [ -n "$hc" ] && [ "$hc" != "healthy" ]; then
    return 1
  fi
  return 0
}

while true; do
  ALL_READY=true
  for srv in nexttransit-redis nexttransit-api nexttransit-worker nexttransit-prometheus; do
    if ! check_health $srv; then
      ALL_READY=false
      break
    fi
  done

  if [ "$ALL_READY" = "true" ]; then
    echo "[Smoke] All containers are running and healthy!"
    exit 0
  fi

  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "[Smoke] Timeout waiting for containers to become healthy."
    docker ps
    exit 1
  fi

  echo "[Smoke] Waiting for containers... ($ELAPSED/$TIMEOUT s)"
  sleep 5
done
