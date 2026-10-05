FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json

FROM base AS deps
RUN pnpm install --filter @nuri/api... --frozen-lockfile || pnpm install --filter @nuri/api...

FROM deps AS dev
COPY . .
RUN pnpm --filter @nuri/shared build
WORKDIR /app/apps/api
CMD ["pnpm", "dev"]

FROM deps AS build
COPY . .
RUN pnpm --filter @nuri/shared build && pnpm --filter @nuri/api build

FROM node:22-bookworm-slim AS prod
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && useradd -m nuri
COPY --from=build /app /app
USER nuri
WORKDIR /app/apps/api
CMD ["sh", "-c", "pnpm db:migrate && node dist/main.js"]
