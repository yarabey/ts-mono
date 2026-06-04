#!/usr/bin/env bash
# Offsite push of baby-bot DB backups to a remote host (e.g. the Finnish server).
#
# Runs on the PROD host via cron, AFTER the pg-backup sidecar has written the
# day's dump. rsync copies the local backup tree to the remote over SSH. This is
# an APPEND-ONLY mirror (no --delete on purpose): if the prod backups are ever
# wiped — by accident or by an attacker — the next sync must NOT propagate that
# deletion to the offsite copy. Prune the remote on its own schedule instead
# (see the optional remote-retention note in infra/README.md).
#
# One-time setup on the prod server:
#   1. Dedicated key:  ssh-keygen -t ed25519 -f ~/.ssh/babybot_offsite -N ""
#   2. Install ~/.ssh/babybot_offsite.pub in the remote's authorized_keys
#      (ideally a dedicated low-privilege user; lock the key to rsync if you can).
#   3. Set REMOTE_* below or export them in the cron environment.
#   4. Crontab (a bit after the @daily sidecar dump at 00:00):
#        30 1 * * *  /opt/baby-bot/backup-offsite.sh >> /var/log/babybot-offsite.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/baby-bot/backups}"
REMOTE_USER="${REMOTE_USER:?set REMOTE_USER (e.g. backup)}"
REMOTE_HOST="${REMOTE_HOST:?set REMOTE_HOST (the Finnish server)}"
REMOTE_PORT="${REMOTE_PORT:-22}"
REMOTE_DIR="${REMOTE_DIR:?set REMOTE_DIR (e.g. /home/backup/baby-bot)}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/babybot_offsite}"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "$(date -Is) ERROR: backup dir $BACKUP_DIR not found" >&2
  exit 1
fi

rsync -az \
  -e "ssh -i ${SSH_KEY} -p ${REMOTE_PORT} -o StrictHostKeyChecking=accept-new" \
  "${BACKUP_DIR}/" \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"

echo "$(date -Is) offsite sync OK -> ${REMOTE_HOST}:${REMOTE_DIR}"
