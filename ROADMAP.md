# Agentic Reviewer — Product Roadmap

## Phase 1: Foundation (Scaffold + Infra) — COMPLETE

| Task | Status |
|------|--------|
| Turborepo init, tsconfig, eslint, pnpm workspaces | Done |
| `packages/db` — Drizzle schema (8 tables), migrations setup | Done |
| `packages/shared` — types, constants, interfaces | Done |
| `packages/storage` — MinIO/S3 wrapper | Done |
| `docker-compose.yml` (postgres, redis, minio, n8n, api, video-renderer, dashboard) | Done |
| `.env.example`, `.gitignore`, `init-db.sql` | Done |
| README, MIT License | Done |
| Push to GitHub | Done |

| Drizzle migration generated (`0000_sloppy_zodiak.sql`) | Done |
| Docker migration service + Dockerfile fixes (`turbo.json` copy) | Done |
| n8n workflow template (`n8n/workflows/product-review-pipeline.json`) | Done |

**Phase 1 is fully complete.**

---

## Phase 2: Discovery + Processing — NOT STARTED

**Goal:** Discover B2B products from public sources and process them via Playwright.

| Task | Timeline | Description |
|------|----------|-------------|
| Implement ProductHunt discovery crawler | 2 days | Scrape/API for new B2B products, insert into `products` table |
| Implement Reddit discovery (r/SaaS, r/startups) | 1 day | Reddit API client, filter for product launches |
| Wire up `POST /discover` endpoint with real crawlers | 1 day | Connect discovery sources to API route |
| Implement Playwright `processProduct()` flow | 2 days | Navigate to product URL, take screenshots, extract text, measure timing, store to MinIO |
| Wire up `POST /process` endpoint | 1 day | Connect browser package to API route, store results in DB |
| Create n8n workflow: Cron → Discover → Process | 1 day | Import/build workflow in n8n UI |
| Write integration tests for discovery + processing | 1 day | Test with real URLs, verify DB + MinIO state |

**Estimated: 9 days**

---

## Phase 3: Intelligence (LLM Summarization + Scoring) — NOT STARTED

**Goal:** Use Claude API to generate structured summaries and multi-dimensional scores.

| Task | Timeline | Description |
|------|----------|-------------|
| Test & refine `summarizeProduct()` prompts | 2 days | Iterate on Claude prompts for quality output, handle edge cases |
| Test & refine `scoreProduct()` prompts + heuristics | 2 days | Combine LLM scoring with page timing/UX heuristics |
| Wire up `POST /summarize` with real DB reads/writes | 1 day | Read extractions from DB, write summary back |
| Wire up `POST /score` with real DB reads/writes | 1 day | Read summary + timing data, write scores back |
| Extend n8n workflow: → Summarize → Score | 0.5 days | Add HTTP nodes to existing workflow |
| Add error handling for LLM failures (retries, fallbacks) | 1 day | Rate limits, malformed responses, timeouts |
| End-to-end test: discover → process → summarize → score | 0.5 days | Verify full pipeline via n8n |

**Estimated: 8 days**

---

## Phase 4: Video Generation — NOT STARTED

**Goal:** Generate review videos programmatically using Remotion.

| Task | Timeline | Description |
|------|----------|-------------|
| Design video template system (short vs long format) | 1 day | Define durations, slide order, transitions for 60s and 120s formats |
| Build Remotion `Intro` composition (animated title, logo) | 2 days | Motion graphics, brand identity, text animations |
| Build `SummarySlide` composition (key features, pros/cons) | 2 days | Animated bullet points, icons, layout |
| Build `ScoreCard` composition (animated score reveal) | 1.5 days | Radial/bar chart animations for UX, performance, features, value |
| Build `ScreenshotSlide` composition (pan/zoom screenshots) | 1.5 days | Ken Burns effect on actual product screenshots from MinIO |
| Build `Outro` composition (CTA, subscribe) | 0.5 days | Call-to-action with social links |
| Implement real `renderVideo()` with Remotion `renderMedia` | 2 days | Replace placeholder, bundle compositions, render MP4 |
| Add TTS narration (optional, ElevenLabs/OpenAI TTS) | 2 days | Generate voiceover from summary text, sync with video |
| Wire up `POST /video/render` endpoint | 1 day | Trigger render, track status, store output to MinIO |
| Extend n8n workflow: → Render → Wait for Approval | 0.5 days | Add render node + n8n Wait node |

**Estimated: 14 days**

---

## Phase 5: Dashboard — PARTIALLY DONE (scaffold only)

**Goal:** Admin UI for reviewing pipeline state, approving videos, managing products.

