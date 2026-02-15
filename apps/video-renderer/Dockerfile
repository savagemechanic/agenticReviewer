FROM node:20-alpine

RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json turbo.json ./
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/storage/package.json packages/storage/
COPY apps/video-renderer/package.json apps/video-renderer/

RUN corepack enable && pnpm install --frozen-lockfile || pnpm install

COPY packages/ packages/
COPY apps/video-renderer/ apps/video-renderer/

RUN pnpm turbo build --filter=@repo/video-renderer

EXPOSE 3002
CMD ["pnpm", "--filter", "@repo/video-renderer", "exec", "tsx", "src/index.ts"]
