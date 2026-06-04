# Deployment (infra)

Tag-driven CI/CD for ts-mono products. Pushing a version tag builds Docker
images, pushes them to **GHCR**, and redeploys a `docker compose` stack on a
single self-hosted server over SSH. The pipeline is **reusable**:
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) is
product-agnostic; each product adds a small caller workflow + an `infra/<product>/`
dir.

Currently wired: **baby-bot** (`infra/baby-bot/`,
[`deploy-baby-bot.yml`](../.github/workflows/deploy-baby-bot.yml)).

## Topology

```
                          ┌─────────────────── server ───────────────────┐
  git tag baby-bot-v*     │  caddy (web)  :80  ── ACME HTTP-01            │
        │                 │               :8443 ── HTTPS app             │
        ▼                 │                 ├── /api/*, /webhook → backend│
  GitHub Actions          │                 └── /mini-app/*   → SPA (/srv)│
   ├ build images         │  backend (NestJS/Fastify) :3100 (internal)   │
   ├ push → GHCR  ────────┼─▶ pulled by compose                          │
   └ ssh deploy  ─────────┼─▶ docker compose pull && up -d               │
                          │  postgres :5432 (internal) + named volumes   │
                          └───────────────────────────────────────────────┘
```

- The Telegram bot uses **polling** (outbound only) — no inbound webhook needed.
- The only inbound traffic is HTTPS on **:8443** (app) and **:80** (Let's Encrypt
  HTTP-01 challenge only; the CA fixes challenge ports, so :80 must stay open).
- URL shape: `https://<domain>:8443/api/...`, `https://<domain>:8443/webhook`,
  `https://<domain>:8443/mini-app/`.

## One-time server bootstrap (Ubuntu 22.04 / 24.04)

