# ใบรับรอง SSL หมดอายุ — แผนแก้ไข

> **เอกสารนี้เขียนเพื่อส่งต่อ** อ่านจบแล้วลงมือได้เลยโดยไม่ต้องไล่วินิจฉัยใหม่
> บันทึกเมื่อ 2026-10-07 · ยังไม่ได้แก้ · เกี่ยวข้องกับ server `srv1653694` (`/opt/cds`)
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

## สถานะ ณ 2026-10-07

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
- `uat-arch.com` — เว็บบริษัท (Laravel) ใช้ `webroot` อยู่แล้วจึงน่าจะต่ออายุได้เอง
  **แต่ต้องยืนยัน** เพราะยังไม่เคยเห็นมันต่อสำเร็จด้วยตาตัวเอง

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

ต้องเติม location **ก่อน** `return`/`location /`

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

ทดสอบว่าช่องเปิดจริง

```bash
mkdir -p /srv/deploy/nginx/certbot/.well-known/acme-challenge
echo ok > /srv/deploy/nginx/certbot/.well-known/acme-challenge/test
curl -s -H "Host: <domain>" http://127.0.0.1/.well-known/acme-challenge/test
# ต้องได้ "ok" ไม่ใช่ 301
rm -f /srv/deploy/nginx/certbot/.well-known/acme-challenge/test
```

### ขั้นที่ 2 — ออกใบใหม่ด้วย webroot

```bash
certbot certonly --webroot -w /srv/deploy/nginx/certbot \
  -d <domain> --agree-tos --no-eff-email --non-interactive --force-renewal
```

คำสั่งนี้จะ**เขียนทับ** `/etc/letsencrypt/renewal/<domain>.conf` ให้เป็น `webroot`
อัตโนมัติ ทำให้ `certbot.timer` ต่ออายุเองได้ในรอบถัดไป

### ขั้นที่ 3 — reload แล้วตรวจ

```bash
docker exec nginx-gateway nginx -t && docker exec nginx-gateway nginx -s reload
openssl x509 -enddate -noout -in /etc/letsencrypt/live/<domain>/fullchain.pem
curl -skI -m 10 --resolve <domain>:443:127.0.0.1 https://<domain>/ | head -3
```

### ขั้นที่ 4 — ยืนยันว่าระบบต่ออายุเองได้

```bash
certbot renew --dry-run
```

ต้องขึ้น `Congratulations, all simulated renewals succeeded` **ทุกโดเมน** ถ้ายังมีใบไหน
fail แสดงว่ายังแก้ไม่ครบ

---

## ลำดับที่แนะนำ

1. **`certbot renew --dry-run` ก่อนเลย** — บอกทันทีว่าตอนนี้ใบไหนต่อได้ใบไหนไม่ได้
   โดยไม่ต้องรอให้หมดอายุจริง
2. **`uat-arch.com`** — ของเรา หมด 12 พ.ย. ถ้า dry-run ผ่านก็ไม่ต้องทำอะไร
3. **แจ้งเจ้าของโปรเจกต์อื่น** เรื่อง `archd` และ `app-bcl` ที่หมดไปแล้ว พร้อมส่ง
   เอกสารนี้ให้ — **อย่าแก้ vhost ของโปรเจกต์อื่นเองโดยไม่บอก**
4. **ตั้งการแจ้งเตือน** (ดูด้านล่าง)

---

## ป้องกันไม่ให้เกิดซ้ำ

ปัญหานี้ซ่อนอยู่ได้สองเดือนเพราะไม่มีอะไรส่งเสียงเมื่อ renewal ล้ม

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
| โปรเจกต์ CDS        | `/opt/cds` · container `cds-nginx` รับที่พอร์ต 8088                 |
