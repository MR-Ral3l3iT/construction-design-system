#!/usr/bin/env bash
#
# deploy.sh — รันบน server หลัง upload images/ ขึ้นมาแล้ว
#
#   cd /opt/cds && ./scripts/deploy.sh
#   ./scripts/deploy.sh --skip-load     # image โหลดไว้แล้ว แค่ restart
#   ./scripts/deploy.sh --skip-backup   # ข้ามการสำรอง DB (ไม่แนะนำ)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE="docker compose -f docker-compose.production.yml"
SKIP_LOAD=0
SKIP_BACKUP=0
for arg in "$@"; do
  case "$arg" in
    --skip-load)   SKIP_LOAD=1 ;;
    --skip-backup) SKIP_BACKUP=1 ;;
    *) echo "ไม่รู้จัก option: $arg" >&2; exit 1 ;;
  esac
done

log() { echo "[$(date '+%H:%M:%S')] $*"; }

[ -f .env ] || { echo "ERROR: ไม่พบ .env" >&2; exit 1; }

# ─── 1. โหลด image ที่ upload มา ─────────────────────────────────────────────
if [ "$SKIP_LOAD" = "0" ]; then
  log "โหลด image จาก images/"
  ./scripts/load-images.sh
fi

# ─── 2. infra ต้องขึ้นก่อนจึงจะ backup และ migrate ได้ ───────────────────────
log "สตาร์ท postgres และ minio"
$COMPOSE up -d postgres minio

# ─── 3. สำรองฐานข้อมูลก่อนแตะ schema ─────────────────────────────────────────
if [ "$SKIP_BACKUP" = "0" ]; then
  log "สำรองฐานข้อมูล"
  mkdir -p ./backups
  $COMPOSE --profile backup run --rm backup
fi

# ─── 4. migration ────────────────────────────────────────────────────────────
# pin เวอร์ชัน prisma ให้ตรงกับ schema — npx prisma เฉย ๆ จะดึง major ล่าสุด
# (ตอนนี้ 8.x) ซึ่งใช้กับ schema v5 ไม่ได้
log "รัน prisma migrate deploy"
$COMPOSE run --rm --no-deps -T backend \
  sh -c "cd /app/backend && npx --yes prisma@5.22.0 migrate deploy"

# ─── 5. สตาร์ททั้งหมด ────────────────────────────────────────────────────────
log "สตาร์ท service ทั้งหมด"
$COMPOSE up -d --remove-orphans

# ─── 6. รอให้ backend healthy จริงก่อนบอกว่าสำเร็จ ───────────────────────────
log "รอ backend healthy"
for i in $(seq 1 30); do
  status="$(docker inspect -f '{{.State.Health.Status}}' cds-backend 2>/dev/null || echo starting)"
  [ "$status" = "healthy" ] && { log "backend healthy"; break; }
  if [ "$i" = "30" ]; then
    log "ERROR: backend ไม่ healthy ภายใน 5 นาที — log 50 บรรทัดล่าสุด:"
    $COMPOSE logs --tail=50 backend
    exit 1
  fi
  sleep 10
done

# ─── 7. เก็บกวาด ─────────────────────────────────────────────────────────────
log "ลบ image ที่ไม่มีใครใช้"
docker image prune -f >/dev/null

echo
log "Deploy สำเร็จ"
$COMPOSE ps --format 'table {{.Name}}\t{{.Status}}'
