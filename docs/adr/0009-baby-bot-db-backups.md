# ADR 0009: baby-bot daily database backups

## Status: Accepted

## Context

`baby-bot` runs Postgres on a single self-hosted server (ADR 0008), with data in
the `pgdata` named volume. There is no backup: losing the server — or a bad
migration, a `DROP`, disk failure — loses every recorded event permanently.
This is family health data, so the bar is "never lose it", not "best effort".

Requirements: daily full backups, free, with an **offsite** copy (a backup on the
same machine as the DB does not survive that machine being lost). The owner runs
a separate Finnish server (used as the Telegram SOCKS5 proxy) that can serve as
the offsite target at no cost.

`pg_dump` is the right tool (logical, version-portable, tiny for this dataset).
The remaining choice is *what schedules and rotates it*. A bare host-cron
`pg_dump` works but lives outside the compose stack the rest of the product is
described by; a sidecar keeps backups declarative and deployed by the same
tag-driven pipeline. AGENTS.md requires an approved ADR before adding any image
not on the allowlist.

## Decision

Approve one off-allowlist image for `baby-bot` infra only:

| Dependency | Why | Containment |
| --- | --- | --- |
| `prodrigestivill/postgres-backup-local:17` | Battle-tested wrapper around `pg_dump` that schedules dumps and rotates them daily/weekly/monthly — exactly the brief, with no app code. The `:17` tag matches the Postgres 17 server so the dump client is never older than the server. | **Infra only**, not an app dependency: it appears solely as a service in `infra/baby-bot/docker-compose.yml`, never imported by any app/lib and never in a built image. Connects to the `postgres` service on the internal network with the existing DB creds; writes gzipped SQL to a host bind-mount (`/opt/baby-bot/backups`). Inert beyond producing dump files. |

Backups are dumped with `--clean --if-exists` so each file is self-restoring.

**Offsite copy** is a host-level `rsync`-over-SSH cron job (`backup-offsite.sh`),
not a container: it pushes the local backup tree to the Finnish server. It is
deliberately **append-only** (no `rsync --delete`) so a wipe of the prod backups
cannot propagate to the offsite copy; the remote prunes on its own schedule.
Keeping it as host cron avoids mounting an SSH private key into a container.

`restore.sh` accompanies the dumps so backups are verifiable; an untested backup
is not a backup.

## Consequences

- Daily dumps land in `/opt/baby-bot/backups/{daily,weekly,monthly}` with
  configurable retention (`BACKUP_*` env, defaulting to 7d/4w/6m). For this
  dataset that is a few MB at most.
- The offsite cron and its dedicated SSH key are **manual one-time server
  setup** (documented in `infra/README.md`); the key is never committed. The
  deploy workflow ships `backup-offsite.sh` and `restore.sh` to the server
  alongside the compose file, so the scripts stay in sync with the repo.
- CI (`GitHub Actions spending limit: $0`) is unaffected: the sidecar only runs
  on the server, and nothing backup-related is exercised in lint/test/build.
- GitHub was rejected as a backup target: tight free storage limits (LFS 1 GB),
  unbounded git history growth from binary dumps, and — decisively — keeping
  family health data in a git history is a persistent-leak risk. The owner's own
  Finnish server is free, unlimited for this size, and keeps the data off GitHub.
- Revisit if the dataset grows enough to warrant deduplicated/encrypted offsite
  storage (e.g. `restic` → Backblaze B2 / Cloudflare R2 free tier) as a third copy.
