# Agentic Reviewer — Product Roadmap

All 7 phases are **complete**. The system is fully functional end-to-end.

---

## Phase 1: Foundation (Scaffold + Infra) — COMPLETE

| Task | Status |
|------|--------|
| Turborepo init, tsconfig, eslint, pnpm workspaces | Done |
| `packages/db` — Drizzle schema (8 tables), migrations setup | Done |
| `packages/shared` — types, constants, interfaces | Done |
| `packages/storage` — MinIO/S3 wrapper | Done |
| `docker-compose.yml` (postgres, redis, minio, n8n, api, video-renderer, dashboard) | Done |
| `.env.example`, `.gitignore`, `init-db.sql` | Done |
| Drizzle migration generated (`0000_sloppy_zodiak.sql`) | Done |
| Docker migration service + Dockerfile fixes | Done |
| n8n workflow template | Done |

---

## Phase 2: Discovery + Processing — COMPLETE

| Task | Status |
|------|--------|
| ProductHunt crawler (GraphQL API + Playwright scrape fallback) | Done |
| Reddit crawler (r/SaaS, r/startups via JSON API) | Done |
| Crawler index with `runAllCrawlers()` (parallel + dedup) | Done |
| `POST /discover` endpoint with real crawlers, optional `sources` filter | Done |
| `POST /process` endpoint — multi-page screenshots (hero, pricing, features) | Done |
| `POST /process` — `measureTiming()` for performance metrics | Done |
| Graceful 404 handling for missing subpages | Done |

---

## Phase 3: Intelligence (LLM Summarization + Scoring) — COMPLETE

| Task | Status |
|------|--------|
| Retry + exponential backoff wrapper with 429 rate limit handling | Done |
| LLM client hardened — 30s timeout, markdown fence stripping | Done |
| `summarizeProduct()` — safe JSON parsing with regex fallback, 8k char truncation, field validation | Done |
| `scoreProduct()` — score clamping (1-10), overall vs average validation | Done |
| `POST /summarize` — duplicate check, `force` param, 503 on LLM failure, status rollback | Done |
| `POST /score` — duplicate check, `force` param, error handling, status rollback | Done |
| `GET /products` — pagination (offset/limit), filtering by status/source | Done |
| `GET /stats` — product/video counts by status, recent discovery runs | Done |
| Structured JSON logger (`packages/shared/src/logger.ts`) | Done |
| Request ID middleware with correlation IDs | Done |

---

## Phase 4: Video Generation (Remotion) — COMPLETE

| Task | Status |
|------|--------|
| `ReviewVideo.tsx` — complete rewrite with 5 animated sequences | Done |
| Intro — gradient animation, spring-based scale-in, staggered subtitle | Done |
| ScreenshotSlide — Ken Burns effect (slow zoom + pan), caption overlay | Done |
| SummarySlide — animated bullet list, pros (green) / cons (red) columns | Done |
| ScoreCard — 4 animated radial progress rings + large center overall score | Done |
| Outro — fade-in CTA with channel branding | Done |
| `RadialScore.tsx` — animated SVG ring component | Done |
| `AnimatedBullet.tsx` — staggered entrance bullet points | Done |
| Video format configs — YT 1920x1080, TikTok/IG 1080x1920 | Done |
| `render.ts` — real Remotion `renderMedia()` + MinIO upload | Done |
| `bundle.ts` — cached webpack bundle (bundle once, reuse) | Done |
| `thumbnail.ts` — `renderStill()` at ScoreCard frame, upload to MinIO | Done |
| `Root.tsx` — Remotion composition registration | Done |
| ElevenLabs TTS support (gated behind `ELEVENLABS_API_KEY`) | Done |
| Short vs long format support (format prop adjusts layout + durations) | Done |

---

## Phase 5: Dashboard (Next.js 15 + React 19) — COMPLETE

| Task | Status |
|------|--------|
| UI component library — Card, Badge, Button, Input, Select, Skeleton, Dialog, Tabs | Done |
| StatusBadge — color-coded by product/video status | Done |
| ScoreRing — animated circular SVG score visualization | Done |
| Pipeline Overview page — stats cards, pipeline funnel, recent products, quick actions | Done |
| Products list page — filter bar, card grid, pagination, score rings | Done |
| Product detail page — screenshots, summary, scores, videos, metadata | Done |
| Video review queue — video player, approve/reject with dialog | Done |
| Discovery runs page — history table, "Run Now" button | Done |
| Sidebar — active link highlighting, lucide icons, mobile collapsible | Done |
| React Query hooks — useStats, useProducts, useProduct, useVideos, useActions | Done |
| `GET /videos`, `POST /videos/:id/approve`, `POST /videos/:id/reject` API routes | Done |
| `GET /discover` — discovery run history endpoint | Done |
| Login page with cookie-based auth (`DASHBOARD_SECRET`) | Done |
| Next.js middleware — redirect to /login if unauthenticated | Done |
| Dashboard health check API route | Done |
| UI dependencies — lucide-react, recharts, framer-motion, Radix UI primitives | Done |

---

## Phase 6: Distribution (YouTube) — COMPLETE

| Task | Status |
|------|--------|
| `POST /distribute` — real YouTube upload via googleapis | Done |
| Download video from MinIO, upload to YouTube with metadata | Done |
| Video metadata generation — title, description, tags from product data | Done |
| YouTube credential validation — clear error if `YOUTUBE_*` env vars missing | Done |
| Thumbnail integration — pass MinIO thumbnail to YouTube upload | Done |
| Publications table updated with externalId/externalUrl | Done |
| TikTok/Instagram — returns `{ status: "skipped", reason: "not configured" }` | Done |
| `@repo/distribution` + `@repo/storage` wired to API | Done |

---

## Phase 7: Hardening + Production Readiness — COMPLETE

| Task | Status |
|------|--------|
| Browser pool — semaphore (max 3 concurrent), auto-recycle after 10 pages | Done |
| `takeScreenshot`, `extractPageData`, `measureTiming` use pooled pages | Done |
| HackerNews Show HN crawler via Firebase API | Done |
| Redis sliding window rate limiter (`packages/shared/src/rate-limit.ts`) | Done |
| Enhanced health checks — DB connectivity test, uptime reporting | Done |
| Security headers — X-Content-Type-Options, X-Frame-Options, HSTS | Done |
| CORS configured from `CORS_ORIGIN` env var (not wildcard) | Done |
| `.github/workflows/ci.yml` — PR: install, build, type-check | Done |
| `.github/workflows/docker.yml` — main push: build Docker images | Done |
| `.dockerignore` | Done |

---

## Architecture

```
Discovery (PH, Reddit, HN) → Processing (Playwright) → Summarize (Claude) → Score (Claude)
    → Video Render (Remotion) → Human Approval (Dashboard) → Distribute (YouTube)
```

### Services
- **API** (`apps/api`) — Hono on port 3001
- **Video Renderer** (`apps/video-renderer`) — Hono + Remotion on port 3002
- **Dashboard** (`apps/dashboard`) — Next.js 15 on port 3000
- **n8n** — Workflow orchestration on port 5678

### Packages
- `@repo/db` — Drizzle ORM, 8 tables
- `@repo/shared` — Types, logger, rate limiter, video configs
- `@repo/storage` — MinIO/S3 client
- `@repo/browser` — Playwright pool + crawlers
- `@repo/llm` — Claude client with retry, summarize, score, TTS
- `@repo/distribution` — YouTube, TikTok, Instagram upload clients

### Infrastructure
- PostgreSQL 16, Redis 7, MinIO, n8n
