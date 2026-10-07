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
NEXT_PUBLIC_API_URL=https://your-domain.com ./scripts/build-images.sh

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

## สถาปัตยกรรมบน server — มี nginx-gateway อยู่ข้างหน้า

`cds-nginx` **ไม่ได้รับทราฟฟิกจากอินเทอร์เน็ตโดยตรง** server เครื่องนี้โฮสต์หลายเว็บ
จึงมี `nginx-gateway` ถือพอร์ต 80/443 ให้ทุกโดเมน และเป็นคน terminate TLS

```
Cloudflare (Full strict)
      │ https
      ▼
nginx-gateway :443        ← ใบรับรอง Let's Encrypt, config ที่ /srv/deploy/nginx/conf.d/
      │ http → 172.18.0.1:8088
      ▼
cds-nginx :80             ← routing ของแอป (/api, /storage, rate limit)
      ├──► frontend:3000
      ├──► backend:3001
      └──► minio:9000
```

ผลที่ตามมา

- `docker/nginx/conf.d/cds.conf` รับแค่ HTTP ไม่มี `ssl_certificate` และ**ไม่ redirect ไป https**
  (ถ้า redirect จะวนลูปเมื่อ Cloudflare อยู่โหมด Flexible)
- `NGINX_PORT` / `NGINX_SSL_PORT` ใน `.env` คือพอร์ตที่ gateway proxy เข้ามา ไม่ใช่ 80/443
- ใบรับรองอยู่ฝั่ง gateway ไม่ใช่ใน volume `cds-letsencrypt`

### vhost ฝั่ง gateway

ไฟล์อยู่ที่ `/srv/deploy/nginx/conf.d/<domain>.conf` บน server (ไม่ได้อยู่ใน repo นี้
เพราะเป็นของกลางที่ใช้ร่วมกับโปรเจกต์อื่น) หน้าตาแบบนี้

```nginx
server {
    listen 80;
    server_name inspect.uat-arch.com;

    # ต้องมาก่อน location / เสมอ ไม่งั้น certbot ต่ออายุไม่ได้
    location /.well-known/acme-challenge/ { root /var/www/certbot; }

    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    http2 on;
    server_name inspect.uat-arch.com;

    ssl_certificate     /etc/letsencrypt/live/inspect.uat-arch.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/inspect.uat-arch.com/privkey.pem;

    client_max_body_size 60M;        # ต้องไม่น้อยกว่าที่ cds.conf ตั้งไว้

    location / {
        proxy_pass http://172.18.0.1:8088;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 120s;       # เผื่อ generate PDF
    }
}
```

**ใช้ `172.18.0.1:8088` ไม่ใช่ `cds-nginx:80`** — gateway อยู่ docker network คนละวงกับ
`cds-nginx` การใช้ชื่อ container ต้องสั่ง `docker network connect` ซึ่งหายทุกครั้งที่
container ถูกสร้างใหม่ ส่วน `172.18.0.1` คือ host เห็นได้เสมอ และเป็นรูปแบบที่ vhost
อื่นบนเครื่องนี้ใช้อยู่แล้ว

### certbot บนเครื่องนี้

ใช้ `certbot.timer` ของ systemd บน host และต้องใช้ **`--webroot` เท่านั้น**

```bash
certbot certonly --webroot -w /srv/deploy/nginx/certbot \
  -d <domain> --agree-tos --no-eff-email --non-interactive
```

`--standalone` ใช้ไม่ได้เพราะ certbot จะพยายามเปิด web server ที่พอร์ต 80 เอง
แต่ `nginx-gateway` ถือพอร์ตนั้นอยู่ → `Could not bind TCP port 80`

ใบที่ครอบหลายโดเมนอยู่แล้ว ถ้าจะเปลี่ยน authenticator ให้ใช้
`certbot renew --cert-name <name> --webroot -w /srv/deploy/nginx/certbot` แทน
`certonly -d` เพราะ renew จะใช้รายชื่อโดเมนเดิมครบทุกชื่อ

certbot อยู่บน host ส่วน nginx อยู่ใน container จึงมี deploy hook
`/etc/letsencrypt/renewal-hooks/deploy/reload-nginx-gateway.sh` สั่ง reload gateway
หลังต่ออายุ ถ้าไม่มี hook นี้ nginx จะเสิร์ฟใบเก่าไปจนกว่าจะมีคน reload

> 2026-10-07 พบสองโดเมนของโปรเจกต์อื่นตั้ง `authenticator = standalone` จนใบหมดอายุ
> แก้แล้ว — ดู [problems/2026-10-07-ssl-certificate-expiry.md](./problems/2026-10-07-ssl-certificate-expiry.md)
> ตรวจซ้ำได้ด้วย `grep -l standalone /etc/letsencrypt/renewal/*.conf`

### Cloudflare

zone ตั้งเป็น **Full (strict)** — เข้ารหัสตลอดเส้นทางและตรวจใบรับรองที่ origin จริง

