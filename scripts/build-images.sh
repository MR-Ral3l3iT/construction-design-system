#!/usr/bin/env bash
#
# build image สำหรับ server แล้วบันทึกเป็นไฟล์ไว้ใน images/
# เอาไฟล์ที่ได้ไป upload ขึ้น server แล้วรัน scripts/load-images.sh ที่นั่น
#
#   ./scripts/build-images.sh
#   PLATFORM=linux/arm64 ./scripts/build-images.sh      # ถ้า server เป็น ARM
#   IMAGE_TAG=v1.2.3 ./scripts/build-images.sh          # ตั้ง tag เอง
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ─── ตรวจสิ่งที่ต้องมีก่อน ────────────────────────────────────────────────────

# สำคัญที่สุด: เครื่อง dev เป็น Apple Silicon (arm64) แต่ server ส่วนใหญ่เป็น amd64
# ถ้า build ผิด platform image จะ load ขึ้น server ได้แต่รันไม่ได้ ("exec format error")
PLATFORM="${PLATFORM:-linux/amd64}"

IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)}"
OUT_DIR="$ROOT/images"

if [ -z "${NEXT_PUBLIC_API_URL:-}" ]; then
  # ค่านี้ถูกฝังเข้า bundle ตอน build ไม่ใช่ตอน run — ใส่ผิดแล้ว frontend
  # จะยิง API ไปผิดที่และต้อง build ใหม่ทั้งรอบ
  echo "ERROR: ต้องตั้ง NEXT_PUBLIC_API_URL ให้เป็น URL ของ production" >&2
  echo "       เช่น  NEXT_PUBLIC_API_URL=https://your-domain.com/api $0" >&2
  exit 1
fi

command -v docker >/dev/null || { echo "ERROR: ไม่พบ docker" >&2; exit 1; }
docker buildx version >/dev/null 2>&1 || { echo "ERROR: ไม่พบ docker buildx" >&2; exit 1; }

mkdir -p "$OUT_DIR"

echo "─────────────────────────────────────────────"
echo " platform : $PLATFORM"
echo " tag      : $IMAGE_TAG"
echo " API URL  : $NEXT_PUBLIC_API_URL"
echo " ปลายทาง  : $OUT_DIR"
echo "─────────────────────────────────────────────"
echo

build_and_save() {
  local name="$1" dockerfile="$2"; shift 2
  local image="cds-${name}:${IMAGE_TAG}"
  local out="$OUT_DIR/${name}-${IMAGE_TAG}.tar.gz"

  echo "==> build $image ($PLATFORM)"
  docker buildx build \
    --platform "$PLATFORM" \
    --file "$dockerfile" \
    --tag "$image" \
    --load \
    "$@" \
    .

  # ยืนยัน arch ของ image ที่ได้จริง ไม่ใช่เชื่อว่า --platform ทำงาน
  local got
  got="$(docker image inspect "$image" --format '{{.Os}}/{{.Architecture}}')"
  if [ "$got" != "$PLATFORM" ]; then
    echo "ERROR: ได้ $got แต่ต้องการ $PLATFORM — หยุดก่อนจะ save ของผิดขึ้น server" >&2
    exit 1
  fi
  echo "    arch ยืนยันแล้ว: $got"

  echo "==> save → $(basename "$out")"
  docker save "$image" | gzip -1 > "$out"
  echo "    $(du -h "$out" | cut -f1)"
  echo
}

build_and_save backend  backend/Dockerfile
build_and_save frontend frontend/Dockerfile \
  --build-arg "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"

# manifest ให้ฝั่ง server รู้ว่าต้อง load อะไรและ IMAGE_TAG ควรเป็นอะไร
cat > "$OUT_DIR/manifest.txt" <<MANIFEST
IMAGE_TAG=$IMAGE_TAG
PLATFORM=$PLATFORM
NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
BUILT_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo unknown)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)
FILES=backend-${IMAGE_TAG}.tar.gz frontend-${IMAGE_TAG}.tar.gz
MANIFEST

echo "─────────────────────────────────────────────"
echo " เสร็จแล้ว — ไฟล์ใน images/"
ls -lh "$OUT_DIR" | tail -n +2 | awk '{printf "   %-40s %s\n", $9, $5}'
echo
echo " ขั้นต่อไป: upload ขึ้น server"
echo "   rsync -avz --progress images/ user@server:/opt/cds/images/"
echo "   ssh user@server 'cd /opt/cds && ./scripts/load-images.sh'"
echo "─────────────────────────────────────────────"
