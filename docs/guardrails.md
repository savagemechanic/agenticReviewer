# Agentic Reviewer — Development Guardrails

> **This document is the canonical context guide for all development on Agentic Reviewer.**
> Every code change, refactor, and new feature MUST conform to these guardrails.
> AI agents, human contributors, and code reviewers should treat this as the single source of truth for how code is written in this project.

---

## 1. Idiomatic TypeScript — Non-Negotiable

All code in this repository MUST be idiomatic, modern TypeScript. This means:

### Type System

- **Strict mode is mandatory.** `strict: true` in every `tsconfig.json`. No `any` unless explicitly justified with a `// SAFETY:` comment.
- **Prefer `unknown` over `any`** when the type is genuinely unknown. Narrow with type guards, never cast blindly.
- **Use discriminated unions** for state modeling — not optional fields, not string enums with runtime checks.

```typescript
// GOOD — discriminated union
type ProductState =
  | { status: 'discovered'; url: string }
  | { status: 'processed'; url: string; screenshots: Screenshot[] }
  | { status: 'scored'; url: string; screenshots: Screenshot[]; scores: ScoreSet }

// BAD — optional soup
type Product = {
  status: string
  url: string
  screenshots?: Screenshot[]
  scores?: ScoreSet
}
```

- **Derive types from schemas.** Drizzle table types, Zod inferred types, and `as const` assertions are the source of truth. Do not duplicate type definitions manually.

```typescript
// GOOD — derived from schema
type Product = typeof products.$inferSelect
type NewProduct = typeof products.$inferInsert
type SummaryInput = z.infer<typeof summaryInputSchema>

// BAD — manually duplicated
interface Product {
  id: number
  name: string
  // ...50 fields that will drift from the schema
}
```

- **Use `satisfies`** for compile-time validation without widening.
- **Use branded types** for domain identifiers when disambiguation matters (e.g., `ProductId` vs `VideoId`).
- **Const assertions (`as const`)** for literal tuples and config objects.

### Functions & Modules

- **Named exports only.** No default exports — they harm refactoring, auto-imports, and grep-ability.
- **Pure functions by default.** Side effects are explicit, isolated, and pushed to the edges (route handlers, service entry points).
- **Prefer `function` declarations** for top-level named functions (they hoist, they have names in stack traces). Use arrow functions for inline callbacks and closures.

```typescript
// GOOD — declaration for named export
export function summarizeProduct(input: SummaryInput): Promise<Summary> { ... }

// GOOD — arrow for callback
const scored = products.filter((p) => p.status === 'scored')

// BAD — arrow for top-level named function
export const summarizeProduct = async (input: SummaryInput): Promise<Summary> => { ... }
```

- **Explicit return types on exported functions.** Internal helpers can rely on inference.
- **No classes unless genuinely modeling stateful entities with invariants.** Prefer plain objects + functions. This is not Java.

### Error Handling

- **Use `Result` patterns or typed errors** for expected failure modes. Reserve `throw` for truly exceptional/unrecoverable conditions.

```typescript
// GOOD — explicit result type
type SummarizeResult =
  | { ok: true; summary: Summary }
  | { ok: false; error: 'rate_limited' | 'invalid_response' | 'timeout' }

// BAD — throwing for expected failures
function summarize(input: Input): Summary {
  if (rateLimited) throw new Error('Rate limited') // caller has no idea this can happen
}
```

- **Never catch and swallow.** If you catch, log with context and re-throw or return a typed error.
- **Zod for external boundaries.** All data entering the system (HTTP requests, LLM responses, crawler output) MUST be validated with Zod schemas. Internal function-to-function calls trust the type system.

### Async Patterns

- **`async`/`await` everywhere.** No raw `.then()` chains.
- **`Promise.all()` for independent concurrent work.** No sequential awaits on independent operations.
- **`Promise.allSettled()` when partial failure is acceptable** (e.g., multi-crawler discovery).
- **Always handle rejection.** Unhandled promise rejections are bugs.

---

## 2. Clean Code Architecture

### Monorepo Package Boundaries

Each package in `packages/` owns a single domain. Respect these boundaries absolutely:

| Package | Owns | NEVER Contains |
|---|---|---|
| `@repo/db` | Schema, migrations, queries | Business logic, HTTP concerns |
| `@repo/browser` | Playwright automation, crawlers | Database access, LLM calls |
| `@repo/llm` | AI client, prompts, parsing | Database access, HTTP routing |
| `@repo/storage` | Object storage (MinIO/S3) | Business logic, type definitions |
| `@repo/distribution` | Platform publishing (YT, TT, IG) | Video rendering, scoring |
| `@repo/shared` | Cross-cutting types, logger, config | Implementation logic, heavy deps |

**Rules:**
- Packages depend **downward** (apps depend on packages). Packages NEVER depend on apps.
- `@repo/shared` is the only package other packages may depend on.
- No circular dependencies. Ever. Turborepo will catch this — do not work around it.

### App Architecture (Hono API)

Routes are thin. They validate input, call domain functions, and return responses:

