# ปัญหาที่พบและแก้ไข — 2026-10-07

> ขอบเขต: ตรวจพบระหว่างเตรียมระบบบัญชี (Phase 1) แล้วลามไปเจอปัญหา deployment
> และความปลอดภัยที่มีอยู่เดิม ทั้งหมดเกิดจากการทดสอบ build/run จริง ไม่ใช่การอ่านโค้ด
>
> สถานะ ณ วันที่เขียน: **แก้แล้ว 13 ข้อ · ค้าง 4 ข้อ** ระบบ production ใช้งานได้ปกติที่
> https://inspect.uat-arch.com ผ่าน Cloudflare Full (strict)

---

## สรุปสั้น

การตรวจเริ่มจากคำถามง่าย ๆ ว่า "ควรทดสอบ build/run ที่ local ยังไง และการ build บน
server อันตรายไหม" พอลองทดสอบจริงกลับพบว่า **Docker image ทั้งสองตัวที่ CI สร้างและ
push ขึ้น ghcr ทุกครั้งที่ merge เข้า main นั้น start ไม่ขึ้นเลยสักตัว** และ **JWT secret
ของ production เป็นค่าตัวอย่างที่เปิดเผยอยู่ใน repo สาธารณะ**

ปัญหาส่วนใหญ่ซ่อนอยู่ได้นานเพราะมีคนแก้เฉพาะหน้าบน server ไว้แล้วไม่ได้เอากลับเข้า git
ทำให้สิ่งที่อยู่ใน repo กับสิ่งที่รันจริงต่างกันมาก

---

## ตารางรวม

| #   | ปัญหา                                              | ระดับ    | สถานะ    | commit    |
| --- | -------------------------------------------------- | -------- | -------- | --------- |
| 1   | JWT secret ของ production เป็นค่าสาธารณะใน repo    | 🔴 วิกฤต | แก้แล้ว  | `a0944b2` |
| 2   | `.env.production` ไม่ถูก gitignore                 | 🔴 วิกฤต | แก้แล้ว  | `b16360a` |
| 3   | backend image start ไม่ขึ้น (CMD ชี้ path ผิด)     | 🔴 วิกฤต | แก้แล้ว  | `ad1d243` |
| 4   | frontend image start ไม่ขึ้น (standalone path ผิด) | 🔴 วิกฤต | แก้แล้ว  | `ad1d243` |
| 5   | `prisma migrate deploy` รันไม่ได้ (สิทธิ์ไฟล์)     | 🟠 สูง   | แก้แล้ว  | `c0578ee` |
| 6   | healthcheck ใช้ `wget` ที่ไม่มีใน image            | 🟠 สูง   | แก้แล้ว  | `ad1d243` |
| 7   | nginx `${DOMAIN}` ไม่เคยถูกแทนค่า                  | 🟠 สูง   | แก้แล้ว  | `ad1d243` |
| 8   | `npx prisma` ไม่ pin เวอร์ชัน                      | 🟠 สูง   | แก้แล้ว  | `ad1d243` |
| 9   | compose ไม่มี `image:` → CI build ทิ้งเปล่า        | 🟠 สูง   | แก้แล้ว  | `98ebbd8` |
| 10  | gateway หา upstream ไม่เจอ → 502                   | 🟠 สูง   | แก้แล้ว  | บน server |
| 11  | rate limit นับผู้ใช้ทุกคนเป็นคนเดียว               | 🟠 สูง   | แก้แล้ว  | `0d8c9ab` |
| 12  | `X-Forwarded-Proto` ผิด → mixed content            | 🟡 กลาง  | แก้แล้ว  | `0d8c9ab` |
| 13  | พอร์ต postgres/minio เปิดออก public                | 🟡 กลาง  | แก้แล้ว  | `ad1d243` |
| 14  | **schema drift 7 ตาราง**                           | 🟠 สูง   | **ค้าง** | —         |
| 15  | **รหัสผ่าน DB/MinIO สั้นเกินไป**                   | 🟠 สูง   | **ค้าง** | —         |
| 16  | **ใบรับรอง SSL ของโดเมนอื่นหมดอายุ**               | 🟠 สูง   | **ค้าง** | —         |
| 17  | **secret เก่าอยู่ใน git history ถาวร**             | 🟡 กลาง  | **ค้าง** | —         |

