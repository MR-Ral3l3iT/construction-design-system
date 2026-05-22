#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# restore.sh  — Restore PostgreSQL + (optionally) MinIO from a backup
#
# Usage:
#   ./scripts/restore.sh --db backups/postgres_20260101_120000.sql.gz
#   ./scripts/restore.sh --db backups/postgres_*.sql.gz --minio backups/minio_*.tar.gz
#   ENV_FILE=/path/to/.env.production ./scripts/restore.sh --db ...
#
# WARNING: This OVERWRITES the target database. Use with caution in production.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENV_FILE="${ENV_FILE:-$(dirname "$0")/../.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -o allexport; source "$ENV_FILE"; set +o allexport
fi

DB_FILE=""
MINIO_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --db)    DB_FILE="$2";    shift 2 ;;
    --minio) MINIO_FILE="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$DB_FILE" ]]; then
  echo "Usage: $0 --db <postgres_backup.sql.gz> [--minio <minio_backup.tar.gz>]"
  exit 1
fi

PG_HOST="${POSTGRES_HOST:-localhost}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_USER="${POSTGRES_USER:-postgres}"
PG_DB="${POSTGRES_DB:-construction_db}"
export PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"

# ─── PostgreSQL restore ───────────────────────────────────────────────────────
echo "[restore] Restoring PostgreSQL from: $DB_FILE"

# Drop connections & recreate DB
psql --host="$PG_HOST" --port="$PG_PORT" --username="$PG_USER" --no-password postgres <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${PG_DB}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "${PG_DB}";
CREATE DATABASE "${PG_DB}";
SQL

zcat "$DB_FILE" | pg_restore \
  --host="$PG_HOST" \
  --port="$PG_PORT" \
  --username="$PG_USER" \
  --no-password \
  --dbname="$PG_DB" \
  --no-owner \
  --no-privileges

echo "[restore] PostgreSQL restore complete"

# ─── MinIO restore (optional) ─────────────────────────────────────────────────
if [[ -n "$MINIO_FILE" ]]; then
  if ! command -v mc &>/dev/null; then
    echo "[restore] ERROR: 'mc' not found — cannot restore MinIO"
    exit 1
  fi

  MINIO_ALIAS="cds-restore"
  MINIO_SCHEME="http"
  [[ "${MINIO_USE_SSL:-false}" == "true" ]] && MINIO_SCHEME="https"
  MINIO_URL="${MINIO_SCHEME}://${MINIO_ENDPOINT:-localhost}:${MINIO_PORT:-9000}"
  MINIO_BUCKET="${MINIO_BUCKET:-construction-files}"

  echo "[restore] Restoring MinIO from: $MINIO_FILE"
  mc alias set "$MINIO_ALIAS" "$MINIO_URL" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" --quiet

  # Recreate bucket
  mc mb --ignore-existing "${MINIO_ALIAS}/${MINIO_BUCKET}" --quiet

  MINIO_TMP=$(mktemp -d)
  tar -xzf "$MINIO_FILE" -C "$MINIO_TMP"
  mc cp --recursive "$MINIO_TMP/" "${MINIO_ALIAS}/${MINIO_BUCKET}/" --quiet
  rm -rf "$MINIO_TMP"
  mc alias rm "$MINIO_ALIAS" --quiet

  echo "[restore] MinIO restore complete"
fi

echo "[restore] All done."
