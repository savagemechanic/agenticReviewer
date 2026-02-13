FROM node:20-slim

RUN apt-get update && apt-get install -y chromium && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/storage/package.json packages/storage/
COPY apps/video-renderer/package.json apps/video-renderer/

RUN corepack enable && pnpm install --frozen-lockfile || pnpm install

COPY packages/ packages/
COPY apps/video-renderer/ apps/video-renderer/
COPY tsconfig.base.json ./

EXPOSE 3002
CMD ["pnpm", "--filter", "@repo/video-renderer", "dev"]
