# ADR 0005: GitHub Hosting — Private Repo, Free Plan

## Status: Accepted

## Context

We need a GitHub repository for CI/CD and collaboration.

## Decision

- **Visibility:** Private.
- **Plan:** GitHub Free — branch protection and required checks are advisory-only for private repos on Free. Local pre-commit hooks enforce conventions.
- **CI:** GitHub Actions using `nx affected`.
- **Registry:** Skipped for now (no container registry configured).
- **Nx Cloud:** Enabled (free tier for remote caching + task distribution).

## Consequences

- Branch protection rules are advisory. Developers must rely on local pre-commit hooks and CI reports.
- Nx Cloud provides remote caching and task distribution to speed up CI.
