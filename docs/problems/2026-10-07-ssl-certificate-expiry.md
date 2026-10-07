# ใบรับรอง SSL หมดอายุ — แผนแก้ไขและผล

> **เอกสารนี้เขียนเพื่อส่งต่อ** อ่านจบแล้วลงมือได้เลยโดยไม่ต้องไล่วินิจฉัยใหม่
> บันทึกเมื่อ 2026-10-07 · **แก้แล้ว 2026-10-07** · เกี่ยวข้องกับ server `srv1653694` (`/opt/cds`)
>
> พบระหว่างตั้งค่า TLS ให้ `inspect.uat-arch.com` ดูบริบทเต็มที่
> [2026-10-07-deploy-and-security.md](./2026-10-07-deploy-and-security.md) ข้อ 16

---

## สรุปสำหรับคนที่เพิ่งเข้ามาอ่าน

server เครื่องนี้โฮสต์เว็บหลายโปรเจกต์ มี `nginx-gateway` ถือพอร์ต 80/443 ให้ทุกโดเมน
และใช้ `certbot.timer` ของ systemd ต่ออายุใบรับรอง Let's Encrypt

**ใบรับรอง 2 ใบหมดอายุไปแล้ว** และ **อีก 3 ใบจะหมดใน 5 สัปดาห์** สาเหตุคือ renewal
config ของสองใบแรกตั้ง `authenticator = standalone` ซึ่งสั่งให้ certbot เปิด web server
ที่พอร์ต 80 เอง แต่ `nginx-gateway` ถือพอร์ตนั้นอยู่ ทำให้ล้มทุกครั้ง

```
Failed to renew certificate archd.app-attendance.tech with error:
Could not bind TCP port 80 because it is already in use by another process
```

`certbot.timer` รันทุก ~12 ชั่วโมงและล้มมาตลอดสองเดือนโดยไม่มีใครรู้

---

## ผลการแก้ไข — 2026-10-07

ทุกใบต่ออายุได้แล้ว ยืนยันด้วย

```
# certbot renew --dry-run 2>&1 | grep -E "Failed|failed|Congratulations"
Congratulations, all simulated renewals succeeded:
# grep -l "authenticator = standalone" /etc/letsencrypt/renewal/*.conf || echo "ไม่มีแล้ว"
ไม่มีแล้ว
```

| โดเมน                                                     | ทำอะไร                                                                      | ผล                                    |
| --------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------- |
| `app-bcl.inform-system.com` + `api-bcl.inform-system.com` | เติมช่อง ACME ใน block พอร์ต 80 ของ `bcl.inform-system.com.conf`            | หมดอายุ 5 ม.ค. 2027 · `webroot` ✓     |
| `archd.app-attendance.tech` + `api.app-attendance.tech`   | รวม block พอร์ต 80 สองอันเป็นอันเดียว แล้วเติมช่อง ACME                     | หมดอายุ 5 ม.ค. 2027 · `webroot` ✓     |
| ทุกใบ                                                     | เพิ่ม deploy hook ให้ reload `nginx-gateway` หลังต่ออายุ (ก่อนหน้านี้ไม่มี) | ใบใหม่มีผลทันทีโดยไม่ต้อง restart เอง |
| `uat-arch.com` และใบที่ใช้ `webroot` อยู่แล้ว             | ไม่ต้องแก้ — dry-run ผ่าน                                                   | ต่ออายุเองก่อน 12 พ.ย.                |

ไฟล์ vhost เดิมเก็บไว้ที่ `conf.d/<file>.conf.bak-2026-10-07` · **ยังต้องแจ้งเจ้าของ
โปรเจกต์ bcl และ archd** ว่าแก้ไฟล์ของเขาไปแล้ว และเว็บอาจล่มช่วงที่ใบหมดอายุ

### สิ่งที่เจอระหว่างแก้ — ไม่มีในแผนเดิม

**1. ไม่มี deploy hook** — certbot อยู่บน host ส่วน nginx อยู่ใน container ต่ออายุสำเร็จ
แล้ว nginx ก็ยังเสิร์ฟใบเก่าที่โหลดไว้ในหน่วยความจำจนกว่าจะมีคน reload แปลว่าแม้ใบที่ใช้
`webroot` ถูกต้องก็จะ "หมดอายุ" ในสายตาผู้ใช้อยู่ดี แก้ด้วย