---

## ความปลอดภัย

### 1. JWT secret ของ production เป็นค่าสาธารณะ 🔴

**อาการ** — `.env.production` ใช้ค่านี้

```
JWT_SECRET=CHANGE_ME_AT_LEAST_64_CHARS_RANDOM_STRING
JWT_REFRESH_SECRET=CHANGE_ME_DIFFERENT_64_CHARS_RANDOM_STRING
```

ซึ่งเหมือนกับ `.env.production.example` ที่ commit อยู่ใน repo **public** ทุกตัวอักษร

**ผลกระทบ** — payload ของ token มีแค่ `{ sub, email }` และ `jwt.strategy.ts` เอา `sub`
ไป query user แล้วให้สิทธิ์ตาม role ใน DB โดยไม่ตรวจอย่างอื่น ใครอ่าน repo ก็เซ็น token
ด้วย `sub: 1` (admin ที่ seed ไว้) แล้วได้สิทธิ์ admin เต็มโดยไม่ต้องรู้รหัสผ่าน

**แก้** — สุ่ม secret ใหม่ 64 ตัวอักษรทั้งสองตัว และเพิ่ม validation ใน
`backend/src/config/config.module.ts` ให้ backend **ไม่ยอม start** ถ้าเจอค่าที่มีคำว่า
`CHANGE_ME` สั้นกว่า 32 ตัวอักษร หรือ refresh ซ้ำกับ access — ยอมให้ start ไม่ขึ้นดีกว่า
ปล่อยให้รันทั้งที่ auth ถูก bypass ได้ มี test ครอบ 8 เคสที่ `config.module.spec.ts`

### 2. `.env.production` ไม่ถูก gitignore 🔴

**อาการ** — `.gitignore` ไล่ชื่อทีละไฟล์ (`.env`, `.env.local`, `.env.*.local`, `.env.test`)
ซึ่งไม่ครอบ `.env.production` ไฟล์จึงโผล่ใน `git status` พร้อมให้ `git add -A` เก็บไป

**แก้** — เปลี่ยนเป็น ignore `.env.*` ทั้งหมดแล้วปล่อยเฉพาะ `*.example` กลับมา ครอบ
`.env.staging` หรือชื่ออื่นในอนาคตด้วย

---

## Docker image

### 3–4. image ทั้งสองตัว start ไม่ขึ้น 🔴

|          | อาการ                                              | สาเหตุ                                                                                                                                                                                        |
| -------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| backend  | `Cannot find module /app/backend/dist/src/main.js` | `tsconfig.build.json` exclude `prisma/` กับ `scripts/` TypeScript จึงมอง rootDir เป็น `src` ผลจริงคือ `dist/main.js`                                                                          |
| frontend | `Cannot find module /app/server.js`                | `outputFileTracingRoot: '../../'` ชี้เหนือ repo อีกชั้น ใน Docker กลายเป็น `/` ทำให้ standalone คัด path เต็มมา (`server.js` ไปอยู่ `/app/app/frontend/`) และลาก `/proc` `/usr` ติดเข้า image |

**หลักฐานว่าเป็นปัญหาจริง** — บน server มีคนแก้ `backend/Dockerfile` ให้เป็น
`dist/main.js` ไว้แล้ว และเขียน `frontend/Dockerfile` ใหม่ทั้งไฟล์เพื่อ**เลี่ยง** standalone
(ตัด `DOCKER_BUILD=1` ออก ใช้ `pnpm start` แทน) แต่ไม่ได้เอากลับเข้า repo

