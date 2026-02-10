# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl \
  && corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter=crmpexe-api prisma:generate
RUN pnpm --filter=crmpexe-api build
RUN pnpm deploy --filter=crmpexe-api --prod /prod/api

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl \
  && corepack enable \
  && npm install -g prisma@5.20.0
ENV NODE_ENV=production

COPY --from=build /prod/api ./
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
