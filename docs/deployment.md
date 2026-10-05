# Deployment Runbook

ระบบนี้ deploy ด้วย Docker Compose บน server เดียว โดยมี nginx เป็นทางเข้าเดียวจากภายนอก

## ไฟล์ compose สองตัว ใช้คนละที่

| ไฟล์                            | ใช้ที่ไหน   | ลักษณะ                                                          |
| ------------------------------- | ----------- | --------------------------------------------------------------- |
| `docker-compose.yml`            | เครื่อง dev | เปิดพอร์ตทุกตัวให้เข้าถึงง่าย มีค่า default ให้รันได้ทันที      |
| `docker-compose.production.yml` | server      | เปิดเฉพาะ nginx ไม่มี default รหัสผ่าน ขาดตัวแปรแล้ว fail ทันที |

**บน server ใช้ `docker-compose.production.yml` เท่านั้น** ทุกคำสั่งต้องมี `-f docker-compose.production.yml`

```bash
alias cds='docker compose -f docker-compose.production.yml'
```

---

## สองโหมด: registry กับ build

### โหมด registry (เป้าหมาย)

CI สร้าง image แล้ว push ขึ้น `ghcr.io` ทุกครั้งที่ merge เข้า `main` อยู่แล้ว
server แค่ `pull` ลงมาใช้ — ไม่ต้องมี source code บนเครื่อง ไม่ต้อง build

```bash
cds pull && cds up -d
```

**ข้อดี** — deploy เร็ว, ไม่กิน RAM บน server ตอน build, rollback ได้ด้วยการเปลี่ยน `IMAGE_TAG`

**ติดตรงไหน** — package บน ghcr ยังเป็น private ตาม default
เจ้าของ repo ต้องเลือกทางใดทางหนึ่ง:

- **ทำ package เป็น public** — GitHub → repo → Packages → เลือก package → Package settings →
  Change visibility → Public ทำครั้งเดียว จบ server ไม่ต้อง `docker login` เลย
  (repo นี้เป็น public อยู่แล้ว การเปิด package จึงไม่ได้เปิดเผยอะไรเพิ่ม)
- **คง package เป็น private** — สร้าง PAT สิทธิ์ `read:packages` แล้วบน server รัน
  `docker login ghcr.io -u <user> --password-stdin` ครั้งเดียว credential จะอยู่ใน
  `~/.docker/config.json` ถาวร

### โหมด build (ที่ใช้อยู่ตอนนี้)

server มี source code แล้ว build เอง

```bash
cds build && cds up -d
```

**ข้อควรระวัง** — Next.js build ใช้ RAM 2–4GB ถ้า RAM บน server ไม่พอ
OOM killer อาจฆ่า Postgres หรือ backend ที่กำลังให้บริการอยู่ ควร build ช่วงคนใช้น้อย
และเช็ค `free -h` ก่อน

---

## สิ่งที่ต้องมีบน server

### โหมด registry

```
/opt/cds/
├── docker-compose.production.yml
├── .env                          ← ไม่อยู่ใน git สร้างจาก .env.production.example
├── docker/nginx/nginx.conf       ← nginx bind-mount ไฟล์นี้
├── docker/nginx/conf.d/cds.conf
└── backups/
```

ไม่ต้องมี `backend/`, `frontend/`, `packages/`, `node_modules/` เลย

### โหมด build

ต้องมี source ทั้ง repo เพิ่มจากข้างบน

---

## ขั้นตอน deploy

ปกติใช้ GitHub Actions → Deploy to Production → เลือก `mode` แล้วพิมพ์ `deploy`
workflow จะทำตามลำดับนี้ให้ ถ้าต้องทำมือก็ทำตามนี้