```bash
# 1. Install Docker Engine + compose plugin (official apt repo)
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 2. Deploy user in the docker group (the CI SSH user)
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo mkdir -p /opt/baby-bot && sudo chown deploy:deploy /opt/baby-bot

# 3. Authorize the CI SSH public key
sudo -u deploy mkdir -p /home/deploy/.ssh && sudo -u deploy chmod 700 /home/deploy/.ssh
echo "<PASTE CI PUBLIC KEY>" | sudo -u deploy tee -a /home/deploy/.ssh/authorized_keys
sudo -u deploy chmod 600 /home/deploy/.ssh/authorized_keys

# 4. Firewall: open SSH + the app + ACME
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp      # Let's Encrypt HTTP-01 challenge
sudo ufw allow 8443/tcp    # app (HTTPS)
sudo ufw enable

# 5. Give Docker *containers* working DNS. The host's systemd-resolved stub
#    (127.0.0.53) is NOT reachable from inside containers, so without this
#    Caddy can't reach Let's Encrypt and the backend can't reach Telegram/ZAI.
printf '{ "dns": ["8.8.8.8", "1.1.1.1"] }\n' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

> **Gotchas that will bite on a fresh box** (each cost a failed deploy for us):
> - **`docker` group only applies to new logins.** After `usermod -aG docker`, the
>   user's *next* SSH session has it (CI is fine); your current interactive shell
>   won't — use `sudo docker …` or re-login. Symptom: `permission denied … docker.sock`.
> - **Compose v2 plugin must be present** (`docker compose version`). Ubuntu's
>   `docker.io` package omits it — install `docker-compose-plugin` (Docker repo) or
>   `docker-compose-v2` (Ubuntu). Symptom: `docker: unknown command: docker compose`.
> - **`/opt/<product>` must be owned by the deploy user** (the `chown` in step 2),
>   or `scp` of the compose file fails. Symptom: scp `Process exited with status 1`.
> - **Port 80 must be free** (no host nginx/apache) and **open inbound at the cloud
>   firewall / security group**, not just `ufw` — Let's Encrypt validates HTTP-01 on
>   :80 from the internet. Same for :8443. Symptoms: `bind 0.0.0.0:80: address
>   already in use`; or ACME `connection refused`/`timeout`.
> - **SSH key**: the *private* key (no passphrase) goes in `DEPLOY_SSH_KEY` with all
>   newlines intact; its *public* half in the deploy user's `authorized_keys`
>   (`~/.ssh` 700, `authorized_keys` 600). Symptom: `ssh: unable to authenticate`.

Generate the CI keypair locally and keep the **private** key for the GitHub
secret, install the **public** key in step 3:

```bash
ssh-keygen -t ed25519 -C "ci-deploy@ts-mono" -f ./deploy_key -N ""
# deploy_key      -> DEPLOY_SSH_KEY  (private, GitHub secret)
# deploy_key.pub  -> authorized_keys (server, step 3)
```

**DNS:** point an `A` record for your domain at the server's public IP before the
first deploy (Caddy needs it to reachable on :80 to issue the certificate).

## GitHub Actions secrets (repo → Settings → Secrets and variables → Actions)

CI uses the built-in `GITHUB_TOKEN` for GHCR push and the server-side
`docker login` — **no PAT needed**.

| Secret | Required | Contents |
| --- | --- | --- |
| `DEPLOY_SSH_HOST` | yes | Server IP or hostname |
| `DEPLOY_SSH_USER` | yes | SSH user in the `docker` group (e.g. `deploy`) |
| `DEPLOY_SSH_KEY`  | yes | Private SSH key (multi-line OpenSSH PEM) |
| `DEPLOY_SSH_PORT` | no  | Only if SSH ≠ 22 |
| `BABY_BOT_ENV`    | yes | The full production `.env` — see [`baby-bot/.env.example`](baby-bot/.env.example). **Do not** include `REGISTRY`/`IMAGE_TAG`; CI appends them. |

## Deploy

```bash
git tag baby-bot-v1.0.0
git push origin baby-bot-v1.0.0
```

The workflow derives the image tag from the git tag (`baby-bot-v1.0.0` → `1.0.0`),
builds + pushes `baby-bot-backend` and `baby-bot-web` to GHCR, copies
`infra/baby-bot/docker-compose.yml` to `/opt/baby-bot`, writes `.env`
(`BABY_BOT_ENV` + `REGISTRY`/`IMAGE_TAG`), then `docker compose pull && up -d`.
The backend container runs `prisma migrate deploy` + the idempotent seed on boot.

Verify on the server:

```bash
cd /opt/baby-bot && docker compose ps          # all healthy
curl -kI https://<domain>:8443/mini-app/        # 200, valid LE cert
docker compose logs backend | tail              # "baby-bot backend listening on :3100"
```

## Backups (baby-bot)

Daily logical backups run as the `pg-backup` sidecar in the compose stack
([ADR 0009](../docs/adr/0009-baby-bot-db-backups.md); off-allowlist image
`prodrigestivill/postgres-backup-local`). It dumps `baby_bot`, gzips, and
rotates daily/weekly/monthly under `/opt/baby-bot/backups`. Retention/schedule
are tuned via the optional `BACKUP_*`/`SCHEDULE`/`TZ` env (see
[`baby-bot/.env.example`](baby-bot/.env.example)); all have sane defaults.

```bash
cd /opt/baby-bot
docker compose ps pg-backup                 # healthy
ls -R backups                               # daily/ weekly/ monthly/ *.sql.gz
docker compose logs pg-backup | tail        # last run
```

### Offsite copy to a remote host

A backup on the same box as the DB doesn't survive losing that box, so push the
dumps offsite to any remote host you control. `backup-offsite.sh` (shipped to
`/opt/baby-bot` by the deploy workflow) rsyncs the backup tree to the remote
over SSH. It is **append-only** (no `--delete`) so a wipe of the prod backups
can't propagate offsite. One-time setup on the **prod** server:

```bash
# 1. Dedicated key for the offsite push
ssh-keygen -t ed25519 -f ~/.ssh/babybot_offsite -N ""
# 2. Install ~/.ssh/babybot_offsite.pub in the remote host's authorized_keys
#    (use a dedicated low-priv user; lock the key to rsync if you can).
# 3. Make the script executable and try it once
chmod +x /opt/baby-bot/backup-offsite.sh
REMOTE_USER=backup REMOTE_HOST=<remote-host> REMOTE_DIR=/home/backup/baby-bot \
  /opt/baby-bot/backup-offsite.sh
