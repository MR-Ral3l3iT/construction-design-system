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

# COPY ยกสิทธิ์ของไฟล์ต้นทางมาด้วย — ถ้า repo บนเครื่อง dev มีไฟล์ 600/700
# (เกิดง่ายมากเมื่อก๊อป repo ข้าม filesystem ที่ไม่เก็บ POSIX permission)
# user nestjs จะอ่าน package.json และ prisma/migrations ไม่ได้ แล้ว
# prisma migrate deploy จะล้มด้วย EACCES ซึ่งอ่าน error แล้วไม่รู้ว่าเกิดจากอะไร
#
# normalize ทุกอย่างที่ copy มาจาก host (ไม่แตะ node_modules ซึ่ง pnpm สร้างใน
# image เองและสิทธิ์ถูกอยู่แล้ว) a+rX = ให้ทุกคนอ่านได้ ส่วน execute เพิ่มเฉพาะ
# โฟลเดอร์กับไฟล์ที่เดิมเป็น executable อยู่แล้ว
RUN chmod -R a+rX \
      /app/backend \
      /app/packages \
      /app/package.json \
      /app/pnpm-workspace.yaml \
      /app/pnpm-lock.yaml

# Generate Prisma Client inside the production image against production dependencies.
RUN pnpm dlx prisma@5.22.0 generate --schema=./backend/prisma/schema.prisma

# dlx ด้านบนดึง prisma CLI มาไว้ใน image แล้ว — ทำ wrapper ให้เรียกได้ตรง ๆ
# จะได้ไม่ต้องใช้ npx ตอน deploy ซึ่งต้องมี HOME ที่เขียนได้ (user nestjs มี
# HOME=/nonexistent) และต้องต่อ npm registry ทุกครั้งที่ deploy
RUN PRISMA_CLI="$(find /app/node_modules/.pnpm -maxdepth 6 -path '*prisma@5.22.0*/prisma/build/index.js' | head -1)" \
 && test -n "$PRISMA_CLI" \
 && printf '#!/bin/sh\nexec node %s "$@"\n' "$PRISMA_CLI" > /usr/local/bin/prisma \
 && chmod 755 /usr/local/bin/prisma \
 && prisma --version

# Writable upload directory for the non-root NestJS user.
RUN mkdir -p /app/backend/uploads \
 && chown -R nestjs:nodejs /app/backend/uploads

WORKDIR /app/backend

USER nestjs

EXPOSE 3001

# tsconfig.build.json exclude prisma/ กับ scripts/ ออก TypeScript จึงมอง rootDir เป็น src
# ผลลัพธ์คือ dist/main.js ไม่ใช่ dist/src/main.js — path เดิมทำให้ container start ไม่ขึ้นเลย
CMD ["node", "dist/main.js"]
