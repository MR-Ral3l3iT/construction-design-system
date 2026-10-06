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

## วิธี deploy — build บนเครื่อง dev แล้วส่งไฟล์ image ขึ้น server

ไม่ใช้ registry และไม่ build บน server

```
เครื่อง dev                          server
───────────                          ──────
./scripts/build-images.sh
  │ buildx --platform linux/amd64
  │ docker save | gzip
  ▼
images/backend-<tag>.tar.gz
images/frontend-<tag>.tar.gz   ──upload──►  /opt/cds/images/
images/manifest.txt                              │
                                                 ▼
                                         ./scripts/deploy.sh
                                           ├ load-images.sh  (docker load + ตั้ง IMAGE_TAG)
                                           ├ สำรอง DB
                                           ├ prisma migrate deploy
                                           ├ compose up -d
                                           └ รอ backend healthy
```

### ข้อควรระวังที่สำคัญที่สุด — architecture

เครื่อง dev เป็น **Apple Silicon (arm64)** ส่วน server เป็น **amd64**
ถ้า build โดยไม่ระบุ platform จะได้ image arm64 ซึ่ง **โหลดขึ้น server ได้แต่รันไม่ได้**
และ error ที่ได้คือ `exec format error` ซึ่งอ่านแล้วไม่รู้เลยว่าสาเหตุคืออะไร

`build-images.sh` จึงบังคับ `linux/amd64` เป็นค่าเริ่มต้น ตรวจ arch ของ image ที่ได้จริง
ก่อน save และ `load-images.sh` ตรวจซ้ำอีกครั้งบน server ก่อนโหลด

ถ้า server ไม่ใช่ amd64 ให้ระบุเอง

```bash
ssh user@server uname -m        # x86_64 = amd64, aarch64 = arm64
PLATFORM=linux/arm64 ./scripts/build-images.sh
```

### ขั้นตอนเต็ม

```bash
# ── บนเครื่อง dev ──────────────────────────────────────────────
# NEXT_PUBLIC_API_URL ถูกฝังเข้า bundle ตอน build ไม่ใช่ตอน run
# ใส่ผิดแล้ว frontend จะยิง API ไปผิดที่ และต้อง build ใหม่ทั้งรอบ
NEXT_PUBLIC_API_URL=https://your-domain.com/api ./scripts/build-images.sh

# upload (rsync ส่งเฉพาะส่วนต่าง ประหยัดกว่า scp เมื่อ deploy ซ้ำ)
rsync -avz --progress images/ user@server:/opt/cds/images/

# ── บน server ─────────────────────────────────────────────────
ssh user@server
cd /opt/cds
./scripts/deploy.sh
```

`deploy.sh` ทำครบตั้งแต่โหลด image จนรอ backend healthy ถ้า backend ไม่ healthy
ภายใน 5 นาที มันจะพิมพ์ log 50 บรรทัดล่าสุดแล้ว exit 1 ไม่ปล่อยให้เข้าใจผิดว่าสำเร็จ

| option                              | ใช้เมื่อ                           |
| ----------------------------------- | ---------------------------------- |
| `./scripts/deploy.sh`               | ปกติ                               |
| `./scripts/deploy.sh --skip-load`   | โหลด image ไว้แล้ว แค่อยาก restart |
| `./scripts/deploy.sh --skip-backup` | ข้ามการสำรอง DB (ไม่แนะนำ)         |

### ขนาดไฟล์ที่ต้อง upload

ประมาณ **400MB ต่อครั้ง** (backend ~300MB + frontend ~105MB หลัง gzip)

`rsync` ส่งเฉพาะส่วนต่าง แต่ไฟล์ `.tar.gz` เปลี่ยนชื่อตาม tag ทุกครั้ง จึงส่งใหม่ทั้งก้อนเสมอ
ถ้าอินเทอร์เน็ตช้าและ deploy บ่อย การเปิด ghcr package ให้ server `pull` เองจะประหยัดกว่ามาก
เพราะ docker จะดึงเฉพาะ layer ที่เปลี่ยน — เก็บไว้เป็นทางเลือกวันที่คุยกับเจ้าของ repo ได้

---

## สิ่งที่ต้องมีบน server

```
/opt/cds/
├── docker-compose.production.yml
├── .env                          ← ไม่อยู่ใน git สร้างจาก .env.production.example
├── docker/nginx/nginx.conf       ← nginx bind-mount ไฟล์นี้
├── docker/nginx/conf.d/cds.conf
├── scripts/load-images.sh
├── scripts/deploy.sh
├── images/                       ← ไฟล์ที่ upload มา
└── backups/
```