**แก้** — แก้ที่ต้นเหตุทั้งคู่ `outputFileTracingRoot` เป็น `'../'` พร้อมปรับ COPY/CMD
ให้ตรง ผลพลอยได้คือ image เล็กลงจาก 412MB เหลือ 314MB และกลับมารันด้วย non-root user

### 5. `prisma migrate deploy` รันไม่ได้ 🟠

**อาการ** — `npm error EACCES: permission denied, mkdir '/nonexistent'`

**สาเหตุซ้อนกันสามชั้น** ทุกชั้นเรื่องสิทธิ์ไฟล์

1. image รันด้วย user `nestjs` ที่สร้างด้วย `adduser --system` จึงได้ `HOME=/nonexistent`
   npx เขียน cache ไม่ได้
2. `backend/prisma/migrations` ถูก COPY มาพร้อมสิทธิ์ `700` ของเครื่อง dev
3. `package.json` ติดปัญหาเดียวกัน โผล่ทันทีที่แก้ข้อ 2

ข้อ 2–3 มาจากต้นเหตุเดียวกับที่ทำให้ไฟล์ 413 ไฟล์เปลี่ยน mode ตอนเริ่มงาน — repo ถูก
ก๊อปข้าม filesystem ที่ไม่เก็บ POSIX permission

**แก้** — `chmod -R a+rX` ทุกอย่างที่ COPY มาจาก host ใน Dockerfile ทำให้ image ไม่
ขึ้นกับสิทธิ์ของเครื่องที่ build และทำ wrapper `/usr/local/bin/prisma` จาก CLI ที่
`pnpm dlx` ดึงมาไว้ใน image อยู่แล้ว deploy จึงไม่ต้องใช้ npx ไม่ต้องต่อเน็ต

### 6. healthcheck ใช้ `wget` 🟠

`node:20-bookworm-slim` ไม่มีทั้ง `wget` และ `curl` (ยืนยันด้วยการรัน image จริง)
healthcheck จึง fail ตลอด backend ขึ้น `unhealthy` ถาวร และ `depends_on: service_healthy`
ของ service อื่นค้างรอไม่จบ — เปลี่ยนไปใช้ `fetch` ของ Node

### 8. `npx prisma` ไม่ pin เวอร์ชัน 🟠

`npx prisma migrate deploy` ดึง major ล่าสุด (ตอนนี้ 8.x) มาใช้กับ schema v5 — pin
เป็น `prisma@5.22.0`

---

## Deployment และ nginx

### 9. compose ไม่มี `image:` → CI build ทิ้งเปล่า 🟠

CI สร้าง image แล้ว push ขึ้น `ghcr.io` ทุกครั้งที่ merge เข้า main และ `deploy.yml`
ก็สั่ง `docker compose pull` ตามลำดับที่ถูก แต่ `docker-compose.yml` มีแค่ `build:`
ไม่มี `image:` compose จึงไม่รู้จัก image บน ghcr เลย ผลคือ **server build จาก source
เองเสมอ** และต้องเก็บ source + `node_modules` ทั้งก้อนไว้บนเครื่อง production

**แก้** — แยก `docker-compose.production.yml` ที่ไม่มี `build:` เลย และวางระบบใหม่
ให้ build บนเครื่อง dev แล้วส่งไฟล์ image ขึ้น server (`docker save` / `docker load`)
พร้อม script สามตัวและด่านตรวจ architecture

### 7. nginx `${DOMAIN}` ไม่เคยถูกแทนค่า 🟠

nginx ไม่แทนค่า env ในไฟล์ config ที่ mount เข้า `conf.d/` โดยตรง `server_name ${DOMAIN};`
จึงค้างเป็นข้อความดิบ — แก้โดย mount เป็น `templates/cds.conf.template` ให้ entrypoint
envsubst ให้ พร้อม `NGINX_ENVSUBST_FILTER` กันไปทับ `$host` `$request_uri` ของ nginx เอง

