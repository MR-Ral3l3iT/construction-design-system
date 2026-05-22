#!/bin/bash
# backup.sh — PostgreSQL daily backup
#
# ใช้งาน:  ./scripts/backup.sh
# cron ทุกวัน ตี 2:
#   0 2 * * * cd /opt/cds && ./scripts/backup.sh >> /var/log/cds-backup.log 2>&1
#
# restore:
#   docker compose exec postgres pg_restore -U postgres -d construction_db -Fc /backups/<file>.dump

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$(dirname "$SCRIPT_DIR")"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup..."
mkdir -p ./backups
docker compose --profile backup run --rm backup
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done. Latest backups:"
ls -lh ./backups/*.dump 2>/dev/null | tail -5
