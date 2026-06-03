# ADR 0008: Tag-driven CI/CD deployment

## Status: Accepted

## Context

`baby-bot` was fully built but had no deployment story (no Dockerfiles, no deploy
workflow). We need to ship it to a single self-hosted server and want the
mechanism to be a **reusable pattern** future ts-mono products can adopt with
minimal per-product wiring. Constraints from the codebase: the Telegram bot runs
in polling mode (no inbound webhook required); the backend self-prefixes routes
under `api/...` with the Alice webhook at `/webhook`; the Prisma client is
committed and ships the `debian-openssl-3.0.x` query engine; the Nx esbuild
bundle leaves node_modules deps external and inlines the Prisma runtime.

## Decision

**Trigger:** a git tag `<product>-v*` (e.g. `baby-bot-v1.2.3`). The tag's version
becomes the image tag.

**Build & registry:** GitHub Actions builds images and pushes them to **GHCR**
(`ghcr.io/yarabey/ts-mono/*`) using the built-in `GITHUB_TOKEN` (no PAT). The
server pulls them — nothing is built on the server.

**Reusable workflow:** `.github/workflows/deploy.yml` (`workflow_call`) is
product-agnostic — it takes `images` (JSON), `infra_dir`, `deploy_path`, registry,
tag, and SSH + `APP_ENV` secrets. Per product: a tiny caller workflow + an
`infra/<product>/` dir (compose + `.env.example`) + Dockerfiles + a
`<PRODUCT>_ENV` secret.

**Server runtime:** `docker compose` with `postgres`, `backend`, and a Caddy
`web` edge, plus named volumes. CI copies the compose file, writes `.env` (the
`<PRODUCT>_ENV` secret + appended `REGISTRY`/`IMAGE_TAG`), then
`docker compose pull && up -d`. Secrets live only as GitHub Actions secrets and
the server-side `.env`.

**Edge / TLS:** **Caddy** terminates TLS on **:8443** with automatic Let's
Encrypt, serves the mini-app under **`/mini-app`** (Vite built with
`base=/mini-app/`), and reverse-proxies `/api` + `/webhook` to the backend on
`:3100`. Port **80** stays open for the ACME HTTP-01 challenge (CA-fixed port).

**Backend image:** multi-stage on `node:22-bookworm-slim` (glibc/OpenSSL 3.0, to
match the committed Prisma engine — not Alpine). A pinned minimal runtime
`node_modules` (prod deps + `prisma` CLI + `tsx`) is installed; the entrypoint
runs `prisma migrate deploy` → idempotent seed → `node main.cjs`.
`PRISMA_QUERY_ENGINE_LIBRARY` pins the engine so the bundled client locates it.

## Alternatives rejected

- **Build on the server** (git pull + `docker build`): slower deploys, needs the
  toolchain + source on the box. CI build + GHCR pull is cleaner and cacheable.
- **nginx + certbot**: more moving parts (cron renewals, separate cert store)
  than Caddy's built-in ACME.
- **Mini-app at the path root**: would collide with `/api`/`/webhook` routing and
  needs no extra work to instead serve under `/mini-app` with a Vite base path.
- **Self-hosted/registry-less image transfer** (scp tarballs): GHCR is free for
  this repo and gives versioned, pullable images.

## Consequences

- Deploys are a `git tag` push; rollback is re-tagging an older version.
- A new product is ~one caller workflow + an `infra/<product>/` dir away.
- The reusable workflow uses third-party actions (`docker/*`, `appleboy/ssh-action`,
  `appleboy/scp-action`) — all free; swappable for raw `ssh`/`rsync` if desired.
- GitHub Actions spending limit remains $0 (Actions + GHCR are free here).
- TLS requires inbound :80 for ACME; the DNS-01 fallback is documented in
  `infra/README.md` if :80 is ever unavailable.