```bash
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx-gateway.sh <<'EOF'
#!/bin/sh
docker exec nginx-gateway nginx -t && docker exec nginx-gateway nginx -s reload
EOF
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx-gateway.sh
```

`certbot renew --dry-run` **ไม่รัน** deploy hook ทดสอบด้วยการรันสคริปต์ตรง ๆ ตอนต่ออายุจริง
certbot จะขึ้น `Hook 'deploy-hook' ran with error output:` ตามด้วย warning ของ nginx —
**ไม่ใช่ error** แค่ nginx เขียน warning ลง stderr ให้ดูบรรทัด `test is successful`

**2. ใบเดียวครอบหลายโดเมน** — ทั้งสองใบที่หมดมี SAN สองชื่อ (`app-bcl` + `api-bcl`,
`archd` + `api.app-attendance`) ถ้าออกใบด้วย `certonly -d <domain>` ชื่อเดียว ใบใหม่จะ
ไม่มี `api-*` แล้ว API ล่มทันทีหลัง reload — จึงเปลี่ยนขั้นที่ 2 เป็น `renew --cert-name`

**3. 526 ตอน dry-run ครั้งแรก** — สาเหตุคือ**แก้ vhost แล้วลืม reload**

```
Invalid response from https://app-bcl.inform-system.com/.well-known/acme-challenge/...: 526
```

origin ยัง redirect ACME ไป https → Cloudflare ต่อเข้า origin ด้วยใบที่หมดอายุ → zone
เป็น Full (strict) จึงได้ 526 ทีแรกเข้าใจผิดว่า Cloudflare บังคับ https เอง เพราะเห็น
`Server: cloudflare` คู่กับ 301 — **header นั้นมีในทุก response ที่ผ่าน Cloudflare**
ใช้แยกไม่ได้ว่าใครเป็นคน redirect