# 4. Cron it ~an hour after the @daily sidecar dump (which runs at 00:00):
crontab -e
#   30 1 * * *  REMOTE_USER=backup REMOTE_HOST=<remote-host> REMOTE_DIR=/home/backup/baby-bot \
#     /opt/baby-bot/backup-offsite.sh >> /var/log/babybot-offsite.log 2>&1
```

Because the push is append-only, prune the **remote** on its own schedule (cron
on the remote host), keeping a longer window than the prod copy, e.g.:

```bash
find /home/backup/baby-bot -name '*.sql.gz' -mtime +90 -delete
```

### Restore

```bash
cd /opt/baby-bot
./restore.sh backups/daily/baby_bot-YYYYMMDD-HHMMSS.sql.gz
```

It stops the backend, loads the dump (dumped with `--clean --if-exists`, so it
drops & recreates objects), and restarts the backend. **Test restores
periodically** — an untested backup is not a backup.

## Onboarding a new product

1. Add `infra/<product>/docker-compose.yml` (+ `.env.example`).
2. Add the product's Dockerfile(s).
3. Add a `<PRODUCT>_ENV` GitHub secret with the prod `.env`.
4. Add a caller workflow `.github/workflows/deploy-<product>.yml` modelled on
   `deploy-baby-bot.yml`: trigger on `<product>-v*`, pass `images`, `infra_dir`,
   `deploy_path`, and the SSH + `<PRODUCT>_ENV` secrets to
   `./.github/workflows/deploy.yml`.

Everything else (build, GHCR push, SSH deploy) is shared.

## TLS fallback (no port 80)

Let's Encrypt validates HTTP-01 on :80 and TLS-ALPN-01 on :443 — both
CA-fixed. Since the app runs on :8443, TLS-ALPN is unreachable, so **:80 must be
open**. If :80 is unavailable, switch Caddy to **DNS-01** (add the relevant DNS
provider module + API token) — see the Caddy automatic-HTTPS docs.

## Host-local services from a container (e.g. a Telegram SOCKS5 proxy)

If the Telegram bot must egress through a SOCKS5 proxy running on the **host**,
remember `127.0.0.1` inside the container is the *container's* loopback, not the
host (symptom: `polling_error … ECONNREFUSED 127.0.0.1:10808`). To reach it:

1. The backend service already has `extra_hosts: ["host.docker.internal:host-gateway"]`
   in `infra/baby-bot/docker-compose.yml`.
2. Set `TELEGRAM_SOCKS5_PROXY=host.docker.internal:<port>` in the env.
3. Bind the proxy on the host to `0.0.0.0:<port>` (it still serves existing
   `127.0.0.1` clients — `0.0.0.0` is a superset), and firewall the port from the
   public internet: `sudo ufw deny <port>`.

## Editing the env after first deploy

CI rewrites `/opt/<product>/.env` from the `<PRODUCT>_ENV` secret on **every**
deploy, so changes have two timescales:

- **Immediate (until next deploy):** edit on the box and restart —
  `sudo nano /opt/baby-bot/.env && sudo docker compose up -d`.
- **Durable:** update the secret. Easiest without the web UI re-paste — keep a
  gitignored master copy and push it in one command:
  ```bash
  # seed the local copy once (drop the trailing REGISTRY=/IMAGE_TAG= lines CI adds)
  ssh <user>@<host> 'sudo cat /opt/baby-bot/.env' > babybot.env
  gh secret set BABY_BOT_ENV < babybot.env   # after editing one line
  ```

## Troubleshooting (symptom → cause → fix)

| Symptom (in the deploy job or container logs) | Cause | Fix |
| --- | --- | --- |
| `ssh: unable to authenticate, … [none publickey]` | Wrong key / not in `authorized_keys` / passphrase / wrong user | Install the matching public key; `DEPLOY_SSH_KEY` = full private key, no passphrase; `~/.ssh` 700, `authorized_keys` 600 |
| scp `Process exited with status 1` after `create folder` | Deploy dir not writable by the SSH user | `sudo chown -R <user>:<user> /opt/<product>` |
| `docker: unknown command: docker compose` | Compose v2 plugin missing | `sudo apt-get install -y docker-compose-plugin` (or `docker-compose-v2`) |
| `permission denied … /var/run/docker.sock` | User not in `docker` group / stale session | `sudo usermod -aG docker <user>`; re-login (CI uses a fresh session) |
| `failed to bind host port 0.0.0.0:80: address already in use` | Something else on :80 | `sudo ss -ltnp 'sport = :80'`; stop nginx/apache or the stray container |
| ACME `lookup … 127.0.0.53:53: connection refused` | Containers have no working DNS | Set `/etc/docker/daemon.json` `dns` + `systemctl restart docker` (bootstrap step 5) |
| ACME `connection refused`/`timeout` on the challenge | :80 not reachable from the internet | Open :80 (and :8443) in the **cloud** security group, not just `ufw`; check the DNS A-record |
| `libssl.so.3: cannot open shared object file` | (historical) base image lacked OpenSSL | Already fixed — the backend image installs `openssl`; rebuild from a current tag |
| bot `ECONNREFUSED 127.0.0.1:<port>` | Proxy is host-local; container can't see host loopback | See "Host-local services" above |
