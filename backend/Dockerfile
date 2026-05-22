# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@9

# Copy workspace manifests
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY backend/package.json ./backend/

RUN pnpm install --frozen-lockfile --filter @construction/backend...

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/backend/node_modules ./backend/node_modules

COPY pnpm-workspace.yaml package.json ./
COPY backend/ ./backend/

WORKDIR /app/backend
RUN pnpm run build
RUN pnpm prisma generate

# ─── Stage 3: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nestjs

RUN npm install -g pnpm@9

# Only production deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY backend/package.json ./backend/

RUN pnpm install --frozen-lockfile --filter @construction/backend... --prod

COPY --from=builder /app/backend/dist    ./backend/dist
COPY --from=builder /app/backend/prisma  ./backend/prisma
COPY --from=builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma

WORKDIR /app/backend

USER nestjs

EXPOSE 3001

CMD ["node", "dist/main"]
