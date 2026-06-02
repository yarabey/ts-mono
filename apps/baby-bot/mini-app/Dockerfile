# syntax=docker/dockerfile:1
#
# baby-bot edge image: builds the Vite mini-app and bakes it into Caddy, which
# terminates TLS on :8443, serves the SPA under /mini-app, and reverse-proxies
# /api + /webhook to the backend. Build context = repo root.

############################ 1. Builder ############################
FROM node:22-bookworm-slim AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.5.1 --activate
COPY . .
RUN pnpm install --frozen-lockfile
# The SPA lives under /mini-app/ in production, so assets must be prefixed.
ARG VITE_BASE_PATH=/mini-app/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
RUN pnpm nx build baby-bot-mini-app

############################ 2. Runner #############################
FROM caddy:2-alpine AS runner
COPY --from=builder /workspace/dist/apps/baby-bot/mini-app /srv
COPY apps/baby-bot/mini-app/Caddyfile /etc/caddy/Caddyfile
# 80: ACME HTTP-01 challenge only. 8443: the app (TLS).
EXPOSE 80 8443