```bash
cd /opt/cds

# 1. สำรองฐานข้อมูลก่อนเสมอ
cds --profile backup run --rm backup

# 2. เอา image ใหม่มา
cds pull          # โหมด registry
# cds build       # โหมด build

# 3. migrate — pin เวอร์ชัน prisma ให้ตรงกับ schema
#    npx prisma เฉย ๆ จะดึง major ล่าสุด (ตอนนี้ 8.x) ซึ่งใช้กับ schema v5 ไม่ได้
cds run --rm --no-deps -T backend \
  sh -c "cd /app/backend && npx --yes prisma@5.22.0 migrate deploy"

# 4. สตาร์ท
cds up -d --remove-orphans

# 5. ตรวจ
docker inspect -f '{{.State.Health.Status}}' cds-backend   # ต้องได้ healthy
cds logs --tail=50 backend
```

## Rollback

ได้เฉพาะโหมด registry เพราะ image ถูก tag ด้วย commit SHA ไว้

```bash
# ดู tag ที่มีได้ที่หน้า Packages ของ repo
IMAGE_TAG=<commit-sha-ที่ดี> cds pull
IMAGE_TAG=<commit-sha-ที่ดี> cds up -d
```

ถ้า migration ทำข้อมูลเสียหาย ต้องกู้จาก dump

```bash
cds exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean < backups/db_<timestamp>.dump
```

---

## ทำไม production ไม่เปิดพอร์ต

nginx คุยกับทุก service ผ่าน docker network ด้วยชื่อ service (`http://backend:3001`,
`http://frontend:3000`, `http://minio:9000`) **ไม่ได้ผ่านพอร์ตที่ publish ออก host**
การ publish พอร์ตจึงไม่จำเป็นและมีแต่ความเสี่ยง

| service  | dev         | production           | เหตุผล                                     |
| -------- | ----------- | -------------------- | ------------------------------------------ |
| nginx    | 8088 / 8443 | **80 / 443**         | ทางเข้าเดียวจากภายนอก                      |
| backend  | 3004        | ไม่เปิด              | เข้าตรงได้ = ข้าม TLS และ header ของ nginx |
| frontend | 3003        | ไม่เปิด              | เหมือนกัน                                  |
| postgres | 5433        | `127.0.0.1` เท่านั้น | เข้าผ่าน SSH tunnel                        |
| minio    | 9000 / 9001 | `127.0.0.1` เท่านั้น | console บริหารไฟล์ ไม่ควรเปิด public       |

เข้า Postgres หรือ MinIO console จากเครื่องตัวเองด้วย SSH tunnel

```bash
ssh -L 5433:127.0.0.1:5433 -L 9001:127.0.0.1:9001 user@server
```

แล้วเปิด `localhost:9001` หรือต่อ DB ที่ `localhost:5433`

---

## ทดสอบที่เครื่องตัวเองก่อน deploy

```bash
# 1. วน dev — infra ใน docker ส่วน app รันบน host
docker compose up -d postgres minio
pnpm --filter @construction/backend exec prisma db push
pnpm --filter @construction/backend exec prisma db seed
pnpm dev

# 2. ทดสอบ image จริง
docker compose --profile full build
docker compose --profile full up -d
# เปิด http://localhost:8088

# 3. ตรวจว่า production config ไม่มีรูรั่ว
docker compose -f docker-compose.production.yml --env-file .env.prod.local config
```

ข้อ 3 จะ fail ทันทีถ้า `.env` ขาดตัวแปรสำคัญ ใช้เช็คก่อนเอาขึ้น server ได้

---

## สิ่งที่แก้ไปแล้วและทำไม

