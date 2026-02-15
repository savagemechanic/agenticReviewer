# Agentic Reviewer — Development Guardrails

> **This is the canonical development standard for Agentic Reviewer.**
> Every code change — feature, fix, or refactor — MUST conform to these guardrails.
> AI agents, human contributors, and code reviewers treat this as the single source of truth.

---

## 1. TypeScript Standards

### Type System

- **Strict mode everywhere.** `strict: true` in every `tsconfig.json`.
- **No `any`.** Use `unknown` and narrow with type guards. The only exception is an `as` cast with a `// SAFETY:` comment explaining why the cast is correct.
- **Discriminated unions** for state modeling. Not optional fields, not string enums with runtime checks.
- **Derive types from schemas.** Drizzle `$inferSelect`/`$inferInsert`, Zod `z.infer<>`, and `as const` are the source of truth. Never duplicate type definitions manually.
- **`satisfies`** for compile-time validation without widening.
- **Branded types** for domain identifiers when disambiguation matters (`ProductId` vs `VideoId`).

### Functions & Modules

- **Named exports only.** No default exports.
- **`function` declarations** for top-level named exports. Arrow functions for inline callbacks and closures.
- **Explicit return types** on all exported functions. Internal helpers may rely on inference.
- **No classes** unless genuinely modeling stateful entities with invariants.

### Error Handling

- **`Result<T, E>` for expected failures.** Use `ok()` / `err()` from `@repo/shared`. Reserve `throw` for truly unrecoverable conditions.
- **Never catch and swallow.** If you catch, log with context and return a typed error.
- **`catch (error: unknown)`** — never `catch (error: any)`. Narrow with type guards.
- **Zod at every external boundary.** HTTP requests, LLM responses, crawler output, inter-service responses — all validated with Zod schemas. Internal function-to-function calls trust the type system.

### Async Patterns

- **`async`/`await` everywhere.** No `.then()` chains.
- **`Promise.all()`** for independent concurrent work. No sequential awaits on independent operations.
- **`Promise.allSettled()`** when partial failure is acceptable (e.g., multi-crawler discovery).
- **Always handle rejection.** Unhandled promise rejections are bugs.

---

## 2. Architecture

### Monorepo Package Boundaries

Each package owns a single domain. Respect these boundaries absolutely:

| Package | Owns | Never Contains |
|---|---|---|
| `@repo/db` | Schema, migrations, queries | Business logic, HTTP concerns |
| `@repo/browser` | Playwright automation, crawlers | Database access, LLM calls |
| `@repo/llm` | AI client, prompts, parsing | Database access, HTTP routing |
| `@repo/storage` | Object storage (MinIO/S3) | Business logic, type definitions |
| `@repo/distribution` | Platform publishing (YT, TT, IG) | Video rendering, scoring |
| `@repo/shared` | Cross-cutting types, Result, logger, config | Implementation logic, heavy deps |

**Dependency rules:**
- Apps depend on packages. Packages never depend on apps.
- `@repo/shared` is the only package other packages may import.
- No circular dependencies. Turborepo enforces this — do not work around it.

### Route Handlers

Routes are thin — validate input, call domain functions, return responses:

```typescript
route.post("/", async (c) => {
  const input = schema.parse(await c.req.json());
  const result = await domainFunction(input);
  if (!result.ok) return c.json({ success: false, error: result.error }, 422);
  return c.json({ success: true, data: result.value });
});
```

### Dependency Injection

- Pass dependencies as function arguments, not module-level singletons.
- Factory functions (`createDb`, `createStorageClient`) instantiate; callers inject.
- This makes testing trivial — pass a fake, no module mocking.

### File Organization

- **One concept per file.** `summarize.ts` exports summarization. It does not also contain scoring.
- **Index files re-export only.** `index.ts` is a barrel — zero logic.
- **Co-locate tests.** `summarize.ts` → `summarize.test.ts` in the same directory.

