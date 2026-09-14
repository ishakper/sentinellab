# SentinelLab Documentation

## Architecture
- **Web Dashboard**: Next.js 15 (App Router) with React, Tailwind CSS, shadcn/ui
- **API Server**: NestJS with TypeORM, WebSocket Gateway
- **Android Agent**: Kotlin with Jetpack Compose, Android Keystore
- **Lab Simulator**: Containerized mock targets for security testing

## Security Model
All capabilities operate under: **Explicit Consent, Strong Authorization, Full Auditability, Least Privilege**.

## Quick Start
```bash
# Install dependencies
pnpm install

# Start infrastructure
docker compose up -d postgres redis

# Run migrations
pnpm db:migrate

# Seed data
pnpm db:seed

# Start development
pnpm dev
```

## API Documentation
See [API docs](./api.md) for endpoint reference.

## Deployment
See [Deployment runbook](./deployment.md) for production setup.