**ไม่ต้องมี `backend/`, `frontend/`, `packages/`, `node_modules/`, `pnpm-lock.yaml`**
compose ฝั่ง production ไม่มี `build:` อยู่แล้ว server จึง build ไม่ได้แม้จะอยากทำ

ของเดิมที่ `/opt/cds` มี source ครบทั้ง repo — เก็บกวาดได้หลังยืนยันว่าระบบใหม่รันได้

```bash
# ตรวจก่อนว่าไม่ได้ใช้อะไรอยู่จริง แล้วค่อยลบ
cd /opt/cds
docker compose -f docker-compose.production.yml ps     # ต้องขึ้นครบและ healthy ก่อน
rm -rf backend frontend packages node_modules pnpm-lock.yaml pnpm-workspace.yaml \
       package.json commitlint.config.js README.md docker-compose.yml.save
```

> `docker-compose.yml.save` คือไฟล์สำรองของ nano — มีคนแก้ compose บน server ด้วยมือ
> ควร `diff` กับของใน git ก่อนลบ เผื่อมีการแก้ที่ยังไม่ได้เอากลับเข้า repo

---

## Rollback

image เก่ายังอยู่บนเครื่องหลัง deploy (`docker image prune -f` ลบเฉพาะที่ไม่มีใครอ้างถึง)

```bash
docker images --filter 'reference=cds-*'      # ดู tag ที่มี
# แก้ IMAGE_TAG ใน .env ให้ชี้ tag เก่า แล้ว
docker compose -f docker-compose.production.yml up -d
```

ถ้า migration ทำข้อมูลเสียหาย ต้องกู้จาก dump ที่ `deploy.sh` สำรองไว้ก่อน migrate

```bash
cd /opt/cds && ls -lt backups/ | head
docker compose -f docker-compose.production.yml exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean < backups/db_<timestamp>.dump
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

# 2. ทดสอบ image จริง — build native เร็วกว่ามาก ใช้ดูว่าโค้ดทำงานไหม
docker compose --profile full build
docker compose --profile full up -d
# เปิด http://localhost:8088

# 3. ตรวจว่า production config ไม่มีรูรั่ว
IMAGE_TAG=dummy docker compose -f docker-compose.production.yml \
  --env-file .env.prod.local config
```

ข้อ 3 จะ fail ทันทีถ้า `.env` ขาดตัวแปรสำคัญ ใช้เช็คก่อนเอาขึ้น server ได้

> ข้อ 2 build เป็น arm64 (native) ซึ่งเร็ว ใช้ทดสอบว่าโค้ดทำงานถูก
> ส่วน image ที่จะส่งขึ้น server ต้องมาจาก `./scripts/build-images.sh` เท่านั้น
> เพราะมันบังคับ `linux/amd64` ให้ — สองอย่างนี้คนละตัวกัน อย่าสลับ

---

## สิ่งที่แก้ไปแล้วและทำไม

| ปัญหา                                        | อาการ                                                                                                                                                                                                              | แก้ยังไง                                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **backend image start ไม่ขึ้นเลย**           | `CMD node dist/src/main.js` แต่ `tsconfig.build.json` exclude `prisma/` กับ `scripts/` ออก TypeScript จึงมอง rootDir เป็น `src` ผลลัพธ์จริงคือ `dist/main.js` — container crash ทันทีด้วย `Cannot find module`     | แก้ CMD เป็น `dist/main.js`                                                                                                                      |
| **frontend image start ไม่ขึ้นเลย**          | `outputFileTracingRoot` ตั้งเป็น `'../../'` ซึ่งชี้เหนือ repo ไปอีกชั้น ใน Docker กลายเป็น `/` ทำให้ standalone คัดโครงสร้าง path เต็มมา (`server.js` ไปอยู่ `/app/app/frontend/`) และลาก `/proc` `/usr` ติดมาด้วย | แก้เป็น `'../'` (= root ของ workspace) และปรับ COPY/CMD ใน Dockerfile ให้ตรง — image เล็กลง 412MB → 314MB                                        |
| compose ไม่มี `image:`                       | CI สร้างและ push image ขึ้น ghcr ทุกครั้งแต่ไม่มีใครดึงไปใช้ server จึง build เองเสมอ ทำให้ต้องเก็บ source + `node_modules` ไว้บนเครื่อง production                                                                | แยก `docker-compose.production.yml` ที่อ้าง `cds-backend:${IMAGE_TAG}` ซึ่งมาจาก `docker load` และไม่มี `build:` เลย                             |
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
