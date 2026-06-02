# Mini-app serving strategy

The original baby-ai ran a single Fastify process that also served the built
mini-app via `@fastify/static` (and its in-process Let's Encrypt TLS).

In ts-mono the two are decoupled (the standalone TLS/static pieces are dropped
per the proposal). The chosen strategy:

- **Local dev:** `pnpm nx serve baby-bot-mini-app` runs Vite on its own port and
  proxies `/api/*` (and `/webhook`) to `pnpm nx serve baby-bot-backend-bot`
  (port 3100). See the mini-app `vite.config.ts` proxy block.
- **Production:** build both (`nx build baby-bot-backend-bot`,
  `nx build baby-bot-mini-app`) and serve the mini-app's static `dist` from a
  CDN / reverse proxy (nginx) that also forwards `/api` to the backend — the
  standard monorepo Docker/ingress convention.

If single-process static serving is ever required again for parity, add
`@fastify/static` (already marked `external` in `project.json`) and register it
in `main.ts` guarded by a `MINI_APP_DIST` env var pointing at the built assets.