---

## 3. Pipeline Integrity

```
Discover → Process → Summarize → Score → Render → Approve → Distribute
```

### Invariants

1. **Every stage is idempotent.** Re-running with the same input produces the same output.
2. **Every stage validates its preconditions.** Fail fast with a clear error, never silently skip.
3. **State transitions are explicit.** Products move through a defined state machine — no skipping stages.
4. **Human-in-the-loop is mandatory.** No code path bypasses the Approve stage for production distribution.

### Data Contracts

- **LLM output is untrusted.** Parse with Zod. Fallback-parse markdown fences. Validate numeric ranges. Always return `Result`.
- **Crawler output is untrusted.** Validate URLs, sanitize text, enforce length limits. Always return `Result`.
- **Inter-service responses are untrusted.** Validate with Zod before consuming (e.g., video renderer → API).

---

## 4. Performance & Resources

- **Browser pool is bounded.** Max 3 concurrent Playwright contexts via semaphore.
- **Recycle browser pages after 10 uses.** Playwright leaks memory — this is a known constraint.
- **Rate limit external APIs.** Redis sliding window inbound, exponential backoff with jitter outbound.
- **Cache Remotion bundles.** First render is expensive; subsequent renders reuse the bundle.
- **Truncate LLM input.** 8000 characters max — longer input wastes tokens without improving quality.

---

## 5. Code Quality Checklist

### Every PR must have:

- All exported functions with explicit return types
- Zod validation at every external data boundary
- No `any` without `// SAFETY:` justification
- Structured logging via `createLogger()` from `@repo/shared` — never `console.log`
- Expected failures returned as `Result` — not thrown
- `catch (error: unknown)` — never `catch (error: any)`

### Every PR must not have:

- `console.log`, `console.warn`, `console.error` — use the structured logger
- `as` casts without `// SAFETY:` comment
- Hardcoded URLs, ports, or credentials — use Zod-validated `env.ts`
- Logic in barrel files (`index.ts`)
- `.then()` chains — use `async`/`await`
- Barrel imports from package internals (`@repo/llm/src/client`) — use the public API (`@repo/llm`)

---

## 6. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | `kebab-case.ts` | `rate-limit.ts` |
| Functions | `camelCase` | `summarizeProduct()` |
| Types/Interfaces | `PascalCase` | `ProductState`, `ScoreResult` |
| Constants | `SCREAMING_SNAKE` | `MAX_CONCURRENT_PAGES` |
| Zod schemas | `camelCase` + `Schema` | `summaryInputSchema` |
| DB tables | `snake_case` (plural) | `discovery_runs` |
| Env vars | `SCREAMING_SNAKE` | `DATABASE_URL` |
| Routes | `/kebab-case` | `/discovery-runs` |
| Packages | `@repo/kebab-case` | `@repo/video-renderer` |

---

## 7. Infrastructure

- **Docker Compose is the local dev environment.** If it doesn't work with `docker compose up`, it's broken.
- **Migrations are forward-only.** Add columns as nullable, backfill, then enforce. Never drop in production.
- **Env vars are validated at startup** via Zod in `env.ts`. The app crashes immediately on missing config — not when the code path is eventually hit.
- **Secrets never appear in code, logs, or error messages.** Connection strings, API keys, and tokens are env vars only.

---

## 8. Decision Framework

When in doubt, ask these questions in order:

1. **Is it type-safe?** If not, make it type-safe.
2. **Is it idiomatic TypeScript?** If it reads like Java or Python, rewrite it.
3. **Does it respect package boundaries?** If reaching into another package's internals, refactor.
4. **Is the error handling explicit?** If a failure is hidden behind a bare `catch`, surface it as a `Result`.
5. **Would a new contributor understand this in 30 seconds?** If not, simplify.

---

*These guardrails are enforced, not aspirational. Code that violates them should not be merged.*