อย่าใช้ **Flexible** เพราะช่วง Cloudflare→server จะเป็น HTTP ธรรมดา และ vhost ที่
`return 301 https://` ในบล็อกพอร์ต 80 จะวนลูปไม่รู้จบ

SSL mode เป็นค่าระดับ zone — เปลี่ยนแล้วกระทบทุกโดเมนใน zone นั้นพร้อมกัน
ก่อนสลับต้องตรวจว่าทุกโดเมนใน zone เสิร์ฟ 443 ได้จริง

```bash
curl -skI --resolve <domain>:443:127.0.0.1 https://<domain>/ | head -3
```

---

## ทำไม production ไม่เปิดพอร์ต

nginx คุยกับทุก service ผ่าน docker network ด้วยชื่อ service (`http://backend:3001`,
`http://frontend:3000`, `http://minio:9000`) **ไม่ได้ผ่านพอร์ตที่ publish ออก host**
การ publish พอร์ตจึงไม่จำเป็นและมีแต่ความเสี่ยง

| service   | dev         | production           | เหตุผล                                        |
| --------- | ----------- | -------------------- | --------------------------------------------- |
| cds-nginx | 8088 / 8443 | **8088**             | รับจาก nginx-gateway เท่านั้น ไม่ใช่จากภายนอก |
| backend   | 3004        | ไม่เปิด              | เข้าตรงได้ = ข้าม TLS และ header ของ nginx    |
| frontend  | 3003        | ไม่เปิด              | เหมือนกัน                                     |
| postgres  | 5433        | `127.0.0.1` เท่านั้น | เข้าผ่าน SSH tunnel                           |
| minio     | 9000 / 9001 | `127.0.0.1` เท่านั้น | console บริหารไฟล์ ไม่ควรเปิด public          |

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

## ความปลอดภัยของ secret

`.gitignore` ignore `.env.*` ทั้งหมดแล้วปล่อยเฉพาะ `*.example` กลับมา — ของเดิมไล่ชื่อทีละไฟล์
ทำให้ `.env.production` ไม่ถูก ignore และโผล่ใน `git status` พร้อมให้ `git add -A` เก็บไปโดยไม่ตั้งใจ

ก่อนนำขึ้น server ตรวจว่า `.env` ผ่านกฎทั้งหมดได้ด้วย

```bash
IMAGE_TAG=probe docker compose -f docker-compose.production.yml \
  --env-file .env.production config >/dev/null && echo ok
```

สร้าง secret ใหม่

```bash
openssl rand -base64 48      # ได้ 64 ตัวอักษร ใช้คนละค่าสำหรับ access กับ refresh
```

> เปลี่ยน `JWT_SECRET` แล้ว **ทุกคนที่ login อยู่จะหลุดทันที** ต้อง login ใหม่ —
> เป็นสิ่งที่ต้องยอมเมื่อ secret เดิมรั่ว เพราะ token เก่าถูกเซ็นด้วยค่าที่คนอื่นรู้

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
| **gateway หา upstream ไม่เจอ**               | vhost ฝั่ง gateway ชี้ `proxy_pass http://cds-nginx:80` แต่สองคอนเทนเนอร์อยู่คนละ docker network → 502 และถึง `network connect` ได้ มันก็หายเมื่อ container ถูกสร้างใหม่                                           | ใช้ `http://172.18.0.1:8088` ซึ่งเป็นรูปแบบที่ vhost อื่นบนเครื่องนี้ใช้อยู่แล้ว                                                                 |
| **`cds.conf` ออกแบบผิดชั้น**                 | ทำ TLS + redirect 80→443 เองทั้งที่ gateway terminate TLS ให้แล้ว ทำให้ต้องมีใบรับรองในที่ที่ไม่มี และ redirect วนลูปเมื่อ Cloudflare เป็น Flexible                                                                | เขียนใหม่ให้รับแค่ HTTP ไม่มี TLS ไม่มี redirect                                                                                                 |
| **rate limit นับผู้ใช้ทุกคนเป็นคนเดียว**     | `limit_req_zone $binary_remote_addr` เห็นแต่ IP ของ gateway `zone=auth` (5 ครั้ง/นาที) จึงล็อกทั้งระบบทันทีที่มีคน login ผิด 5 ครั้ง                                                                               | ตั้ง `set_real_ip_from` + `real_ip_header X-Forwarded-For` ใน `nginx.conf`                                                                       |
| **`X-Forwarded-Proto` ผิด**                  | ภายใน cds-nginx `$scheme` เป็น http เสมอ แอปจะสร้างลิงก์เป็น http แล้วเบราว์เซอร์บล็อก mixed content                                                                                                               | ส่งต่อค่าจาก gateway ด้วย `$http_x_forwarded_proto` fallback เป็น `$scheme`                                                                      |
| **certbot ต่ออายุไม่ได้**                    | renewal config บางโดเมนตั้ง `authenticator = standalone` ซึ่งต้องยึดพอร์ต 80 เอง แต่ gateway ถืออยู่ → ใบหมดอายุเงียบ ๆ                                                                                            | ใช้ `--webroot -w /srv/deploy/nginx/certbot` เท่านั้น                                                                                            |

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
