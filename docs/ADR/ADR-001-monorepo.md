# ADR-001 — Monorepo with pnpm Workspaces

**Date:** Phase 0  
**Status:** Accepted

## Context

Tillu consists of a web frontend, a core API, a local agent, ~10 AI agents, and ~7 shared packages. These components share types, schemas, events, and utilities heavily. The question is how to organize them.

Options considered:
1. Separate repositories for each component
2. Monorepo with npm workspaces
3. Monorepo with pnpm workspaces
4. Monorepo with Turborepo

## Decision

Monorepo with **pnpm workspaces**. Turborepo can be added later for build caching if needed.

## Reasons

- Shared packages (`schemas`, `events`, `model-router`) are consumed by all agents and apps. Cross-repo dependency management at this early stage would add friction with no benefit.
- TypeScript path aliases and composite projects work cleanly in a monorepo.
- pnpm's strict dependency isolation prevents phantom dependency bugs.
- A single `tsconfig.json` root with per-package extensions gives strict mode everywhere.
- All CI checks (lint, typecheck, test, build) run in one pipeline.

## Tradeoffs

- Repo grows large over time. Mitigated by clear directory conventions and per-workspace scripts.
- Agents cannot be deployed independently with zero config. Mitigated by each agent having its own `package.json` and `Dockerfile`.
- New contributors must understand workspace conventions. Mitigated by this ADR and `CODING_STANDARDS.md`.

## Consequences

- All new packages/apps/agents go under their respective workspace directories.
- Shared code belongs in `packages/`. Nothing shared should live in `apps/` or `agents/`.
- Each agent is independently deployable (its own `package.json`, `Dockerfile`, env vars).