```typescript
// GOOD — thin route handler
app.post('/summarize', async (c) => {
  const input = summaryInputSchema.parse(await c.req.json())
  const result = await summarizeProduct(input)
  if (!result.ok) return c.json({ error: result.error }, 422)
  return c.json(result.summary)
})

// BAD — route handler doing everything
app.post('/summarize', async (c) => {
  const body = await c.req.json()
  // ...80 lines of business logic, database queries, LLM calls...
  return c.json(result)
})
```

### Dependency Injection

- **Pass dependencies as function arguments**, not as module-level singletons accessed via import.
- Factory functions (`createStorageClient`, `createLlmClient`) instantiate; callers inject.
- This makes testing trivial — no mocking modules, just pass a fake.

### File Organization

- **One concept per file.** A file named `summarize.ts` exports summarization logic. It does not also contain scoring.
- **Index files re-export only.** `index.ts` is a barrel — it contains no logic.
- **Co-locate tests.** `summarize.ts` → `summarize.test.ts` in the same directory.

---

## 3. Pipeline Integrity

The Agentic Reviewer pipeline is the core product:

```
Discover → Process → Summarize → Score → Render → Approve → Distribute
```

### Invariants

1. **Every stage is idempotent.** Re-running a stage with the same input produces the same output. No duplicate screenshots, no duplicate videos.
2. **Every stage validates its preconditions.** `Process` checks the product is `discovered`. `Score` checks a summary exists. Fail fast with a clear error, never silently skip.
3. **State transitions are explicit.** Product status moves through a defined state machine. No jumping from `discovered` to `published`.
4. **Human-in-the-loop is not optional.** The `Approve` stage exists for a reason. No code path bypasses it for production distribution.

### Data Contracts

- **LLM output is untrusted external input.** Always parse with Zod. Always have fallback parsing (regex extraction from markdown fences). Always validate numeric ranges.
- **Crawler output is untrusted external input.** Validate URLs, sanitize text, enforce length limits.
- **Inter-service communication uses typed schemas.** The video renderer API contract is defined once and shared.

---

## 4. Performance & Resource Management

- **Browser pool is bounded.** Max 3 concurrent Playwright contexts. The semaphore is not a suggestion — it prevents OOM kills.
- **Recycle browser pages after 10 uses.** Playwright leaks memory. This is a known constraint, not a bug to "fix."
- **Rate limit external APIs.** Redis sliding window for inbound requests. Exponential backoff with jitter for outbound (LLM, platform APIs).
- **Cache Remotion bundles.** First render is expensive. Subsequent renders reuse the webpack bundle.
- **Truncate LLM input to 8000 characters.** Longer input wastes tokens without improving output quality.

---

## 5. Code Quality Standards

### What Every PR Must Have

- [ ] All new exported functions have explicit return types
- [ ] All external data boundaries use Zod validation
- [ ] No `any` without a `// SAFETY:` justification
- [ ] No side effects in pure utility functions
- [ ] Structured logging with context (request ID, product ID) — not `console.log`
- [ ] Error cases return typed errors, not thrown strings

### What Every PR Must NOT Have

- [ ] No `console.log` — use the structured logger from `@repo/shared`
- [ ] No `as` type assertions without `// SAFETY:` comment explaining why it's safe
- [ ] No synchronous file I/O in request paths
- [ ] No hardcoded URLs, ports, or credentials — use `env.ts` validation
- [ ] No `eslint-disable` without a linked issue explaining why
- [ ] No barrel imports from package internals — use the public API (`@repo/llm`, not `@repo/llm/src/client`)

---

## 6. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | `kebab-case.ts` | `rate-limit.ts` |
| Functions | `camelCase` | `summarizeProduct()` |
| Types/Interfaces | `PascalCase` | `ProductState`, `ScoreSet` |
| Constants | `SCREAMING_SNAKE` | `MAX_CONCURRENT_PAGES` |
| Zod schemas | `camelCase` + `Schema` suffix | `summaryInputSchema` |
| Database tables | `snake_case` (plural) | `discovery_runs` |
| Environment variables | `SCREAMING_SNAKE` | `DATABASE_URL` |
| Route paths | `kebab-case` | `/discovery-runs` |
| Package names | `@repo/kebab-case` | `@repo/video-renderer` |

---

## 7. Infrastructure Guardrails

- **Docker Compose is the local dev environment.** If it doesn't work with `docker compose up`, it's broken.
- **Migrations are forward-only.** No dropping columns in production. Add new columns as nullable, backfill, then enforce.
- **Environment variables are validated at startup** via `env.ts` with Zod. The app crashes immediately on missing config — not 10 minutes later when the code path is hit.
- **Secrets never appear in code, logs, or error messages.** Connection strings, API keys, and tokens are env vars only.

---

## 8. When In Doubt

1. **Is it type-safe?** If not, make it type-safe.
2. **Is it idiomatic TypeScript?** If it reads like Java, C#, or Python — rewrite it.
3. **Does it respect package boundaries?** If a package is reaching into another package's internals — refactor.
4. **Is the error handling explicit?** If a failure mode is hidden behind a `catch` — surface it as a typed result.
5. **Would a new contributor understand this in 30 seconds?** If not — simplify.

---

*This document is enforced, not aspirational. Code that violates these guardrails should not be merged.*