### 10. gateway หา upstream ไม่เจอ → 502 🟠

**สถาปัตยกรรมจริงบน server** (ไม่ได้บันทึกไว้ที่ไหนมาก่อน)

```
Cloudflare ──► nginx-gateway :80/:443 ──► cds-nginx :8088 ──► frontend / backend / minio
               (ถือพอร์ตให้ทุกเว็บบนเครื่อง, terminate TLS)
```

vhost ฝั่ง gateway ชี้ `proxy_pass http://cds-nginx:80` แต่สองคอนเทนเนอร์อยู่คนละ
docker network จึง resolve ชื่อไม่ได้ และถึงจะ `docker network connect` ได้ มันก็หาย
ทุกครั้งที่ container ถูกสร้างใหม่

**แก้** — ใช้ `http://172.18.0.1:8088` ซึ่งเป็นรูปแบบที่ vhost อื่นบนเครื่องนี้ใช้อยู่แล้ว
ไม่ต้องพึ่ง network ร่วม และรอดเมื่อ container ถูก recreate

### 11. rate limit นับผู้ใช้ทุกคนเป็นคนเดียว 🟠

`limit_req_zone $binary_remote_addr` เห็นแต่ IP ของ gateway ทุก request
`zone=auth` (5 ครั้ง/นาที) จึงล็อก**ผู้ใช้ทั้งระบบ**ทันทีที่มีใครสักคน login ผิด 5 ครั้ง

**แก้** — ตั้ง `set_real_ip_from` สำหรับช่วง IP ภายในของ docker + `real_ip_header
X-Forwarded-For` ใน `nginx.conf`

### 12. `X-Forwarded-Proto` ผิด 🟡

ภายใน `cds-nginx` ค่า `$scheme` เป็น `http` เสมอ (TLS จบที่ gateway) ถ้าส่งค่านั้นต่อ
แอปจะสร้างลิงก์เป็น http แล้วเบราว์เซอร์บล็อก mixed content — ส่งต่อค่าจาก gateway
ด้วย `$http_x_forwarded_proto` และ fallback เป็น `$scheme`

### 13. พอร์ตเปิดออก public เกินจำเป็น 🟡

`docker-compose.yml` เดิม publish postgres `5433`, minio `9000`/`9001`,
backend `3004`, frontend `3003` ออก `0.0.0.0` ทั้งหมด — ใน
`docker-compose.production.yml` ตัวใหม่เหลือเฉพาะ `cds-nginx` ส่วน postgres/minio
ผูกไว้ที่ `127.0.0.1` และ backend/frontend ไม่ publish เลย

---

## ยังค้าง

### 14. schema drift 7 ตาราง 🟠

`prisma migrate deploy` จาก DB เปล่าสร้าง schema ไม่ครบ ทำให้ `db seed` ล้มด้วย
`column projects.province does not exist`

สิ่งที่อยู่ใน `schema.prisma` แต่ไม่มี migration รองรับ (203 บรรทัด SQL)

|         | รายการ                                                                                                                                                                                                                              |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ตาราง   | `daily_reports`, `daily_report_items`, `daily_report_images`, `daily_report_issues`, `estimate_installments`, `sub_quotations`, `work_categories`                                                                                   |
| คอลัมน์ | `projects` (province, district, subdistrict, postcode, addressLine, areaSize, latitude, longitude, designStartDate, designEndDate), `payment_milestones` (quotationId, subQuotationId, estimateId), `estimate_items.subQuotationId` |
| enum    | `DailyReportStatus`, `WeatherCondition`, `ReportIssueSeverity` ฯลฯ                                                                                                                                                                  |

สาเหตุ: เคยใช้ `prisma db push` แล้วไม่ได้ commit ไฟล์ migration

