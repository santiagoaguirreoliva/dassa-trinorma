#!/bin/bash
# Sentinel Triny — corre cada 30 min vía crontab del usuario `dassa`.
# Si /api/health reporta status=degraded o no responde, manda mail a santi.
# Pensado como red de seguridad: sobrevive a un crash total del proceso dassa-sgi.

set -u
LOCK_DIR="/tmp/triny-sentinel"
STATE_FILE="$LOCK_DIR/last_alert_ts"
LOG_FILE="/home/dassa/dassa4/apps/sgi/logs/triny-sentinel.log"
HEALTH_URL="http://localhost:4001/api/health"
MIN_ALERT_INTERVAL_SECONDS=$((6 * 3600))   # no spamear: mínimo 6h entre alertas

mkdir -p "$LOCK_DIR" "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

send_alert() {
  local subject="$1"
  local body="$2"
  local now=$(date +%s)
  local last_alert=0
  [ -f "$STATE_FILE" ] && last_alert=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
  local delta=$((now - last_alert))
  if [ "$delta" -lt "$MIN_ALERT_INTERVAL_SECONDS" ]; then
    log "skipping alert (cooldown ${delta}s < ${MIN_ALERT_INTERVAL_SECONDS}s) — would have sent: $subject"
    return 0
  fi
  log "sending alert: $subject"
  echo "$body" | /usr/local/bin/gog gmail send \
    -a santiago@dassa.com.ar \
    --to santiago@dassa.com.ar \
    --subject "$subject" \
    --body-stdin >> "$LOG_FILE" 2>&1
  if [ $? -eq 0 ]; then
    echo "$now" > "$STATE_FILE"
  else
    log "ERR enviando mail via gog"
  fi
}

response=$(curl -sf --max-time 10 "$HEALTH_URL" 2>/dev/null)
curl_rc=$?

if [ "$curl_rc" -ne 0 ]; then
  send_alert "[Triny ALERT] /api/health no responde (curl rc=$curl_rc)" \
    "El endpoint $HEALTH_URL no responde. Verificar PM2: pm2 logs dassa-sgi --lines 50"
  log "health endpoint DOWN (rc=$curl_rc)"
  exit 1
fi

status=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null)
triny_status=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('triny',{}).get('status','unknown'))" 2>/dev/null)

log "ok=$status · triny=$triny_status"

if [ "$status" = "degraded" ] || [ "$triny_status" = "stale" ] || [ "$triny_status" = "errored" ]; then
  stale_jobs=$(echo "$response" | python3 -c "
import sys, json
d = json.load(sys.stdin)
checks = d.get('triny', {}).get('checks', [])
stale = [c for c in checks if c.get('status') != 'ok']
for c in stale:
    print(f\"- {c['job']}: status={c['status']} · last={c.get('last_run_at')} · hours={c.get('hours_since')}\")
" 2>/dev/null)
  send_alert "[Triny ALERT] Jobs atrasados en dassa-sgi" \
"Status global: $status
Status Triny: $triny_status

Jobs con problema:
$stale_jobs

Acción: ssh al VPS y ejecutar:
  pm2 restart dassa-sgi
  cd /home/dassa/dassa4/apps/sgi
  node scripts/triny-run-job.cjs <job_key>   # disparar manualmente si hace falta

Health URL: $HEALTH_URL
Log sentinel: $LOG_FILE"
fi
