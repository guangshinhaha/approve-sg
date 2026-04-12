#!/bin/sh
set -e

# Chase cron runner — hits the main app's chase endpoint.
# Retries up to 3 times with exponential backoff on failure.

APP_URL="${APP_URL:-https://approve-sg.up.railway.app}"
ENDPOINT="${APP_URL}/api/internal/chase"
MAX_RETRIES=3
RETRY_DELAY=2

echo "[chase-cron] $(date -u '+%Y-%m-%dT%H:%M:%SZ') Starting chase cycle"

attempt=1
while [ $attempt -le $MAX_RETRIES ]; do
  HTTP_CODE=$(curl -fsS -o /dev/null -w '%{http_code}' \
    -X POST \
    -H "x-cron-secret: ${CRON_SECRET}" \
    "${ENDPOINT}" 2>/dev/null) && {
    echo "[chase-cron] Success (HTTP ${HTTP_CODE})"
    exit 0
  }

  echo "[chase-cron] Attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${RETRY_DELAY}s..."
  sleep $RETRY_DELAY
  RETRY_DELAY=$((RETRY_DELAY * 2))
  attempt=$((attempt + 1))
done

echo "[chase-cron] ERROR: All ${MAX_RETRIES} attempts failed"
exit 1
