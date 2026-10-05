FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/admin/package.json apps/admin/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json

FROM base AS deps
RUN pnpm install --filter @nuri/admin... --frozen-lockfile || pnpm install --filter @nuri/admin...

FROM deps AS dev
COPY . .
WORKDIR /app/apps/admin
CMD ["pnpm", "dev"]

FROM deps AS build
COPY . .
RUN pnpm --filter @nuri/admin build

FROM nginx:1.27-alpine AS prod
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