| ปัญหา                                        | อาการ                                                                                                                                                                                                              | แก้ยังไง                                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **backend image start ไม่ขึ้นเลย**           | `CMD node dist/src/main.js` แต่ `tsconfig.build.json` exclude `prisma/` กับ `scripts/` ออก TypeScript จึงมอง rootDir เป็น `src` ผลลัพธ์จริงคือ `dist/main.js` — container crash ทันทีด้วย `Cannot find module`     | แก้ CMD เป็น `dist/main.js`                                                                                                                      |
| **frontend image start ไม่ขึ้นเลย**          | `outputFileTracingRoot` ตั้งเป็น `'../../'` ซึ่งชี้เหนือ repo ไปอีกชั้น ใน Docker กลายเป็น `/` ทำให้ standalone คัดโครงสร้าง path เต็มมา (`server.js` ไปอยู่ `/app/app/frontend/`) และลาก `/proc` `/usr` ติดมาด้วย | แก้เป็น `'../'` (= root ของ workspace) และปรับ COPY/CMD ใน Dockerfile ให้ตรง — image เล็กลง 412MB → 314MB                                        |
| compose ไม่มี `image:`                       | CI สร้างและ push image ขึ้น ghcr ทุกครั้ง แต่ไม่มีใครดึงไปใช้ server จึง build เองเสมอ                                                                                                                             | ใส่ `image:` คู่กับ `build:` ใช้ได้ทั้งสองโหมด                                                                                                   |
| healthcheck ใช้ `wget`                       | `node:20-bookworm-slim` ไม่มีทั้ง `wget` และ `curl` healthcheck จึง fail ตลอด backend ขึ้น `unhealthy` ถาวร และ `depends_on: service_healthy` ค้างรอไม่จบ                                                          | ใช้ `fetch` ของ Node แทน                                                                                                                         |
| nginx `${DOMAIN}` ไม่ถูกแทนค่า               | nginx ไม่แทนค่า env ในไฟล์ config ที่ mount เข้า `conf.d/` โดยตรง `server_name ${DOMAIN};` จึงค้างเป็นข้อความดิบและไม่ match โดเมนจริง                                                                             | mount เป็น `templates/cds.conf.template` ให้ entrypoint envsubst ให้ พร้อม `NGINX_ENVSUBST_FILTER` กันไปทับ `$host` `$request_uri` ของ nginx เอง |
| `npx prisma migrate deploy` ไม่ pin เวอร์ชัน | ดึง prisma major ล่าสุด (8.x) มาใช้กับ schema v5                                                                                                                                                                   | pin `prisma@5.22.0`                                                                                                                              |
| fallback รหัสผ่าน default                    | `.env` ขาดตัวแปรแล้วใช้ `postgres` / `minioadmin` เงียบ ๆ                                                                                                                                                          | `${VAR:?ข้อความ}` ให้ fail ทันที                                                                                                                 |
| log ไม่จำกัดขนาด                             | log โตจนดิสก์เต็มแล้วทั้งเครื่องล่ม                                                                                                                                                                                | จำกัด 10MB × 5 ไฟล์ ต่อ service                                                                                                                  |

### ผลทดสอบหลังแก้

| รายการ                                | ผล                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------- |
| `docker compose --profile full build` | สำเร็จทั้งสอง image                                                    |
| backend container                     | boot ขึ้น Nest ครบทุก module                                           |
| backend healthcheck                   | `healthy` (ก่อนแก้: `unhealthy` ถาวร)                                  |
| frontend container                    | เสิร์ฟได้ `GET /` → 307 redirect ไป login ตามที่ควร                    |
| `docker-compose.production.yml`       | config ผ่าน เปิดเฉพาะ nginx 80/443 ที่เหลือปิดหรือ `127.0.0.1`         |
| ขาดตัวแปรใน `.env`                    | fail ทันทีพร้อมข้อความบอกว่าขาดตัวไหน                                  |
| nginx envsubst                        | `${DOMAIN}` ถูกแทนค่า ส่วน `$host` `$request_uri` ของ nginx ยังอยู่ครบ |

> ไม่ได้ทดสอบ MinIO เพราะ Docker Hub ปฏิเสธการดึง `minio/minio` จากเครื่องที่ทดสอบ
> (ข้อจำกัดของเครื่อง ไม่เกี่ยวกับ config) — service นี้ไม่ได้ถูกแก้อะไร
