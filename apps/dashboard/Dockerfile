FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json

FROM base AS deps
RUN pnpm install --filter @nuri/dashboard... --frozen-lockfile || pnpm install --filter @nuri/dashboard...

FROM deps AS dev
COPY . .
WORKDIR /app/apps/dashboard
CMD ["pnpm", "dev"]

FROM deps AS build
COPY . .
RUN pnpm --filter @nuri/dashboard build

FROM nginx:1.27-alpine AS prod
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/dashboard/dist /usr/share/nginx/html
