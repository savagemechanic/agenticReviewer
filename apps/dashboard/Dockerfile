FROM node:20-slim AS base

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/dashboard/package.json apps/dashboard/

RUN corepack enable && pnpm install --frozen-lockfile || pnpm install

COPY apps/dashboard/ apps/dashboard/
COPY packages/ packages/
COPY tsconfig.base.json turbo.json ./

RUN pnpm --filter @repo/dashboard build

FROM node:20-slim AS runner
WORKDIR /app
COPY --from=base /app/apps/dashboard/.next/standalone ./
COPY --from=base /app/apps/dashboard/.next/static ./.next/static
COPY --from=base /app/apps/dashboard/public ./public

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
