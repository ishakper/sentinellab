FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/crypto-core/package.json ./packages/crypto-core/
COPY packages/validation/package.json ./packages/validation/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --filter api... || pnpm install --filter api...

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app .
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY tsconfig.json ./
RUN pnpm run build --filter @sentinel/shared-types --filter @sentinel/crypto-core --filter @sentinel/validation
RUN pnpm run build --filter api

# Production
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat dumb-init
RUN addgroup --system --gid 1001 sentinel && \
    adduser --system --uid 1001 sentinel
WORKDIR /app
COPY --from=builder --chown=sentinel:sentinel /app/apps/api/dist ./dist
COPY --from=builder --chown=sentinel:sentinel /app/node_modules ./node_modules
COPY --from=builder --chown=sentinel:sentinel /app/apps/api/package.json ./
USER sentinel
EXPOSE 3001 3002
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
