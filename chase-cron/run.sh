#!/bin/sh
set -e

# Chase cron runner — hits the main app's chase endpoint.
# Retries up to 3 times with exponential backoff on failure.

APP_URL="${APP_URL:-https://approve-sg.up.railway.app}"
ENDPOINT="${APP_URL}/api/internal/chase"
MAX_RETRIES=3
RETRY_DELAY=2

echo "[chase-cron] $(date -u '+%Y-%m-%dT%H:%M:%SZ') Starting chase cycle"
echo "[chase-cron] Endpoint: ${ENDPOINT}"
echo "[chase-cron] CRON_SECRET is ${CRON_SECRET:+set}${CRON_SECRET:-NOT SET}"

attempt=1
while [ $attempt -le $MAX_RETRIES ]; do
  echo "[chase-cron] Attempt ${attempt}/${MAX_RETRIES}..."

  RESPONSE=$(curl -sS -o /tmp/response.txt -w '%{http_code}' \
    -X POST \
    -H "x-cron-secret: ${CRON_SECRET}" \
    "${ENDPOINT}" 2>&1) || true

  HTTP_CODE="${RESPONSE}"
  BODY=$(cat /tmp/response.txt 2>/dev/null || echo "(no body)")

  echo "[chase-cron] HTTP ${HTTP_CODE} — ${BODY}"

  if [ "${HTTP_CODE}" = "200" ] || [ "${HTTP_CODE}" = "201" ]; then
    echo "[chase-cron] Success"
    exit 0
  fi

  echo "[chase-cron] Failed (HTTP ${HTTP_CODE}). Retrying in ${RETRY_DELAY}s..."
  sleep $RETRY_DELAY
  RETRY_DELAY=$((RETRY_DELAY * 2))
  attempt=$((attempt + 1))
done

echo "[chase-cron] ERROR: All ${MAX_RETRIES} attempts failed"
exit 1
