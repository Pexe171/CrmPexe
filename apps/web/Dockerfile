# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter=crmpexe-web...

FROM deps AS build
COPY . .
RUN pnpm --filter=crmpexe-web build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable \
  && npm install -g serve@14.2.4
ENV NODE_ENV=production

COPY --from=build /app/apps/web/dist ./dist
COPY --from=build /app/apps/web/package.json ./package.json

EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
