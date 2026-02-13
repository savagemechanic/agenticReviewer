# Agentic Reviewer

Autonomous B2B product review platform that discovers SaaS products, reviews them via browser automation, generates AI-powered video reviews, and publishes to YouTube, TikTok, and Instagram.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│   n8n        │────▶│   API        │────▶│  Video Renderer  │
│  Orchestrator│     │  (Hono)      │     │  (Remotion)      │
│  :5678       │     │  :3001       │     │  :3002           │
└──────┬───────┘     └──────┬───────┘     └──────────────────┘
       │                    │
       │              ┌─────┴─────┐
       │              │           │
  ┌────▼────┐   ┌─────▼───┐  ┌───▼────┐
  │PostgreSQL│   │  MinIO   │  │ Redis  │
  │  :5432   │   │  :9000   │  │ :6379  │
  └──────────┘   └──────────┘  └────────┘
```

**Pipeline:** Discover → Process (Playwright) → Summarize (Claude) → Score → Render Video → Human Approval → Publish

## Stack

- **Monorepo:** TypeScript Turborepo with pnpm workspaces
- **Orchestration:** n8n (visual workflow editor)
- **API:** Hono (lightweight, fast)
- **Browser Automation:** Playwright (screenshots, extraction, timing)
- **AI:** Claude API (summaries + scoring)
- **Video:** Remotion (programmatic video generation)
- **Database:** PostgreSQL + Drizzle ORM
- **Storage:** MinIO (S3-compatible object storage)
- **Dashboard:** Next.js + Tailwind + shadcn/ui

## Project Structure

```
agenticReviewer/
├── apps/
│   ├── api/                # Hono HTTP API (port 3001)
│   ├── dashboard/          # Next.js admin UI (port 3000)
│   └── video-renderer/     # Remotion render server (port 3002)
├── packages/
│   ├── db/                 # Drizzle ORM schema + migrations
│   ├── shared/             # Types, constants, utils
│   ├── storage/            # MinIO/S3 wrapper
│   ├── browser/            # Playwright pool + actions
│   ├── llm/                # Claude/OpenAI abstraction
│   └── distribution/       # YouTube, TikTok, Instagram upload clients
└── docker-compose.yml      # Full stack (7 containers)
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Setup

```bash
# Clone and install
git clone https://github.com/your-org/agenticReviewer.git
cd agenticReviewer
cp .env.example .env
pnpm install

# Start infrastructure
docker compose up -d postgres redis minio n8n

# Run database migrations
pnpm db:push

# Start development servers
pnpm dev
```

### Docker (full stack)

```bash
docker compose up -d
```

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3000 |
| API | http://localhost:3001 |
| n8n Workflow Editor | http://localhost:5678 |
| MinIO Console | http://localhost:9001 |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/discover` | Run discovery crawlers, return new product IDs |
| `POST` | `/process` | Playwright: screenshots, text extraction, timing |
| `POST` | `/summarize` | Generate LLM summary for a product |
| `POST` | `/score` | Score a product (UX, performance, features, value) |
| `POST` | `/video/render` | Trigger Remotion video render |
| `POST` | `/distribute` | Publish to YouTube/TikTok/Instagram |
| `GET` | `/products` | List all products |
| `GET` | `/products/:id` | Product details with screenshots, summary, scores |

## n8n Workflow

The main pipeline runs as a visual n8n workflow:

```
Cron (every 6h) → Discover → Split In Batches →
  Process → Summarize → Score → Render Video →
    Wait for Approval → Distribute
```

Access the n8n editor at `http://localhost:5678` (default credentials: admin/admin).

## Environment Variables

See [`.env.example`](.env.example) for all required variables. Key ones:

- `DATABASE_URL` — PostgreSQL connection string
- `ANTHROPIC_API_KEY` — Claude API key for summaries and scoring
- `YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN` — YouTube Data API v3
- `MINIO_ACCESS_KEY/SECRET_KEY` — MinIO credentials

## Human-in-the-Loop

Videos require manual approval before publishing. The workflow pauses at the approval step — review and approve videos in the dashboard or directly in n8n.

## License

[MIT](LICENSE)
