# syntax=docker/dockerfile:1
#
# baby-bot backend (NestJS/Fastify) production image.
# Build context = repo root (the builder needs the whole pnpm workspace).
#
# The Nx esbuild bundle (main.cjs) leaves node_modules deps external and inlines
# the Prisma client runtime, loading the query engine via PRISMA_QUERY_ENGINE_LIBRARY.
# Runtime layout:
#   /app/main.cjs                      bundled app
#   /app/node_modules                  pinned prod deps + prisma CLI + tsx (migrate/seed)
#   /app/prisma/{schema,migrations,seed.ts}
#   /app/src/generated/client          self-contained Prisma client (engine + runtime)

############################ 1. Builder ############################
FROM node:22-bookworm-slim AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.5.1 --activate
# Copy the whole workspace (.dockerignore keeps node_modules/dist/.git out).
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm nx build baby-bot-backend-bot

####################### 2. Runtime deps ###########################
# A minimal, pinned production node_modules. Versions mirror the workspace
# (see apps/.../package.json + lockfile) so runtime behaviour matches CI.
FROM node:22-bookworm-slim AS runtime-deps
WORKDIR /runtime
RUN <<'EOF' cat > package.json
{
  "name": "baby-bot-backend-runtime",
  "private": true,
  "dependencies": {
    "@fastify/multipart": "10.0.0",
    "@nestjs/common": "11.1.24",
    "@nestjs/config": "4.0.4",
    "@nestjs/core": "11.1.24",
    "@nestjs/jwt": "11.0.2",
    "@nestjs/platform-fastify": "11.1.24",
    "@nestjs/schedule": "6.1.3",
    "fastify": "5.8.5",
    "node-telegram-bot-api": "0.67.0",
    "prisma": "6.19.3",
    "reflect-metadata": "0.2.2",
    "rxjs": "7.8.2",
    "socks-proxy-agent": "10.0.0",
    "tsx": "4.22.4",
    "zod": "3.25.76"
  }
}
EOF
RUN npm install --omit=dev --no-audit --no-fund

########################### 3. Runner #############################
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

# Pinned production dependencies (incl. prisma CLI + tsx for migrate/seed).
COPY --from=runtime-deps /runtime/node_modules ./node_modules
COPY --from=runtime-deps /runtime/package.json ./package.json

# Bundled application.
COPY --from=builder /workspace/dist/apps/baby-bot/backend-bot/main.cjs ./main.cjs

# Prisma schema + migrations + seed (used by the entrypoint at boot).
COPY --from=builder /workspace/apps/baby-bot/backend-bot/prisma ./prisma

# Self-contained generated Prisma client: ships the runtime + the
# debian-openssl-3.0.x query engine used by both main.cjs and seed.ts.
COPY --from=builder /workspace/apps/baby-bot/backend-bot/src/generated/client ./src/generated/client

COPY apps/baby-bot/backend-bot/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && mkdir -p /app/data

# Pin the query engine so the bundled (and seed) Prisma client locate it
# without relative-path guessing from inside the esbuild bundle.
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/src/generated/client/libquery_engine-debian-openssl-3.0.x.so.node
ENV DATA_DIR=/app/data
ENV PORT=3100
EXPOSE 3100
ENTRYPOINT ["./docker-entrypoint.sh"]