| Task | Timeline | Description |
|------|----------|-------------|
| ~~Dashboard scaffold (Next.js, layout, routing)~~ | ~~Done~~ | Layout with sidebar, dark theme |
| Connect dashboard to real API (React Query hooks) | 2 days | Fetch products, videos, pipeline status from `apps/api` |
| Product list page — real data, filters, search | 1.5 days | Filter by status, search by name, pagination |
| Product detail page — screenshots, summary, scores | 1.5 days | Display all collected data for a product |
| Video review queue — preview, approve/reject | 2 days | Video player, approve button triggers n8n webhook resume |
| Pipeline overview — real-time status visualization | 1.5 days | Show active workflow runs, success/failure counts |
| Discovery run history page | 1 day | List past discovery runs with stats |
| Authentication (NextAuth or simple API key) | 1.5 days | Protect dashboard from public access |
| n8n webhook integration for approval flow | 1 day | Dashboard approval → n8n resumes paused workflow |

**Estimated: 12 days**

---

## Phase 6: Distribution — PARTIALLY DONE (clients scaffolded)

**Goal:** Publish approved videos to YouTube, TikTok, and Instagram.

| Task | Timeline | Description |
|------|----------|-------------|
| ~~YouTube, TikTok, Instagram upload clients~~ | ~~Done~~ | Basic upload functions exist |
| YouTube OAuth2 flow + token refresh | 2 days | Implement proper OAuth consent, store refresh token |
| Test YouTube upload end-to-end | 1 day | Upload a real video, verify it appears on channel |
| TikTok OAuth + Content Posting API testing | 1.5 days | Get approved for TikTok API, test upload flow |
| Instagram Reels publishing testing | 1.5 days | Test via Facebook Graph API with real credentials |
| Wire up `POST /distribute` with fan-out logic | 1 day | Publish to all platforms in parallel, track per-platform status |
| Extend n8n workflow: → Distribute (fan-out) | 0.5 days | Add distribution nodes after approval |
| Platform-specific video formatting (aspect ratios) | 1.5 days | 16:9 for YouTube, 9:16 for TikTok/Reels |
| Thumbnail generation | 1 day | Auto-generate thumbnails from video frames or custom template |

**Estimated: 10 days**

---

## Phase 7: Hardening + Production Readiness — NOT STARTED

**Goal:** Make the system reliable, observable, and production-ready.

| Task | Timeline | Description |
|------|----------|-------------|
| Add more discovery sources (G2, Capterra, HN) | 3 days | Additional crawlers with deduplication |
| n8n error handling branches (retry nodes, fallbacks) | 2 days | Automatic retries, dead letter queue, error notifications |
| Playwright memory management (pool limits, cleanup) | 1.5 days | Max concurrent browsers, page recycling, OOM prevention |
| Structured logging (pino) across all services | 1.5 days | JSON logs, correlation IDs, log levels |
| Health check endpoints for all services | 0.5 days | `/health` on api, video-renderer, dashboard |
| Rate limiting (Redis-based) | 1 day | Protect API + respect external API rate limits |
| Monitoring & alerting (optional: Grafana + Prometheus) | 2 days | Metrics export, dashboards, alerts |
| CI/CD pipeline (GitHub Actions) | 1.5 days | Lint, type-check, build, test on PR; deploy on merge |
| Docker image optimization (multi-stage builds) | 1 day | Reduce image sizes, faster cold starts |
| Documentation — API docs, deployment guide | 1 day | OpenAPI spec, production deployment instructions |
| Security audit (env vars, CORS, auth) | 1 day | Ensure no secrets in code, proper CORS config |

**Estimated: 16 days**

---

## Summary Timeline

| Phase | Status | Days | Cumulative |
|-------|--------|------|------------|
| 1. Foundation | **Complete** | 0 remaining | — |
| 2. Discovery + Processing | Not started | 9 days | 9 days |
| 3. Intelligence | Not started | 8 days | 17 days |
| 4. Video Generation | Not started | 14 days | 31 days |
| 5. Dashboard | Scaffold only | 12 days | 43 days |
| 6. Distribution | Clients scaffolded | 10 days | 53 days |
| 7. Hardening | Not started | 16 days | **69 days** |

**Total remaining work: ~69 working days** (roughly 14 weeks at 5 days/week for a solo developer).

---

## Critical Path

The shortest path to a working end-to-end demo:

```
Phase 2 (discovery + processing)
  → Phase 3 (summarize + score)
    → Phase 4 (video render) ← longest phase, most creative work
      → Phase 6 (distribute to YouTube only)
```

This critical path is ~41 days. Dashboard (Phase 5) and hardening (Phase 7) can be parallelized or deferred for an MVP.

**Recommended MVP milestone (Week 6):** One product discovered → processed → summarized → scored → video rendered → manually approved → uploaded to YouTube. No dashboard needed — approve via n8n UI directly.
