#!/bin/sh
# Boot sequence for the baby-bot backend container:
#   1. apply pending Prisma migrations (fails the boot if a migration fails)
#   2. run the idempotent seed (upserts on fixed ids — safe every start)
#   3. exec the bundled NestJS server
set -e
cd /app

echo "[entrypoint] prisma migrate deploy..."
./node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma

echo "[entrypoint] seeding (idempotent)..."
./node_modules/.bin/tsx prisma/seed.ts

echo "[entrypoint] starting backend on :${PORT:-3100}..."
exec node main.cjs
