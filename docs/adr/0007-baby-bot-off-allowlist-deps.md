# ADR 0007: baby-bot off-allowlist dependencies

## Status: Accepted

## Context

The `baby-bot` product (adopted from the standalone `baby-ai` app) needs to
reach external systems the allowlist (AGENTS.md) does not cover: a Telegram bot
over a SOCKS5 proxy, and a one-shot importer for legacy Realm mobile databases.
AGENTS.md requires an approved ADR before adding any dependency not on the
allowlist.

Where a Node.js built-in sufficed we used it instead of adding a dependency:
- **JWT** — `@nestjs/jwt` (NestJS ecosystem, already allowlisted via NestJS).
- **initData HMAC verification** — Node `crypto` (no dependency).
- **LLM (ZAI/GLM) + Whisper calls** — native `fetch`/`FormData` (no `axios`/`openai`).
- **Date handling** — native `Date`/`Intl` (no `dayjs`).

The following could not be reasonably replaced and are approved here.

## Decision

Approve these runtime dependencies for `baby-bot` only:

| Dependency | Why | Containment |
| --- | --- | --- |
| `node-telegram-bot-api` | Behaviour parity for the Telegram bot (polling, commands, voice download). Re-implementing the Bot API by hand is high-risk churn. | Used only in `telegram.service.ts`; bot init is config-gated (no token → bot disabled). Flagged for future review vs. `grammy`/native HTTP. |
| `socks-proxy-agent` | The bot reaches Telegram through a SOCKS5 proxy in the deployment environment. | Used only when `TELEGRAM_SOCKS5_PROXY` is set. Ambient type shim; resolved at runtime/build. |
| `realm` | One-shot historical import from legacy Realm mobile DB files. Heavy, deprecated native module (~1 GB installed; the Node-only build is `realm@12`, whose binary is fetched from `static.realm.io` at install). | **Not** a runtime app dependency: marked `external` in `project.json`, loaded via a non-literal dynamic `import()` (`realm-importer.ts`) so it is never statically bundled, and run **only** offline via the `realm-import` Nx target — never from the served backend or the deployed Mini App. Optional to install (`pnpm add -w realm@12`). See `src/data-import/README.md`. |

NestJS-ecosystem additions (`@nestjs/jwt`, `@nestjs/config`, `@nestjs/schedule`,
`@fastify/multipart`, plus `fastify` made an explicit dep for type resolution)
are treated as in-scope for the approved NestJS+Fastify stack and need no
separate ADR.

## Consequences

- `node-telegram-bot-api` and `socks-proxy-agent` ship in the served backend
  bundle but are inert without their env config.
- `realm` is never bundled into the served backend, nor installed in its
  container; the deployed Mini App's import is CSV-only. Realm import is an
  offline/admin operation run via the `realm-import` Nx target against the DB
  (see `src/data-import/README.md`), keeping the always-on server slim.
- CI (`GitHub Actions spending limit: $0`) runs lint/test/build only; all
  external integrations (Telegram/ZAI/Whisper/Realm) are mocked or gated in
  tests, never called live.
- Revisit `node-telegram-bot-api` vs. `grammy`/native HTTP if the bot surface
  is reworked.
