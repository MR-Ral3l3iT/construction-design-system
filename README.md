# Construction Design System

ระบบบริหารงานออกแบบและก่อสร้าง สำหรับบริษัทออกแบบและก่อสร้าง

## Portals

| Portal        | URL       | กลุ่มผู้ใช้                           |
| ------------- | --------- | ------------------------------------- |
| Admin Portal  | `/admin`  | ทีมบริษัท (Admin, Designer, PM, etc.) |
| Client Portal | `/client` | ลูกค้า                                |
| Site Portal   | `/site`   | ทีมหน้างาน (mobile-first)             |

## Tech Stack

- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **Backend:** NestJS + TypeScript + Prisma
- **Database:** PostgreSQL
- **Storage:** MinIO (local) / Cloudflare R2 (production)
- **Deployment:** Docker + Nginx

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- Docker + Docker Compose

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development (Docker services + backend + frontend)
docker compose up -d       # PostgreSQL + MinIO
pnpm dev                   # All packages in parallel
```

## Project Structure

```
construction-design-system/
├── backend/          NestJS API
├── frontend/         Next.js App
├── packages/
│   ├── ui/           Shared UI components
│   ├── types/        Shared TypeScript types
│   └── config/       Shared ESLint & tsconfig
└── docker/           Nginx, Postgres configs
```

## Commit Convention

ใช้ [Conventional Commits](https://www.conventionalcommits.org/)

```
feat: เพิ่มฟีเจอร์ใหม่
fix: แก้ bug
docs: แก้เอกสาร
chore: งาน build / dependencies
```
