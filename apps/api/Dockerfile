FROM node:20-alpine

RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont && \
    npx playwright install chromium

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json turbo.json ./
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/storage/package.json packages/storage/
COPY packages/browser/package.json packages/browser/
COPY packages/llm/package.json packages/llm/
COPY packages/distribution/package.json packages/distribution/
COPY apps/api/package.json apps/api/

RUN corepack enable && pnpm install --frozen-lockfile || pnpm install

COPY packages/ packages/
COPY apps/api/ apps/api/

RUN pnpm turbo build --filter=@repo/api

ENV CHROMIUM_PATH=/usr/bin/chromium-browser
EXPOSE 3001
CMD ["pnpm", "--filter", "@repo/api", "exec", "tsx", "src/index.ts"]
