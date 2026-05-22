# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10

# Copy workspace manifests
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY backend/package.json ./backend/

RUN pnpm install --frozen-lockfile --filter @construction/backend...

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/backend/node_modules ./backend/node_modules

COPY pnpm-workspace.yaml package.json ./
COPY backend/ ./backend/

WORKDIR /app/backend

# Prisma Client must be generated before Nest build, otherwise Prisma enum/model types are missing.
RUN pnpm prisma generate --schema=./prisma/schema.prisma
RUN pnpm run build

# ─── Stage 3: Production image ────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nestjs

RUN npm install -g pnpm@10

# Only production deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY backend/package.json ./backend/

RUN pnpm install --frozen-lockfile --filter @construction/backend... --prod --ignore-scripts

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma

# Generate Prisma Client inside the production image against production dependencies.
RUN pnpm dlx prisma@5.22.0 generate --schema=./backend/prisma/schema.prisma

# Writable upload directory for the non-root NestJS user.
RUN mkdir -p /app/backend/uploads \
 && chown -R nestjs:nodejs /app/backend/uploads

WORKDIR /app/backend

USER nestjs

EXPOSE 3001

CMD ["node", "dist/src/main.js"]
