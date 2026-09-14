FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/validation/package.json ./packages/validation/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --filter web... || pnpm install --filter web...

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app .
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
COPY tsconfig.json ./
RUN pnpm run build --filter @sentinel/shared-types --filter @sentinel/validation
RUN pnpm run build --filter web

# Production
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat dumb-init
RUN addgroup --system --gid 1001 sentinel && \
    adduser --system --uid 1001 sentinel
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder --chown=sentinel:sentinel /app/apps/web/.next/standalone ./
COPY --from=builder --chown=sentinel:sentinel /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=sentinel:sentinel /app/apps/web/public ./apps/web/public
USER sentinel
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/web/server.js"]
