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
# --user root จำเป็นด้วยสองเหตุผล:
#   1. image รันด้วย user nestjs ซึ่งเป็น system user ที่ HOME = /nonexistent
#      npx เขียน cache ไม่ได้ ล้มด้วย EACCES mkdir /nonexistent
#   2. backend/prisma/migrations ถูก COPY มาพร้อมสิทธิ์ 700 ของเครื่อง dev
#      user nestjs จึงอ่านไม่ได้
# container นี้รันครั้งเดียวแล้วจบ แตะแค่ DB — ตัวแอปจริงยังรันด้วย nestjs เหมือนเดิม
#
# ใช้ prisma ที่ฝังมาใน image ถ้ามี (เร็วกว่าและไม่ต้องต่อเน็ต) ไม่มีค่อย fallback
# ไป npx โดย pin เวอร์ชันไว้ — npx prisma เฉย ๆ จะดึง major ล่าสุด (8.x)
# ซึ่งใช้กับ schema v5 ไม่ได้
# เรียก prisma ใน container — ใช้ตัวที่ฝังใน image ถ้ามี ไม่มีค่อย fallback ไป npx
prisma_in_container() {
  $COMPOSE run --rm --no-deps -T --user root backend \
    sh -c "cd /app/backend && if command -v prisma >/dev/null 2>&1; then prisma $*; else npx --yes prisma@5.22.0 $*; fi"
}

# ตรวจสถานะก่อนลงมือ — ถ้ามี migration ที่ค้างสถานะ failed อยู่ migrate deploy
# จะไม่ยอมทำอะไรเลยและพิมพ์ error ที่อ่านยาก จับไว้ก่อนแล้วบอกวิธีแก้ให้ชัด
log "ตรวจสถานะ migration"
status_out="$(prisma_in_container migrate status 2>&1 || true)"
echo "$status_out"

if echo "$status_out" | grep -qiE "failed|P3009"; then
  cat >&2 <<'HELP'

──────────────────────────────────────────────────────────────────────────────
หยุด — มี migration ที่ค้างสถานะ failed อยู่ใน _prisma_migrations

migrate deploy จะไม่ยอมทำอะไรจนกว่าจะเคลียร์สถานะนี้ ดูชื่อ migration จากผล
ด้านบนแล้วทำตามนี้ (แทน <NAME>)

  COMPOSE="docker compose -f docker-compose.production.yml"

  # ถ้า SQL ไม่ได้ถูก apply จริง (ปกติเป็นแบบนี้ เพราะ postgres rollback ทั้ง transaction)
  $COMPOSE run --rm --no-deps -T --user root backend     sh -c "cd /app/backend && npx --yes prisma@5.22.0 migrate resolve --rolled-back <NAME>"

  # ถ้าโครงสร้างใน DB ตรงกับที่ migration ต้องการอยู่แล้ว (เช่น DB สร้างด้วย db push มาก่อน)
  # ให้บอกว่าถือว่า apply แล้ว จะได้ไม่รัน SQL ซ้ำ
  $COMPOSE run --rm --no-deps -T --user root backend     sh -c "cd /app/backend && npx --yes prisma@5.22.0 migrate resolve --applied <NAME>"

แล้วรัน deploy.sh ใหม่
──────────────────────────────────────────────────────────────────────────────
HELP
  exit 1
fi

log "รัน prisma migrate deploy"
if ! prisma_in_container migrate deploy; then
  cat >&2 <<'HELP'

──────────────────────────────────────────────────────────────────────────────
migrate deploy ล้มเหลว — ยังไม่ได้สตาร์ท service ใหม่ ของเดิมยังรันอยู่

ถ้า error บอกว่า "already exists" แปลว่า DB มีโครงสร้างนั้นอยู่แล้ว ซึ่งเกิดกับ
DB ที่เคยสร้างด้วย `prisma db push` — ไม่ใช่ข้อมูลเสียหาย postgres rollback
ทั้ง transaction ไปแล้ว แก้โดยบอก prisma ว่าถือว่า migration นั้น apply แล้ว

  COMPOSE="docker compose -f docker-compose.production.yml"
  $COMPOSE run --rm --no-deps -T --user root backend     sh -c "cd /app/backend && npx --yes prisma@5.22.0 migrate resolve --rolled-back <NAME>"
  $COMPOSE run --rm --no-deps -T --user root backend     sh -c "cd /app/backend && npx --yes prisma@5.22.0 migrate resolve --applied <NAME>"

ตรวจด้วย migrate status ให้ขึ้น "Database schema is up to date!" ก่อน
แล้วรัน deploy.sh ใหม่  ถ้า error เป็นอย่างอื่นให้กู้จาก dump ใน backups/
──────────────────────────────────────────────────────────────────────────────
HELP
  exit 1
fi

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