ไม่ต้องแตะ Cloudflare เลย ทั้ง `inform-system.com` และ `app-attendance.tech` ไม่ได้เปิด
Always Use HTTPS ถ้าวันหน้าเจอ zone ที่เปิดไว้ ดู [กรณี Cloudflare redirect เอง](#กรณี-cloudflare-redirect-เอง)

---

## สถานะก่อนแก้ — 2026-10-07

| โดเมน                               | หมดอายุ         | authenticator  | เจ้าของ              | สถานะ              |
| ----------------------------------- | --------------- | -------------- | -------------------- | ------------------ |
| `archd.app-attendance.tech`         | 6 ส.ค. 2026     | `standalone` ✗ | โปรเจกต์อื่น         | 🔴 หมดแล้ว 2 เดือน |
| `app-bcl.inform-system.com`         | 18 ก.ย. 2026    | `standalone` ✗ | โปรเจกต์อื่น         | 🔴 หมดแล้ว 19 วัน  |
| `uat-arch.com`                      | 12 พ.ย. 2026    | `webroot` ✓    | **เรา (เว็บบริษัท)** | 🟡 เหลือ 5 สัปดาห์ |
| `khorrakhang.com`                   | 12 พ.ย. 2026    | `webroot` ✓    | โปรเจกต์อื่น         | 🟡 เหลือ 5 สัปดาห์ |
| `icare-notification.uat-system.com` | 12 พ.ย. 2026    | `webroot` ✓    | โปรเจกต์อื่น         | 🟡 เหลือ 5 สัปดาห์ |
| `jeabandmintwedding.online`         | 23 พ.ย. 2026    | `webroot` ✓    | โปรเจกต์อื่น         | ✓                  |
| `admin-bcl.inform-system.com`       | 27 พ.ย. 2026    | `webroot` ✓    | โปรเจกต์อื่น         | ✓                  |
| `onebeer-event`                     | 23 ธ.ค. 2026    | `webroot` ✓    | โปรเจกต์อื่น         | ✓                  |
| `markup-hub.inform-system.com`      | 31 ธ.ค. 2026    | `webroot` ✓    | โปรเจกต์อื่น         | ✓                  |
| **`inspect.uat-arch.com`**          | **4 ม.ค. 2027** | `webroot` ✓    | **เรา (CDS)**        | ✓ ออกใหม่แล้ว      |

### ของเรามีสองโดเมน

- `inspect.uat-arch.com` — ระบบ CDS ที่กำลังพัฒนา ออกใบใหม่ไปแล้วด้วย `webroot` ปลอดภัย
- `uat-arch.com` — เว็บบริษัท (Laravel) ใช้ `webroot` อยู่แล้ว ~~แต่ต้องยืนยัน~~
  **ยืนยันแล้ว** dry-run ผ่าน และมี deploy hook reload ให้

ทั้งสองอยู่ใน Cloudflare zone `uat-arch.com` ซึ่งตั้ง SSL mode เป็น **Full (strict)**
แปลว่า **ถ้าใบหมดอายุ เว็บจะล่มทันที** ไม่ใช่แค่ขึ้นเตือน

---

## ตรวจสถานะปัจจุบันก่อนลงมือ

สถานะด้านบนเป็นของวันที่เขียน ให้รันชุดนี้ก่อนเสมอ

```bash
echo "=== วันหมดอายุทุกใบ ==="
for d in /etc/letsencrypt/live/*/; do
  n=$(basename "$d"); [ "$n" = "README" ] && continue
  echo "$n: $(openssl x509 -enddate -noout -in "$d/fullchain.pem" 2>/dev/null | cut -d= -f2)"
done

echo "=== ใบไหนใช้ standalone (ต่ออายุไม่ได้) ==="
grep -l "authenticator = standalone" /etc/letsencrypt/renewal/*.conf 2>/dev/null || echo "ไม่มีแล้ว"

echo "=== certbot ล้มล่าสุดเพราะอะไร ==="
journalctl -u certbot.service --no-pager -n 20 | grep -iE "failed|error" | tail -5

echo "=== vhost ไหนไม่มีช่อง ACME ==="
for f in /srv/deploy/nginx/conf.d/*.conf; do
  grep -q "acme-challenge" "$f" || echo "  $(basename "$f")"
done
```

---

## วิธีแก้ — ต่อโดเมน

> ขั้นตอนนี้ปรับตามที่ทำจริงแล้ว ใช้ซ้ำได้ถ้าวันหน้ามีใบไหนกลับไปใช้ `standalone`

ทำทีละโดเมน ทดสอบทีละขั้น **อย่าแก้หลายโดเมนพร้อมกัน** เพราะ `nginx -s reload` ที่ผิด
จะทำให้เว็บทั้ง 20 โดเมนบนเครื่องล่มพร้อมกัน

### ขั้นที่ 1 — เปิดช่อง ACME ใน vhost

certbot แบบ `webroot` ต้องการให้ `http://<domain>/.well-known/acme-challenge/` เสิร์ฟ
ไฟล์จาก `/var/www/certbot` ได้ แต่ vhost ส่วนใหญ่ของโดเมนที่มีปัญหาเขียนแบบนี้

```nginx
server {
    listen 80;
    server_name archd.app-attendance.tech;
    return 301 https://$host$request_uri;    # ← เด้งทุกอย่างรวมถึง ACME
}
```

ต้องเติม location **ก่อน** `return`/`location /` — ถ้าใบครอบหลายชื่อ ช่อง ACME ต้องเปิด
**ทุกชื่อ** ถ้า vhost แยก block พอร์ต 80 ไว้ชื่อละอัน รวมเป็นอันเดียวง่ายกว่า

```nginx
server {
    listen 80;
    server_name archd.app-attendance.tech;

    location /.well-known/acme-challenge/ { root /var/www/certbot; }   # ← เพิ่ม

    location / { return 301 https://$host$request_uri; }               # ← ย้าย return มาไว้ใน location
}
```

> `return 301` ที่อยู่ระดับ server block จะทำงานก่อน location เสมอ ต้องย้ายเข้าไปอยู่ใน
> `location /` ไม่งั้นช่อง ACME จะไม่มีผล

```bash
cp /srv/deploy/nginx/conf.d/<domain>.conf{,.bak-$(date +%F)}
nano /srv/deploy/nginx/conf.d/<domain>.conf
docker exec nginx-gateway nginx -t && docker exec nginx-gateway nginx -s reload
```

**อย่าลืม reload** — ข้ามขั้นนี้แล้วจะได้ 526 ตอนออกใบ

ทดสอบว่าช่องเปิดจริง — **ผ่าน URL จริง** ทุกชื่อในใบ เพราะ Let's Encrypt เข้ามาทาง
Cloudflare การยิง `127.0.0.1` พร้อม `Host:` ไม่ได้ผ่านเส้นทางเดียวกัน (ตอนแก้จริงได้ 301
จาก `127.0.0.1` ทั้งที่ URL จริงได้ 404 ถูกต้องแล้ว)

```bash
curl -sI http://<domain>/.well-known/acme-challenge/x | head -1
# ต้องได้ 404 (ไฟล์ไม่มี แต่ nginx หาใน /var/www/certbot) ไม่ใช่ 301
```

### ขั้นที่ 2 — ออกใบใหม่ด้วย webroot

```bash
certbot renew --cert-name <cert-name> \
  --webroot -w /srv/deploy/nginx/certbot --dry-run
# ผ่านแล้วรันซ้ำโดยไม่ใส่ --dry-run
```

ใช้ `renew --cert-name` **ไม่ใช่** `certonly -d` เพราะ renew ใช้รายชื่อโดเมนเดิมในใบครบ
ทุกชื่อ และเขียนทับ `/etc/letsencrypt/renewal/<cert-name>.conf` ให้เป็น `webroot`
อัตโนมัติ ทำให้ `certbot.timer` ต่ออายุเองได้ในรอบถัดไป ไม่ต้องใส่ `--force-renewal`
เพราะใบที่หมดหรือใกล้หมดจะถูกต่อให้เองอยู่แล้ว

deploy hook จะ reload `nginx-gateway` ให้หลังออกใบสำเร็จ

### ขั้นที่ 3 — ตรวจ

```bash
grep authenticator /etc/letsencrypt/renewal/<cert-name>.conf      # ต้องเป็น webroot
openssl x509 -noout -enddate -ext subjectAltName \
  -in /etc/letsencrypt/live/<cert-name>/fullchain.pem             # SAN ต้องครบทุกชื่อ
curl -sI https://<domain>/ | head -1                              # ทุกชื่อ ต้องไม่ใช่ 526
```

ได้ 3xx/404 ไม่ใช่ปัญหา TLS — เป็นพฤติกรรมของแอป (เช่น redirect ไป login, API ไม่มี
route ที่ `/`)

### ขั้นที่ 4 — ยืนยันว่าระบบต่ออายุเองได้

```bash
certbot renew --dry-run
```

ต้องขึ้น `Congratulations, all simulated renewals succeeded` **ทุกโดเมน** ถ้ายังมีใบไหน
fail แสดงว่ายังแก้ไม่ครบ

### กรณี Cloudflare redirect เอง

ถ้า origin ตอบ 404 แล้วแต่ URL จริงยังได้ 301 แปลว่า zone เปิด **Always Use HTTPS** ไว้
ใบที่หมดแล้วจะออกใหม่ผ่าน HTTP-01 ไม่ได้ (Cloudflare → https → ใบหมด → 526) ต้องทำ

1. เติมช่อง ACME ใน **block 443** ด้วย — รอบต่อไปจะต่ออายุผ่าน https ได้เมื่อใบยังใช้ได้
2. ออกใบครั้งแรก: สลับ record เป็น **DNS only** (เมฆเทา) ชั่วคราว → renew → สลับกลับ
   ถ้ามี AAAA ต้องชี้ IPv6 ของ server จริง เพราะ Let's Encrypt ลอง IPv6 ก่อน

ทั้งสองข้อต้องใช้สิทธิ์ Cloudflare ของเจ้าของ zone

---

## ลำดับที่แนะนำ

1. ~~**`certbot renew --dry-run` ก่อนเลย**~~ ✓ ล้มแค่ `archd` กับ `app-bcl`
2. ~~**`uat-arch.com`**~~ ✓ dry-run ผ่าน ไม่ต้องทำอะไร
3. ~~**deploy hook**~~ ✓ ติดตั้งแล้ว
4. ~~**แก้ `archd` และ `app-bcl`**~~ ✓ ต่ออายุแล้ว
5. **แจ้งเจ้าของโปรเจกต์ bcl และ archd** ว่าแก้ vhost ของเขาไปแล้ว — **ยังไม่ได้ทำ**
6. **ตั้งการแจ้งเตือน** (ดูด้านล่าง) — **ยังไม่ได้ทำ**

---

## ป้องกันไม่ให้เกิดซ้ำ

ปัญหานี้ซ่อนอยู่ได้สองเดือนเพราะไม่มีอะไรส่งเสียงเมื่อ renewal ล้ม ตอนนี้ทุกใบใช้
`webroot` แล้ว แต่ถ้าวันหน้ามีคนเพิ่มโดเมนด้วย `--standalone` อีก ก็จะเงียบแบบเดิม

**ทางที่ 1 — แจ้งเตือนเมื่อ certbot ล้ม**

```bash
systemctl edit certbot.service
```

```ini
[Unit]
OnFailure=certbot-alert@%n.service
```

แล้วสร้าง `certbot-alert@.service` ที่ส่งอีเมล/LINE แจ้ง

**ทางที่ 2 — cron ตรวจวันหมดอายุทุกสัปดาห์**

```bash
#!/bin/bash
# /usr/local/bin/check-cert-expiry.sh
for d in /etc/letsencrypt/live/*/; do
  n=$(basename "$d"); [ "$n" = "README" ] && continue
  end=$(openssl x509 -enddate -noout -in "$d/fullchain.pem" | cut -d= -f2)
  days=$(( ($(date -d "$end" +%s) - $(date +%s)) / 86400 ))
  [ "$days" -lt 21 ] && echo "⚠️  $n เหลือ $days วัน"
done
```

**ทางที่ 3 — ย้ายไป Cloudflare Origin Certificate** (อายุ 15 ปี ไม่ต้องต่ออายุ)
เหมาะกับโดเมนที่อยู่หลัง Cloudflare ตลอด ตัดปัญหานี้ทิ้งถาวร แต่ต้องเปลี่ยนทุกโดเมน
พร้อมกันจึงจะไม่สับสน — เจ้าของ server เคยบอกว่ายังไม่อยากเปลี่ยนตอนนี้

---

## ข้อควรระวัง

|                                  |                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **`nginx -t` ก่อน reload เสมอ**  | gateway ตัวเดียวถือ 20 โดเมน config ผิดแล้ว reload = ล่มหมด                                                                    |
| **โดเมนของโปรเจกต์อื่น**         | `archd`, `app-bcl`, `khorrakhang`, `icare-*`, `bcl-*`, `markup-hub`, `jeabandmint`, `onebeer` ไม่ใช่ของเรา ต้องขออนุญาตก่อนแก้ |
| **Cloudflare Full (strict)**     | zone `uat-arch.com` ตั้งไว้แบบนี้ ใบหมด = เว็บล่มทันที ไม่ใช่แค่เตือน                                                          |
| **rate limit ของ Let's Encrypt** | ออกใบซ้ำโดเมนเดิมได้ 5 ครั้ง/สัปดาห์ ใช้ `--dry-run` ทดสอบก่อนเสมอ                                                             |
| **`--force-renewal`**            | ใช้เฉพาะตอนจำเป็น เพราะกิน rate limit แม้ใบยังไม่ใกล้หมด                                                                       |

---

## ข้อมูลอ้างอิงของ server

|                     |                                                                     |
| ------------------- | ------------------------------------------------------------------- |
| เครื่อง             | `srv1653694`                                                        |
| gateway             | container `nginx-gateway` ถือพอร์ต 80/443                           |
| config ของ gateway  | `/srv/deploy/nginx/conf.d/<domain>.conf` (host)                     |
| webroot ของ certbot | `/srv/deploy/nginx/certbot` → `/var/www/certbot` (ใน container)     |
| ใบรับรอง            | `/etc/letsencrypt` mount เข้า gateway ที่ path เดียวกัน             |
| certbot             | ติดตั้งบน **host** ไม่ใช่ container ใช้ `certbot.timer` ของ systemd |
| deploy hook         | `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx-gateway.sh`     |
| include ของ gateway | `conf.d/*.conf` เท่านั้น — ไฟล์ `.bak*` ใน conf.d ไม่ถูกโหลด        |
| โปรเจกต์ CDS        | `/opt/cds` · container `cds-nginx` รับที่พอร์ต 8088                 |
