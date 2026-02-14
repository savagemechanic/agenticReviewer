# Agentic Reviewer — CLAUDE.md

## Project Overview

Agentic Reviewer is an autonomous B2B product review platform. It discovers SaaS products, processes them via browser automation, generates AI-powered video reviews, and publishes to YouTube/TikTok/Instagram with human-in-the-loop approval.

**Stack:** TypeScript (strict) · Turborepo + pnpm monorepo · Hono · Next.js 15 · React 19 · Remotion · Drizzle ORM · PostgreSQL · Redis · MinIO · Playwright · Claude/OpenAI SDKs

## Guardrails

**Read and follow `docs/guardrails.md` before writing any code.** It is the canonical guide for all development in this project. Key mandates:

- All code must be idiomatic, modern TypeScript — strict mode, no `any`, discriminated unions, derived types from Drizzle/Zod schemas
- Named exports only, no default exports
- `function` declarations for top-level exports, arrows for callbacks
- Explicit return types on all exported functions
- Zod validation at every external boundary (HTTP, LLM responses, crawler output)
- Result types for expected failures, `throw` only for unrecoverable errors
- No `console.log` — use the structured logger from `@repo/shared`
- No `as` casts without `// SAFETY:` justification

## Architecture

### Monorepo Structure

```
apps/api          — Hono HTTP API (port 3001)
apps/dashboard    — Next.js admin UI (port 3000)
apps/video-renderer — Remotion video service (port 3002)
packages/db       — Drizzle ORM schema & queries
packages/browser  — Playwright automation & crawlers
packages/llm      — Claude/OpenAI clients, summarize, score
packages/storage  — MinIO/S3 object storage
packages/distribution — YouTube/TikTok/Instagram publishing
packages/shared   — Types, logger, rate limiter, config
```

### Package Dependency Rules

- Apps depend on packages. Packages NEVER depend on apps.
- Only `@repo/shared` may be imported by other packages.
- No circular dependencies.

### Pipeline

```
Discover → Process → Summarize → Score → Render → Approve → Distribute
```

Every stage is idempotent. Human approval is mandatory before distribution.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start all services (turbo)
pnpm build            # Build all packages and apps
docker compose up     # Full local environment (postgres, redis, minio, n8n)
```

## Naming Conventions

- Files: `kebab-case.ts`
- Functions: `camelCase`
- Types: `PascalCase`
- Constants: `SCREAMING_SNAKE`
- Zod schemas: `camelCaseSchema`
- DB tables: `snake_case` (plural)
- Env vars: `SCREAMING_SNAKE`
- Routes: `/kebab-case`
- Packages: `@repo/kebab-case`