**ผลกระทบ** — environment ที่มีอยู่ทำงานปกติ แต่**สร้าง environment ใหม่จาก migration
ไม่ได้** กระทบ CI, staging และการกู้ระบบ

**วิธีแก้** — ดู `docs/billing-accounting-spec.md` §14.1

### 15. รหัสผ่าน DB และ MinIO สั้นเกินไป 🟠

`POSTGRES_PASSWORD` 8 ตัวอักษร · `MINIO_ROOT_PASSWORD` 10 ตัวอักษร

ยังไม่เปลี่ยนเพราะต้องทำพร้อมกันทั้ง `ALTER USER` ใน Postgres และ `DATABASE_URL`
ถ้าทำครึ่งเดียวระบบล่ม ควรทำตอนมีเวลาและมี backup พร้อม

### 16. ใบรับรอง SSL ของโดเมนอื่นหมดอายุ 🟠

| โดเมน                               | หมดอายุ      | authenticator  |
| ----------------------------------- | ------------ | -------------- |
| `archd.app-attendance.tech`         | 6 ส.ค. 2026  | `standalone` ✗ |
| `app-bcl.inform-system.com`         | 18 ก.ย. 2026 | `standalone` ✗ |
| `uat-arch.com`                      | 12 พ.ย. 2026 | `webroot` ✓    |
| `khorrakhang.com`                   | 12 พ.ย. 2026 | `webroot` ✓    |
| `icare-notification.uat-system.com` | 12 พ.ย. 2026 | `webroot` ✓    |

**สาเหตุ** — สองโดเมนแรกตั้ง `authenticator = standalone` ซึ่งสั่งให้ certbot เปิด
web server ที่พอร์ต 80 เอง แต่ `nginx-gateway` ถืออยู่

```
Failed to renew ... Could not bind TCP port 80 because it is already in use
```

`certbot.timer` รันทุก 12 ชั่วโมงและล้มทุกครั้งมาตลอดสองเดือน

**วิธีแก้** — เปลี่ยนเป็น `--webroot -w /srv/deploy/nginx/certbot` และเติม
`location /.well-known/acme-challenge/ { root /var/www/certbot; }` ใน block พอร์ต 80
ของ vhost นั้น **ก่อน** `location /`

> โดเมนเหล่านี้เป็นของโปรเจกต์อื่น ต้องคุยกับเจ้าของก่อนแก้

### 17. secret เก่าอยู่ใน git history ถาวร 🟡

การเปลี่ยนค่าใหม่แก้ปัญหาที่ production แล้ว แต่ค่าเดิมยังอยู่ใน history ลบไม่ได้
ถ้าไม่ rewrite history ทั้ง repo — ต้องแจ้งเจ้าของ repo

---

## บทเรียน

**ทดสอบด้วยการรันจริง ไม่ใช่อ่านโค้ด** — บั๊กข้อ 3–5 ไม่มีทางเจอจากการอ่าน เพราะทุกอย่าง
"ดูถูก" หมด เจอตอนรัน `docker compose build` แล้ว container crash

**สิ่งที่แก้บน server ต้องกลับเข้า git เสมอ** — มีคนแก้ Dockerfile, compose และ nginx
config ไว้บน server แล้วไม่ได้เอากลับ ทำให้ repo กับของจริงต่างกันจนไล่ปัญหายาก และ
deploy ครั้งถัดไปทับของที่แก้ไว้

**ความล้มเหลวเงียบอันตรายกว่าความล้มเหลวดัง** — healthcheck ที่ fail ตลอด, certbot ที่
ต่ออายุไม่ได้สองเดือน, CI ที่ push image ใช้ไม่ได้ทุกครั้ง ทั้งหมดไม่มีใครรู้เพราะไม่มี
อะไรส่งเสียง จึงเพิ่ม validation ที่ทำให้ระบบ **ไม่ยอม start** เมื่อ config ผิด แทนที่จะ
ปล่อยให้รันต่อแบบพัง
