FROM node:20-slim

RUN npx playwright install-deps chromium && \
    npx playwright install chromium

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/storage/package.json packages/storage/
COPY packages/browser/package.json packages/browser/
COPY packages/llm/package.json packages/llm/
COPY apps/api/package.json apps/api/

RUN corepack enable && pnpm install --frozen-lockfile || pnpm install

COPY packages/ packages/
COPY apps/api/ apps/api/
COPY tsconfig.base.json turbo.json ./

RUN pnpm turbo build --filter=@repo/api

EXPOSE 3001
CMD ["pnpm", "--filter", "@repo/api", "dev"]
