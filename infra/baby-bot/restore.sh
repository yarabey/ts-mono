#!/usr/bin/env bash
# Restore a baby-bot DB dump produced by the pg-backup sidecar (gzipped SQL,
# dumped with --clean --if-exists so it drops & recreates objects on load).
#
# Run from the deploy dir on the server (where docker-compose.yml + .env live):
#   ./restore.sh /opt/baby-bot/backups/daily/baby_bot-YYYYMMDD-HHMMSS.sql.gz
#
# It stops the backend (so nothing writes mid-restore), loads the dump into the
# running postgres container, then restarts the backend. The backend re-runs
# `prisma migrate deploy` on boot, which is a no-op against an up-to-date dump.
#
# TIP: test your backups. Periodically run this against a throwaway DB and
# confirm the app comes up — an untested backup is not a backup.
set -euo pipefail

DUMP="${1:?usage: restore.sh <path-to-.sql.gz>}"
[ -f "$DUMP" ] || { echo "ERROR: dump not found: $DUMP" >&2; exit 1; }

cd "$(dirname "$0")"
# Pull POSTGRES_USER / POSTGRES_DB from the deploy .env.
set -a; . ./.env; set +a
: "${POSTGRES_USER:?missing in .env}" "${POSTGRES_DB:?missing in .env}"

read -r -p "Restore $DUMP into DB '$POSTGRES_DB'? This overwrites current data. [y/N] " ok
[ "$ok" = "y" ] || { echo "aborted"; exit 1; }

docker compose stop backend
gunzip -c "$DUMP" | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"
docker compose start backend

echo "restore complete from $DUMP"
