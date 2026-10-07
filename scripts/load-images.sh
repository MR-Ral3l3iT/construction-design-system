#!/usr/bin/env bash
#
# รันบน server — โหลด image ที่ upload มาไว้ใน images/ เข้า docker
# แล้วอัปเดต IMAGE_TAG ใน .env ให้ชี้ไปที่เวอร์ชันใหม่
#
#   cd /opt/cds && ./scripts/load-images.sh
#   ./scripts/load-images.sh --no-env      # โหลดอย่างเดียว ไม่แตะ .env
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

IMAGES_DIR="$ROOT/images"
ENV_FILE="$ROOT/.env"
UPDATE_ENV=1
[ "${1:-}" = "--no-env" ] && UPDATE_ENV=0

[ -d "$IMAGES_DIR" ] || { echo "ERROR: ไม่พบโฟลเดอร์ images/ — upload ไฟล์มาก่อน" >&2; exit 1; }
[ -f "$IMAGES_DIR/manifest.txt" ] || { echo "ERROR: ไม่พบ images/manifest.txt" >&2; exit 1; }

# shellcheck disable=SC1091
IMAGE_TAG="$(grep '^IMAGE_TAG=' "$IMAGES_DIR/manifest.txt" | cut -d= -f2)"
PLATFORM="$(grep '^PLATFORM=' "$IMAGES_DIR/manifest.txt" | cut -d= -f2)"
BUILT_AT="$(grep '^BUILT_AT=' "$IMAGES_DIR/manifest.txt" | cut -d= -f2-)"
GIT_COMMIT="$(grep '^GIT_COMMIT=' "$IMAGES_DIR/manifest.txt" | cut -d= -f2)"

echo "─────────────────────────────────────────────"
echo " tag     : $IMAGE_TAG"
echo " platform: $PLATFORM"
echo " build   : $BUILT_AT"
echo " commit  : $GIT_COMMIT"
echo "─────────────────────────────────────────────"

# กันเคสที่เจ็บที่สุด: build บน Mac (arm64) แล้วเอาขึ้น server (amd64)
# image จะ load เข้าได้ตามปกติแต่พอ run จะ "exec format error" ซึ่งอ่านแล้วงง
SERVER_ARCH="$(docker info --format '{{.Architecture}}')"
case "$SERVER_ARCH" in
  x86_64|amd64) SERVER_PLATFORM="linux/amd64" ;;
  aarch64|arm64) SERVER_PLATFORM="linux/arm64" ;;
  *) SERVER_PLATFORM="linux/$SERVER_ARCH" ;;
esac

if [ "$PLATFORM" != "$SERVER_PLATFORM" ]; then
  echo >&2
  echo "ERROR: image ถูก build มาเป็น $PLATFORM แต่ server นี้เป็น $SERVER_PLATFORM" >&2
  echo "       โหลดเข้าได้แต่รันไม่ได้ (exec format error)" >&2
  echo "       แก้โดย build ใหม่บนเครื่อง dev ด้วย:" >&2
  echo "         PLATFORM=$SERVER_PLATFORM ./scripts/build-images.sh" >&2
  exit 1
fi
echo " arch ตรงกับ server ✓"
echo

for name in backend frontend; do
  file="$IMAGES_DIR/${name}-${IMAGE_TAG}.tar.gz"
  [ -f "$file" ] || { echo "ERROR: ไม่พบ $file" >&2; exit 1; }
  echo "==> load $(basename "$file") ($(du -h "$file" | cut -f1))"
  gunzip -c "$file" | docker load
done
echo

if [ "$UPDATE_ENV" = "1" ]; then
  [ -f "$ENV_FILE" ] || { echo "ERROR: ไม่พบ .env" >&2; exit 1; }
  if grep -q '^IMAGE_TAG=' "$ENV_FILE"; then
    # เก็บสำรองไว้เผื่อต้อง rollback ด้วยมือ
    cp "$ENV_FILE" "$ENV_FILE.bak"
    sed -i.tmp "s|^IMAGE_TAG=.*|IMAGE_TAG=$IMAGE_TAG|" "$ENV_FILE" && rm -f "$ENV_FILE.tmp"
  else
    printf '\nIMAGE_TAG=%s\n' "$IMAGE_TAG" >> "$ENV_FILE"
  fi
  echo "ตั้ง IMAGE_TAG=$IMAGE_TAG ใน .env แล้ว (สำรองไว้ที่ .env.bak)"
fi

echo
echo "─────────────────────────────────────────────"
echo " image ที่พร้อมใช้บนเครื่องนี้"
docker images --filter 'reference=cds-*' --format '   {{.Repository}}:{{.Tag}}  {{.Size}}' | head -10
echo
echo " ขั้นต่อไป:"
echo "   ./scripts/deploy.sh --skip-load"
echo
echo " deploy.sh จะสำรอง DB, ตรวจสถานะ migration, migrate, สตาร์ท service"
echo " และรอจน backend healthy ให้ครบ — อย่ารัน migrate deploy เองเพราะถ้าชน"
echo " จะทิ้งสถานะ failed ไว้ใน _prisma_migrations แล้วต้องมากู้ทีหลัง"
echo "─────────────────────────────────────────────"
