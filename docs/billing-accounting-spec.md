# Spec ระบบออกบิล บัญชี และการเงิน (Billing & Accounting)

> สถานะ: **v2.2 — Phase 1 สร้างเสร็จและทดสอบแล้ว**
> อัปเดตให้ตรงกับโค้ดที่ implement จริง (ดู §13 สำหรับสถานะแต่ละ phase)
> ขอบเขต: ออกเอกสารภาษีเต็มรูปแบบตามประมวลรัษฎากร + AR + AP + งบกำไรขาดทุนรายโครงการ

---

## 1. ขอบเขตและมติที่ล็อกแล้ว

| หัวข้อ                        | มติ                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| ระดับความถูกต้องทางภาษี       | เต็มรูปแบบ — ใบกำกับภาษี, ภ.พ.30, ภ.ง.ด.3/53, 50 ทวิ                                            |
| ขอบเขตการเงิน                 | AR + AP + P&L รายโครงการ (รายได้ / ทุน / รายจ่าย Vendor)                                        |
| ความสัมพันธ์กับ BOQ           | **ยังไม่เชื่อม** — ทุนมาจากรายจ่ายที่บันทึกจริงและผูก `projectId`                               |
| เอกสารเดิมใน `/print/billing` | ไม่ย้าย ไม่ migrate — เริ่มนับเลขใหม่                                                           |
| รูปแบบเลขที่                  | `{PREFIX}{YY}{MM}{NNN}` — running **3 หลัก** reset ทุกเดือน (ต่างจาก KK ที่ใช้ 4 หลักโดยตั้งใจ) |
| บริษัทผู้ออกเอกสาร            | **บริษัท ฃวด จำกัด (UAT) รายเดียว** — ไม่รองรับหลายบริษัท                                       |
| ความสัมพันธ์กับระบบ KK        | **แยกขาดจากกัน** — ไม่แชร์ข้อมูล ไม่ sync ไม่รวมรายงาน                                          |
| หัก ณ ที่จ่าย                 | ผู้ออกเอกสารเลือกเปิด/ปิดและเลือกอัตราเองทุกใบ (มีค่าตั้งต้น inherit มาให้)                     |
| e-Tax Invoice                 | ไม่อยู่ในขอบเขตรอบนี้ (ออกแบบให้ต่อยอดได้)                                                      |

---

## 2. ผลสำรวจระบบอ้างอิง — KK-LineOA-Checkinout

สำรวจที่ `/Users/athip-ch/Work/Korrakang/KK_Work/KK-LineOA-Checkinout` พบระบบบัญชีที่ใช้งานจริงและครบกว่าที่ spec v1 ออกแบบไว้ สเปคฉบับนี้จึงยืมโครงสร้างที่พิสูจน์แล้วมาใช้แทนการออกแบบใหม่

> **ขอบเขตการยืม: ยืมเฉพาะ "รูปแบบการออกแบบ" ไม่ยืมข้อมูล**
> `company_profiles` ของ KK มี seed บริษัท ฃวด จำกัด (UAT) ไว้ด้วย แต่ระบบสองตัวนี้**แยกขาดจากกันโดยเจตนา** — ไม่แชร์ฐานข้อมูล ไม่ sync customer/vendor/ผังบัญชี ไม่รวมรายงาน
> ระบบนี้ออกเอกสารในนามบริษัท ฃวด จำกัด รายเดียว (เลขผู้เสียภาษี `0105564177133`) และเดินเลขที่เอกสารชุดของตัวเอง

### สิ่งที่รับมาใช้

| แนวคิดจาก KK                                                       | ทำไมถึงดีกว่าที่ v1 ออกแบบไว้                                                                                                                                                            |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ตาราง `Document` รวมทุกประเภทเอกสาร**                            | v1 แยก 6 ตาราง (Invoice/BillingNote/Receipt/CreditNote/...) → ต้องเขียน numbering, lifecycle, PDF pipeline, หน้า list ซ้ำ 6 รอบ KK ใช้ตารางเดียว + `doc_type` discriminator จบในที่เดียว |
| **`Transaction` เป็นสมุดบัญชีกลาง**                                | v1 ไม่มีชั้นนี้เลย ทำให้ P&L ต้องไปไล่ sum จากหลายตาราง KK ใช้ 3 มิติ (`account_id` × `project_id` × `vendor_id`) query ข้ามมิติได้หมด                                                   |
| **`ChartOfAccount` ผังบัญชี**                                      | ทำให้จัดหมวดรายรับ-รายจ่ายได้จริง และส่งงบให้สำนักงานบัญชีได้ตรงรูปแบบ                                                                                                                   |
| **สาย revision `-R1` + `supersedes_doc_id` + `root_doc_id`**       | งานก่อสร้างแก้ใบเสนอราคาบ่อยมาก และฝ่ายจัดซื้อลูกค้ามัก mark เลข QT เดิมไว้ใน PO แล้ว                                                                                                    |
| **จำกัด revision เฉพาะ QUOTATION**                                 | เอกสารภาษีต้องมีเลขรันเดี่ยว แก้ต้องยกเลิกแล้วออกใหม่ — ตรงกับหลักการ §3.2                                                                                                               |
| **`WhtRate` เป็นตารางพร้อมอ้างมาตรา**                              | v1 ใช้ enum แข็ง KK ใช้ตาราง seed ได้ ปรับอัตราตอนกฎหมายเปลี่ยนได้โดยไม่ต้อง migrate                                                                                                     |
| **อัตราภาษี inherit: Project → Milestone → Document**              | ลดการกรอกซ้ำและลดโอกาสกรอกผิด override ได้ทุกชั้น                                                                                                                                        |
| **`docToTxAuto` — เฉพาะเอกสารที่เงินขยับจริงจึงสร้าง Transaction** | QT/IV/BN ไม่สร้าง, RC/PV/RV/WHT สร้าง — ตรงกับหลักจุดความรับผิด VAT ใน §3.1 พอดี                                                                                                         |
| **แนวคิด running number ต่อเดือน**                                 | รับแนวคิดมา แต่ใช้ **3 หลัก** (KK ใช้ 4) — เพดาน 999 ใบ/เดือน/ประเภท เพียงพอและเลขสั้นกว่า                                                                                               |

### สิ่งที่ไม่รับมาและเหตุผล

| ของ KK                                    | เหตุผลที่ไม่ใช้ตรง ๆ                                                                                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| เก็บรายการสินค้าใน `form_data` JSONB ล้วน | รายงานภาษีขาย/ซื้อและ P&L ต้อง query ระดับบรรทัด JSONB ทำให้ index และ join ยาก — ใช้ **ตาราง `DocumentItem` แบบ typed** แทน แล้วเก็บ `formData` ไว้เฉพาะ layout ของใบพิมพ์ |
| `nextDocNumber()` อ่าน max แล้ว +1        | มี race condition ถ้าออกเอกสารพร้อมกันสองคน — ใช้ `DocumentSequence` + `SELECT ... FOR UPDATE` แทน (§5.3)                                                                   |
| `calcTax()` คำนวณด้วย `number`            | ใช้ `Prisma.Decimal` ตลอด (§3.4)                                                                                                                                            |
| ตาราง `payments` แยกจาก transaction       | โปรเจกต์นี้มี `PaymentMilestone` อยู่แล้ว ใช้ `TransactionPayment` ผูกกับ transaction พอ                                                                                    |

---

## 3. หลักการสำคัญ 5 ข้อ

### 3.1 จุดความรับผิดในการเสีย VAT — เรื่องที่กำหนดทั้งโครงสร้าง

งานออกแบบและงานรับเหมาก่อสร้างจัดเป็น **"บริการ"** จุดความรับผิดในการเสียภาษีมูลค่าเพิ่ม (tax point) จึงเกิด **เมื่อได้รับชำระราคา** ไม่ใช่เมื่อออกใบแจ้งหนี้

- `IV` (ใบแจ้งหนี้) = **ไม่ใช่เอกสารภาษี** ยอด VAT บนใบเป็นข้อมูลประกอบให้ลูกค้าเตรียมเงิน ไม่เข้ารายงานภาษีขาย
- `RC` (ใบเสร็จรับเงิน/ใบกำกับภาษี) = จุดที่ภาษีขายเกิดจริง เข้ารายงานภาษีขายและ ภ.พ.30 ตามเดือนที่ออก RC
- รับชำระบางส่วน → ออก RC ตามยอดที่รับจริง VAT คิดตามสัดส่วน

กฎนี้ตรงกับ `MONEY_FLOW_DOC_TYPES` ของ KK พอดี — `QUOTATION`/`INVOICE`/`BILLING` ไม่สร้าง transaction ส่วน `RECEIPT`/`PAYMENT_VOUCHER`/`RECEIPT_VOUCHER`/`WHT_CERT` สร้าง

> ระบบเดิมของโปรเจกต์นี้คิด VAT ในหน้า print ตอนวางบิล ซึ่งจะทำให้ยอดภาษีขายเข้าผิดเดือนถ้านำไปยื่นจริง

### 3.2 เอกสารที่ยืนยันแล้วต้อง immutable

- `DRAFT` แก้ไขได้เต็มที่ **ยังไม่กินเลขที่เอกสาร**
- `CONFIRMED` ขึ้นไปล็อกทุกฟิลด์ที่เป็นสาระสำคัญ
- `VOIDED` = ยกเลิก **คงเลขที่ไว้ ห้ามนำกลับมาใช้ซ้ำ** เพราะสรรพากรต้องเห็นเลขต่อเนื่องไม่ขาดช่วง
- `SUPERSEDED` = ถูกแทนด้วยใบใหม่ (reissue หรือ revision)
- แก้ยอดหลังออกใบกำกับภาษีแล้ว → ออกใบลดหนี้/ใบเพิ่มหนี้ ไม่ใช่แก้ใบเดิม

**Revision (`-R1`) ใช้ได้กับ `QUOTATION` เท่านั้น** เอกสารภาษีต้องมีเลขรันเดี่ยว แก้ต้องยกเลิกแล้วออกใหม่

### 3.3 Snapshot ข้อมูล ณ วันออกเอกสาร

เอกสารทุกใบคัดลอกชื่อ/ที่อยู่/เลขผู้เสียภาษีของทั้งผู้ขายและผู้ซื้อลงในตัวเอกสาร ไม่ join สดตอน render — ลูกค้าย้ายที่อยู่ปีหน้า ใบกำกับที่ออกไปแล้วต้องยังแสดงที่อยู่เดิม

### 3.4 คำนวณเงินที่ backend ด้วย Decimal เท่านั้น

```
baseAmount  = subtotal - discountAmount
vatAmount   = round(baseAmount × vatRate, 2)
whtAmount   = round(baseAmount × whtRate, 2)      // คิดจากฐานก่อน VAT
grandTotal  = baseAmount + vatAmount
netAmount   = grandTotal - whtAmount
```

ใช้ `Prisma.Decimal` ตลอด ห้ามใช้ `number` ปัด 2 ตำแหน่งแบบ half-up ทุกขั้น frontend รับค่าที่คำนวณแล้วมาแสดงอย่างเดียว

### 3.5 แยก 3 ชั้นให้ชัด

```
PaymentMilestone   แผนเก็บเงิน        แก้ไขได้ตลอด
Document           เอกสารที่ออกจริง    ล็อกหลัง CONFIRMED
Transaction        รายการบัญชี         สมุดบัญชีกลาง เป็นแหล่งเดียวของรายงานทุกตัว
```

---

## 4. ผังเอกสารและการไหลของเงิน

```
┌── ฝั่งขาย (AR) ────────────────────────────────────────────────────┐

  Quotation (มีอยู่แล้ว)        PaymentMilestone (มีอยู่แล้ว)
  BOQ-linked, categories        แผนเก็บเงิน + อัตราภาษี
        │                              │
        └──────────────┬───────────────┘
                       ▼
               Document: IV  ── ใบแจ้งหนี้ ตั้งหนี้ ยังไม่ใช่เอกสารภาษี
                       │
           ┌───────────┴────────────┐
           ▼                        ▼
    Document: BN              Document: RC  ★ ภาษีขายเกิดที่นี่
      ใบวางบิล                 ใบเสร็จ/ใบกำกับภาษี
   (รวมหลาย IV)                     │
                                    ├─► Transaction (INCOME)  ── auto
                                    ├─► TransactionPayment (โอน/สด/เช็ค)
                                    └─► WhtCertificate (RECEIVED, 50 ทวิ จากลูกค้า)

    Document: CN / DN  ── ใบลดหนี้ / ใบเพิ่มหนี้

└────────────────────────────────────────────────────────────────────┘

┌── ฝั่งซื้อ (AP) ────────────────────────────────────────────────────┐

  Vendor ──► VendorContract ──► VendorMilestone   งวดจ่าย + อัตราภาษี
                  │                    │
                  └────────────────────┴──► Transaction (EXPENSE)  ★ ภาษีซื้อเกิดที่นี่
                                                    │  project_id → เข้า P&L
                                                    ├─► Document: PV (ใบสำคัญจ่าย)
                                                    ├─► TransactionPayment
                                                    └─► WhtCertificate (ISSUED, 50 ทวิ ให้ vendor)

  ค่าใช้จ่ายส่วนกลาง = Transaction ที่ project_id IS NULL (ไม่ต้องมี vendor ก็ได้)

└────────────────────────────────────────────────────────────────────┘

                        ทุกรายงานอ่านจาก Transaction
```

---

## 5. ระบบเลขที่เอกสาร

### 5.1 รูปแบบ

```
{PREFIX}{YY}{MM}{NNN}
   │      │    │    └─ running 3 หลัก reset ทุกเดือน (001–999)
   │      │    └────── เดือน ค.ศ.
   │      └─────────── ปี ค.ศ. 2 หลักท้าย
   └────────────────── ประเภทเอกสาร

ตัวอย่าง: IV2609020      ใบแจ้งหนี้ ใบที่ 20 ของเดือน ก.ย. 2026
          QT2609001-R1   ใบเสนอราคาฉบับแก้ไขครั้งที่ 1
```

### 5.2 ทำไม 3 หลัก (มติ)

UAT ใช้ **3 หลัก** ต่างจาก KK ที่ใช้ 4 หลักโดยตั้งใจ — สองระบบแยกขาดจากกันจึงไม่จำเป็นต้องใช้รูปแบบเดียวกัน

|                    | เพดาน/เดือน/ประเภท | ความยาว      |
| ------------------ | ------------------ | ------------ |
| 2 หลัก (แนวคิดแรก) | 99                 | `IV260920`   |
| **3 หลัก (มติ)**   | **999**            | `IV2609020`  |
| 4 หลัก (KK)        | 9,999              | `IV26090020` |

999 ใบต่อเดือนต่อประเภทเพียงพอกับปริมาณงานของ ฃวด อย่างชัดเจน และได้เลขที่สั้นกว่า KK หนึ่งหลัก

`DocumentSequence.digits` ยังคงเก็บจำนวนหลักไว้ในฐานข้อมูล ไม่ hardcode — ถ้าวันหนึ่งชนเพดานจริงจะขยายได้โดยไม่ต้องแก้โค้ด แต่**เลขที่ออกไปแล้วจะไม่ถูกแก้ย้อนหลัง**

### 5.3 การจ่ายเลข — แก้ race condition ของ KK

จ่ายเลขตอนเปลี่ยนสถานะเป็น `CONFIRMED` เท่านั้น เอกสาร `DRAFT` ยังไม่มีเลข

implement แล้วที่ `backend/src/modules/company/document-sequence.service.ts`

```ts
// เรียกจากใน prisma.$transaction ของ caller เสมอ เพื่อให้เลขถูกคืนถ้ายืนยันล้มเหลวกลางคัน
async next(tx: Prisma.TransactionClient, docType: DocType, at: Date): Promise<string> {
  const period = buildPeriod(at)                 // "2609"
  const rows = await tx.$queryRaw`
    INSERT INTO "document_sequences" ("docType", "period", "currentNo", "digits", "createdAt", "updatedAt")
    VALUES (${docType}::"DocType", ${period}, 1, 3, NOW(), NOW())
    ON CONFLICT ("docType", "period")
    DO UPDATE SET "currentNo" = "document_sequences"."currentNo" + 1, "updatedAt" = NOW()
    RETURNING "currentNo", "digits"`
  return formatDocNumber(docType, period, rows[0].currentNo, rows[0].digits)
}
```

ใช้ `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` ซึ่ง Postgres รับประกันว่า atomic
ในคำสั่งเดียว **ดีกว่าที่ v2 ร่างไว้เป็น `SELECT ... FOR UPDATE` + upsert** เพราะ
`FOR UPDATE` ล็อกแถวที่ยังไม่มีอยู่ไม่ได้ — ใบแรกของเดือนจะยังชนกันได้

ชั้นกันพลาดที่สอง: `@@unique` บน `Document.code`

**ทดสอบแล้ว** (`document-sequence.service.spec.ts`) — ยิง 60 ครั้งพร้อมกันบน Postgres จริง
ได้เลขไม่ซ้ำและต่อเนื่อง 001–060 ครบ, rollback คืนเลขได้, แต่ละประเภทนับแยก, ขึ้นเดือนใหม่ reset

### 5.4 ประเภทเอกสารและ prefix — ตามชุดของ KK

| DocType           | Prefix | เอกสาร                              | สร้าง Transaction | Revision ได้ |
| ----------------- | ------ | ----------------------------------- | ----------------- | ------------ |
| `QUOTATION`       | `QT`   | ใบเสนอราคา                          | —                 | ✓            |
| `INVOICE`         | `IV`   | ใบแจ้งหนี้                          | —                 | —            |
| `BILLING`         | `BN`   | ใบวางบิล                            | —                 | —            |
| `RECEIPT`         | `RC`   | ใบเสร็จรับเงิน/ใบกำกับภาษี          | ✓ INCOME          | —            |
| `PAYMENT_VOUCHER` | `PV`   | ใบสำคัญจ่าย                         | ✓ EXPENSE         | —            |
| `RECEIPT_VOUCHER` | `RV`   | ใบสำคัญรับ                          | ✓ INCOME          | —            |
| `WHT_CERT`        | `WHT`  | หนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ) | ✓ EXPENSE         | —            |
| `CREDIT_NOTE`     | `CN`   | ใบลดหนี้                            | ✓ INCOME (ติดลบ)  | —            |
| `DEBIT_NOTE`      | `DN`   | ใบเพิ่มหนี้                         | ✓ INCOME          | —            |

`CN`/`DN` เป็นส่วนที่เพิ่มจากชุดของ KK เพราะสเปคนี้ต้องรองรับภาษีเต็มรูปแบบ

### 5.5 `QT` ที่ชนกันอยู่เดิมในโปรเจกต์นี้

- `Quotation.code` = `QT-YYYY-NNNN` (`schema.prisma:952`)
- `Estimate.code` = `QT{YYYYMMDD}{NNN}` (`schema.prisma:396`)

สเปคนี้**ไม่แตะของเดิม** และ **ไม่สร้าง `QUOTATION` ใน `Document`** เพราะโปรเจกต์นี้มี `Quotation` ที่ผูก BOQ + categories อยู่แล้วซึ่งรวยกว่า — `Document` อ้างถึงผ่าน `quotationId` แทน

ถ้าภายหลังต้องการรวมรูปแบบเลขให้เป็นมาตรฐานเดียว `DocumentSequence` รองรับ `QT` ไว้แล้ว

---

## 6. Prisma Schema

### 6.1 Enums

```prisma
enum DocType {
  QUOTATION
  INVOICE
  BILLING
  RECEIPT
  PAYMENT_VOUCHER
  RECEIPT_VOUCHER
  WHT_CERT
  CREDIT_NOTE
  DEBIT_NOTE
}

/// lifecycle ของเอกสาร — แยกจากสถานะการชำระเงินโดยเจตนา
enum DocStatus {
  DRAFT
  CONFIRMED
  SUPERSEDED
  VOIDED
}

enum AccountType {
  INCOME
  EXPENSE
  ASSET
  LIABILITY
  EQUITY
}

enum TransactionType {
  INCOME
  EXPENSE
  LIABILITY
}

enum TransactionCategory {
  PROJECT          /// ผูกโครงการ
  OFFICE           /// ค่าใช้จ่ายส่วนกลาง
  SALARY
  TAX
  PRODUCT
  OTHER_INCOME
  DIRECTOR_LOAN
  LOAN_REPAYMENT
}

enum TransactionStatus {
  RECORDED
  APPROVED
  PAID
  VOIDED
}

enum PaymentMethod {
  CASH
  TRANSFER
  CHEQUE
  CREDIT_CARD
  OTHER
}

enum VendorEntityType {
  COMPANY
  INDIVIDUAL
}

enum VendorCategory {
  SERVICE
  SUBCONTRACTOR   /// ผู้รับเหมาช่วง
  SUPPLIER        /// ร้านวัสดุ
}

enum ContractStatusAp {
  DRAFT
  ACTIVE
  COMPLETED
  CANCELLED
}

enum MilestoneStatus {
  PENDING
  APPROVED
  PARTIAL
  PAID
}

enum WhtDirection {
  RECEIVED  /// ลูกค้าออกให้เรา
  ISSUED    /// เราออกให้ vendor
}

enum WhtFormType {
  PND3   /// ผู้รับเป็นบุคคลธรรมดา
  PND53  /// ผู้รับเป็นนิติบุคคล
}
```

### 6.2 Foundation

```prisma
/// ข้อมูลบริษัทผู้ออกเอกสาร — ระบบนี้มีแถวเดียว (บริษัท ฃวด จำกัด)
/// เก็บเป็นตารางแทน hardcode ใน JSX เพื่อให้แก้ที่อยู่/โลโก้/ลายเซ็นได้จากหน้าตั้งค่า
/// ไม่ทำ company selector ใน UI — service ดึงแถว isDefault เสมอ
model CompanyProfile {
  id              Int     @id @default(autoincrement())
  code            String  @unique          /// "UAT"
  name            String
  branchName      String  @default("สำนักงานใหญ่")
  branchCode      String  @default("00000")
  taxId           String?
  address         String?
  contactLine     String?                  /// บรรทัดโทร/อีเมลบนหัวเอกสาร
  logoUrl         String?
  signatureUrl    String?
  signatureName   String?                  /// "( อธิป ชลสวัสดิ์ )"
  isVatRegistered Boolean @default(true)
  defaultVatRate  Decimal @default(0.07) @db.Decimal(5, 4)
  isDefault       Boolean @default(false)

  bankAccounts BankAccount[]
  documents    Document[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@map("company_profiles")
}

model BankAccount {
  id          Int     @id @default(autoincrement())
  companyId   Int
  name        String                          /// ชื่อย่อ "กสิกร ออมทรัพย์หลัก"
  bankName    String
  branchName  String?
  accountType String  @default("ออมทรัพย์")
  accountName String
  accountNo   String
  isDefault   Boolean @default(false)
  isActive    Boolean @default(true)
  sortOrder   Int     @default(0)

  company      CompanyProfile       @relation(fields: [companyId], references: [id])
  payments     TransactionPayment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("bank_accounts")
}

model DocumentSequence {
  id        Int     @id @default(autoincrement())
  docType   DocType
  period    String                  /// "YYMM"
  currentNo Int     @default(0)
  digits    Int     @default(3)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([docType, period])
  @@map("document_sequences")
}

/// ผังบัญชี — โครงสร้าง parent/child ตามเลขบัญชี
model ChartOfAccount {
  id       Int         @id @default(autoincrement())
  code     String      @unique     /// "5100"
  name     String
  type     AccountType
  parentId Int?
  isActive Boolean     @default(true)

  parent       ChartOfAccount?  @relation("AccountTree", fields: [parentId], references: [id])
  children     ChartOfAccount[] @relation("AccountTree")
  transactions Transaction[]
  budgets      ProjectBudget[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("chart_of_accounts")
}

/// อัตราหัก ณ ที่จ่าย — ตารางแทน enum เพื่อปรับได้เมื่อกฎหมายเปลี่ยน
model WhtRate {
  id          Int     @id @default(autoincrement())
  code        String  @unique       /// "WHT3"
  rate        Decimal @db.Decimal(5, 4)
  description String               /// "ค่าจ้างทำของ / ค่าบริการ (มาตรา 40(7)(8))"
  section     String?              /// "40(7)(8)"
  isActive    Boolean @default(true)
  sortOrder   Int     @default(0)

  @@map("wht_rates")
}

/// รอบบัญชีรายเดือน — ปิดงวดแล้วห้ามบันทึกย้อนหลัง
model FiscalPeriod {
  id         Int       @id @default(autoincrement())
  year       Int
  month      Int
  isClosed   Boolean   @default(false)
  closedAt   DateTime?
  closedById Int?

  @@unique([year, month])
  @@map("fiscal_periods")
}
```

### 6.3 Document — ตารางกลางของเอกสารทุกประเภท

```prisma
model Document {
  id        Int       @id @default(autoincrement())
  /// {PREFIX}{YY}{MM}{NNN} — null ขณะเป็น DRAFT
  code      String?   @unique
  docType   DocType
  status    DocStatus @default(DRAFT)

  companyId Int

  /// คู่สัญญา — ฝั่งขายใช้ customerId ฝั่งซื้อใช้ vendorId
  customerId Int?
  vendorId   Int?

  /// การเชื่อมโยง
  projectId       Int?
  quotationId     Int?   /// อ้าง Quotation เดิมของระบบ (ไม่สร้าง QT ใน Document)
  transactionId   Int?   /// สร้างอัตโนมัติเมื่อ confirm เอกสารที่เงินขยับจริง
  referenceDocId  Int?   /// IV อ้าง BN, RC อ้าง IV
  referenceNumber String?

  /// สาย revision / supersede
  supersedesDocId Int?
  rootDocId       Int?
  revisionNo      Int  @default(0)

  documentDate DateTime
  dueDate      DateTime?

  /// ── snapshot ผู้ขาย ณ วันออก ──
  sellerName       String?
  sellerBranchCode String?
  sellerTaxId      String?
  sellerAddress    String?
  sellerContact    String?

  /// ── snapshot คู่สัญญา ณ วันออก ──
  partyName       String?
  partyBranchCode String?
  partyTaxId      String?
  partyAddress    String?
  partyContact    String?
  partyPhone      String?
  partyEmail      String?

  /// ── ยอดเงิน (denormalized เพื่อ query) ──
  subtotal       Decimal @default(0) @db.Decimal(15, 2)
  discountAmount Decimal @default(0) @db.Decimal(15, 2)
  baseAmount     Decimal @default(0) @db.Decimal(15, 2)
  vatRate        Decimal @default(0.07) @db.Decimal(5, 4)
  vatAmount      Decimal @default(0) @db.Decimal(15, 2)
  whtRateId      Int?
  whtRate        Decimal @default(0) @db.Decimal(5, 4)
  whtAmount      Decimal @default(0) @db.Decimal(15, 2)
  grandTotal     Decimal @default(0) @db.Decimal(15, 2)
  netAmount      Decimal @default(0) @db.Decimal(15, 2)

  /// layout ของใบพิมพ์เท่านั้น (เงื่อนไขชำระเงิน, บรรทัดหมายเหตุสี, checkbox วิธีชำระ)
  /// ห้ามเก็บยอดเงินหรือข้อมูลที่ต้องใช้ทำรายงานไว้ที่นี่
  formData   Json?
  pdfOptions Json?

  note         String?
  internalNote String?

  createdById  Int
  confirmedAt  DateTime?
  confirmedById Int?
  voidedAt     DateTime?
  voidedById   Int?
  voidReason   String?

  company        CompanyProfile     @relation(fields: [companyId], references: [id])
  customer       Customer?          @relation(fields: [customerId], references: [id])
  vendor         Vendor?            @relation(fields: [vendorId], references: [id])
  project        Project?           @relation(fields: [projectId], references: [id])
  quotation      Quotation?         @relation(fields: [quotationId], references: [id])
  transaction    Transaction?       @relation(fields: [transactionId], references: [id])
  referenceDoc   Document?          @relation("DocRef", fields: [referenceDocId], references: [id])
  referencedBy   Document[]         @relation("DocRef")
  supersedesDoc  Document?          @relation("DocSupersede", fields: [supersedesDocId], references: [id])
  supersededBy   Document?          @relation("DocSupersede")
  rootDoc        Document?          @relation("DocRevision", fields: [rootDocId], references: [id])
  revisions      Document[]         @relation("DocRevision")
  whtRateRef     WhtRate?           @relation(fields: [whtRateId], references: [id])
  items          DocumentItem[]
  allocations    DocumentAllocation[] @relation("AllocFrom")
  allocatedFrom  DocumentAllocation[] @relation("AllocTo")
  whtCerts       WhtCertificate[]
  files          FileAsset[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@unique([supersedesDocId])
  @@unique([rootDocId, revisionNo])
  @@index([docType, status])
  @@index([projectId])
  @@index([customerId])
  @@index([documentDate])
  @@map("documents")
}

/// รายการในเอกสาร — typed แทน JSONB เพื่อให้ทำรายงานระดับบรรทัดได้
model DocumentItem {
  id                 Int     @id @default(autoincrement())
  documentId         Int
  paymentMilestoneId Int?
  vendorMilestoneId  Int?
  name               String
  description        String?
  quantity           Decimal @default(1) @db.Decimal(10, 3)
  unit               String?
  unitPrice          Decimal @default(0) @db.Decimal(15, 2)
  amount             Decimal @default(0) @db.Decimal(15, 2)
  isNote             Boolean @default(false)   /// บรรทัดหมายเหตุ ไม่คิดเงิน
  isDiscount         Boolean @default(false)
  sortOrder          Int     @default(0)

  document         Document          @relation(fields: [documentId], references: [id], onDelete: Cascade)
  paymentMilestone PaymentMilestone? @relation(fields: [paymentMilestoneId], references: [id])
  vendorMilestone  VendorMilestone?  @relation(fields: [vendorMilestoneId], references: [id])

  @@map("document_items")
}

/// การตัดยอดระหว่างเอกสาร — RC ตัด IV ได้หลายใบ, BN รวม IV ได้หลายใบ
model DocumentAllocation {
  id           Int     @id @default(autoincrement())
  fromDocId    Int     /// RC หรือ BN
  toDocId      Int     /// IV
  amount       Decimal @db.Decimal(15, 2)

  fromDoc Document @relation("AllocFrom", fields: [fromDocId], references: [id], onDelete: Cascade)
  toDoc   Document @relation("AllocTo", fields: [toDocId], references: [id])

  @@unique([fromDocId, toDocId])
  @@map("document_allocations")
}
```

### 6.4 Transaction — สมุดบัญชีกลาง

```prisma
model Transaction {
  id     Int                 @id @default(autoincrement())
  code   String              @unique          /// TXN-YYYY-NNNN
  date   DateTime
  type   TransactionType
  category TransactionCategory
  status TransactionStatus   @default(RECORDED)

  /// 3 มิติ — nullable ทั้งหมด เพื่อ query เดี่ยวหรือข้ามมิติได้
  accountId  Int?
  projectId  Int?
  vendorId   Int?
  customerId Int?

  /// ผูกงวด
  paymentMilestoneId Int?
  vendorContractId   Int?
  vendorMilestoneId  Int?

  description String
  amount      Decimal @db.Decimal(15, 2)

  vatRate   Decimal @default(0) @db.Decimal(5, 4)
  vatAmount Decimal @default(0) @db.Decimal(15, 2)
  whtRate   Decimal @default(0) @db.Decimal(5, 4)
  whtAmount Decimal @default(0) @db.Decimal(15, 2)
  netAmount Decimal @db.Decimal(15, 2)

  /// เลขใบกำกับภาษีของคู่ค้า — จำเป็นสำหรับรายงานภาษีซื้อ
  taxInvoiceNo   String?
  taxInvoiceDate DateTime?

  paymentStatus  MilestoneStatus @default(PENDING)
  paidAmount     Decimal         @default(0) @db.Decimal(15, 2)
  paymentDueDate DateTime?

  isAuto       Boolean @default(false)   /// สร้างจากเอกสารอัตโนมัติ
  createdById  Int
  approvedById Int?

  account          ChartOfAccount?      @relation(fields: [accountId], references: [id])
  project          Project?             @relation(fields: [projectId], references: [id])
  vendor           Vendor?              @relation(fields: [vendorId], references: [id])
  customer         Customer?            @relation(fields: [customerId], references: [id])
  paymentMilestone PaymentMilestone?    @relation(fields: [paymentMilestoneId], references: [id])
  vendorContract   VendorContract?      @relation(fields: [vendorContractId], references: [id])
  vendorMilestone  VendorMilestone?     @relation(fields: [vendorMilestoneId], references: [id])
  documents        Document[]
  payments         TransactionPayment[]
  files            FileAsset[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([date])
  @@index([type, category])
  @@index([projectId])
  @@index([vendorId])
  @@map("transactions")
}

/// การรับ/จ่ายเงินจริง — 1 transaction มีได้หลายครั้ง
model TransactionPayment {
  id            Int           @id @default(autoincrement())
  code          String        @unique      /// PAY-YYYY-NNNN
  transactionId Int
  date          DateTime
  amount        Decimal       @db.Decimal(15, 2)
  method        PaymentMethod
  bankAccountId Int?
  chequeNo      String?
  chequeDate    DateTime?
  chequeBank    String?
  reference     String?
  slipFileId    Int?
  note          String?
  createdById   Int

  transaction Transaction  @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  bankAccount BankAccount? @relation(fields: [bankAccountId], references: [id])

  createdAt DateTime @default(now())

  @@map("transaction_payments")
}
```

### 6.5 AP — Vendor

```prisma
model Vendor {
  id         Int              @id @default(autoincrement())
  code       String           @unique        /// VD-YYYY-NNN
  name       String
  nickname   String?
  entityType VendorEntityType @default(COMPANY)
  category   VendorCategory   @default(SERVICE)

  taxId            String?
  isVatRegistered  Boolean @default(false)
  branchCode       String? @default("00000")
  defaultWhtRateId Int?

  contactName String?
  phone       String?
  email       String?
  address     String?
  subdistrict String?
  district    String?
  province    String?
  postcode    String?

  bankName        String?
  bankAccountNo   String?
  bankAccountName String?

  paymentTermsDays Int     @default(30)
  note             String?
  isActive         Boolean @default(true)

  defaultWhtRate WhtRate?         @relation(fields: [defaultWhtRateId], references: [id])
  contracts      VendorContract[]
  transactions   Transaction[]
  documents      Document[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@map("vendors")
}

/// สัญญาจ้าง vendor ต่อโครงการ — 1 โครงการมีหลาย vendor ได้
model VendorContract {
  id        Int              @id @default(autoincrement())
  code      String           @unique      /// VC-YYYY-NNN
  projectId Int?
  vendorId  Int
  status    ContractStatusAp @default(DRAFT)

  scopeOfWork    String
  contractAmount Decimal @db.Decimal(15, 2)

  /// inherit จาก vendor แล้ว override ได้
  vatRate   Decimal @default(0) @db.Decimal(5, 4)
  whtRateId Int?
  whtRate   Decimal @default(0.03) @db.Decimal(5, 4)

  startDate DateTime?
  endDate   DateTime?
  note      String?

  project      Project?          @relation(fields: [projectId], references: [id])
  vendor       Vendor            @relation(fields: [vendorId], references: [id])
  whtRateRef   WhtRate?          @relation(fields: [whtRateId], references: [id])
  milestones   VendorMilestone[]
  transactions Transaction[]
  files        FileAsset[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@map("vendor_contracts")
}

model VendorMilestone {
  id              Int             @id @default(autoincrement())
  contractId      Int
  milestoneNumber Int
  name            String
  description     String?

  amount     Decimal  @db.Decimal(15, 2)
  percentage Decimal? @db.Decimal(5, 2)

  vatRate       Decimal @default(0) @db.Decimal(5, 4)
  vatAmount     Decimal @default(0) @db.Decimal(15, 2)
  amountWithVat Decimal @default(0) @db.Decimal(15, 2)
  whtRate       Decimal @default(0.03) @db.Decimal(5, 4)
  whtAmount     Decimal @default(0) @db.Decimal(15, 2)
  netPayable    Decimal @default(0) @db.Decimal(15, 2)

  dueDate    DateTime?
  status     MilestoneStatus @default(PENDING)
  paidAmount Decimal         @default(0) @db.Decimal(15, 2)
  paidDate   DateTime?

  contract      VendorContract @relation(fields: [contractId], references: [id], onDelete: Cascade)
  transactions  Transaction[]
  documentItems DocumentItem[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([contractId, milestoneNumber])
  @@map("vendor_milestones")
}

/// งบประมาณโครงการแยกตามหมวดบัญชี — เทียบ budget vs actual
model ProjectBudget {
  id           Int     @id @default(autoincrement())
  projectId    Int
  accountId    Int
  budgetAmount Decimal @db.Decimal(15, 2)
  note         String?

  project Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  account ChartOfAccount @relation(fields: [accountId], references: [id])

  @@unique([projectId, accountId])
  @@map("project_budgets")
}
```

### 6.6 หนังสือรับรองหัก ณ ที่จ่าย

```prisma
model WhtCertificate {
  id        Int          @id @default(autoincrement())
  direction WhtDirection
  /// WHT{YY}{MM}{NNN} — เฉพาะ ISSUED
  code      String?      @unique
  /// เลขบนเอกสารที่ลูกค้าออกให้ — เฉพาะ RECEIVED
  externalNo String?
  formType  WhtFormType
  issueDate DateTime

  whtRateId  Int?
  incomeDesc String
  baseAmount Decimal @db.Decimal(15, 2)
  taxRate    Decimal @db.Decimal(5, 4)
  taxAmount  Decimal @db.Decimal(15, 2)

  payerName  String
  payerTaxId String
  payeeName  String
  payeeTaxId String

  documentId    Int?
  transactionId Int?
  fileId        Int?

  whtRateRef WhtRate?  @relation(fields: [whtRateId], references: [id])
  document   Document? @relation(fields: [documentId], references: [id])

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([direction, issueDate])
  @@map("wht_certificates")
}
```

### 6.7 การแก้ไข model เดิม — additive ทั้งหมด

```prisma
model Project {
  // ...ของเดิม
  /// default ภาษีฝั่งลูกค้า inherit ลงทุก PaymentMilestone
  billingVatRate Decimal @default(0.07) @db.Decimal(5, 4)
  billingWhtRate Decimal @default(0)    @db.Decimal(5, 4)

  documents       Document[]
  transactions    Transaction[]
  vendorContracts VendorContract[]
  budgets         ProjectBudget[]
}

model PaymentMilestone {
  // ...ของเดิม — เพิ่มฟิลด์ภาษีที่ยังไม่มี
  vatRate       Decimal @default(0.07) @db.Decimal(5, 4)
  vatAmount     Decimal @default(0)    @db.Decimal(15, 2)
  amountWithVat Decimal @default(0)    @db.Decimal(15, 2)
  whtRate       Decimal @default(0)    @db.Decimal(5, 4)
  whtAmount     Decimal @default(0)    @db.Decimal(15, 2)
  netReceivable Decimal @default(0)    @db.Decimal(15, 2)
  /// ระบบคำนวณจาก allocation — ห้ามแก้มือ
  paidAmount    Decimal @default(0)    @db.Decimal(15, 2)

  documentItems DocumentItem[]
  transactions  Transaction[]
}

model Customer {
  // ...ของเดิม
  branchCode String? @default("00000")   /// จำเป็นสำหรับใบกำกับภาษีนิติบุคคล
  documents  Document[]
  transactions Transaction[]
}

model Quotation {
  // ...ของเดิม
  documents Document[]
}

model FileAsset {
  // ...ของเดิม — เพิ่ม FK nullable
  documentId    Int?
  transactionId Int?
  contractApId  Int?
}
```

ไม่มีการลบหรือเปลี่ยนชนิดฟิลด์เดิม — migration เป็น additive ล้วน

---

## 7. Business Rules

### 7.1 Document lifecycle

| การกระทำ  | กฎ                                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------------------- |
| `create`  | สร้างเป็น `DRAFT` ยังไม่มีเลขที่ แก้ไขได้เต็มที่                                                                       |
| `confirm` | ใน transaction เดียว: จ่ายเลข → snapshot ผู้ขาย/คู่สัญญา → ตรึงยอด → ถ้าเป็น money-flow doc สร้าง `Transaction` (§7.2) |
| `update`  | เฉพาะ `DRAFT` สถานะอื่นแก้ได้แค่ `internalNote`                                                                        |
| `void`    | ต้องระบุเหตุผล คงเลขที่ไว้ ถ้ามี transaction ผูกอยู่ต้อง void transaction ด้วยใน transaction เดียวกัน                  |
| `reissue` | ออกใบใหม่เลขใหม่ ชี้ `supersedesDocId` กลับใบเก่า ใบเก่า → `SUPERSEDED`                                                |
| `revise`  | เฉพาะ `QUOTATION` — เลขฐานเดิม + `-R{n}`, `rootDocId` ชี้ใบต้นฉบับ, `revisionNo` +1                                    |

### 7.2 กฎการสร้าง Transaction อัตโนมัติ

ยึดตาม `MONEY_FLOW_DOC_TYPES` ของ KK — เอกสารก่อนเงินขยับไม่สร้าง transaction

| DocType                             | Transaction | type                | category                                          |
| ----------------------------------- | ----------- | ------------------- | ------------------------------------------------- |
| `QUOTATION` / `INVOICE` / `BILLING` | ไม่สร้าง    | —                   | —                                                 |
| `RECEIPT`                           | สร้าง       | `INCOME`            | `PROJECT` ถ้ามี projectId, ไม่งั้น `OTHER_INCOME` |
| `RECEIPT_VOUCHER`                   | สร้าง       | `INCOME`            | `OTHER_INCOME`                                    |
| `PAYMENT_VOUCHER`                   | สร้าง       | `EXPENSE`           | `PROJECT` ถ้ามี projectId, ไม่งั้น `OFFICE`       |
| `WHT_CERT`                          | สร้าง       | `EXPENSE`           | `TAX`                                             |
| `CREDIT_NOTE`                       | สร้าง       | `INCOME` (ยอดติดลบ) | ตามใบต้นฉบับ                                      |
| `DEBIT_NOTE`                        | สร้าง       | `INCOME`            | ตามใบต้นฉบับ                                      |

ต้อง **idempotent** — ถ้า `document.transactionId` มีค่าแล้วให้คืนตัวเดิม ไม่สร้างซ้ำ (KK ทำแบบนี้และถูกต้อง)

### 7.3 การตัดยอด

- `RC` ตัด `IV` ผ่าน `DocumentAllocation` ยอดตัดห้ามเกิน `IV.netAmount − ยอดที่ตัดไปแล้ว`
- ผลข้างเคียงใน transaction เดียว: อัปเดต `PaymentMilestone.paidAmount` + `status` และ `Transaction.paidAmount` + `paymentStatus`
- void `RC` → rollback ทุก allocation ที่ผูกอยู่
- Reconcile job รายคืน: ตรวจ `paidAmount` เทียบผลรวม allocation ทุกใบ แจ้งเตือนถ้าไม่ตรง

### 7.4 อัตราภาษี inherit

```
Project.billingVatRate / billingWhtRate
        ↓ (auto-fill, override ได้)
PaymentMilestone.vatRate / whtRate
        ↓ (auto-fill, override ได้)
Document.vatRate / whtRate

Vendor.isVatRegistered → vatRate (7% หรือ 0%)
Vendor.defaultWhtRateId → whtRate
        ↓ (auto-fill, override ได้)
VendorContract.vatRate / whtRate
        ↓ (auto-fill, override ได้)
VendorMilestone.vatRate / whtRate
```

### 7.5 ภาษีซื้อ

- นับเข้ารายงานภาษีซื้อตาม `Transaction.taxInvoiceDate` (วันที่บนใบกำกับของผู้ขาย) **ไม่ใช่** `Transaction.date`
- บังคับกรอก `taxInvoiceNo` เมื่อ `vatAmount > 0` มิฉะนั้นเครดิตภาษีซื้อไม่ได้
- vendor ที่ `isVatRegistered = false` → `vatRate = 0` อัตโนมัติ

### 7.6 P&L รายโครงการ

```
รายได้        = Σ Transaction.amount   where type=INCOME,  projectId=X, status≠VOIDED
ต้นทุน+รายจ่าย = Σ Transaction.amount   where type=EXPENSE, projectId=X, status≠VOIDED
กำไรขั้นต้น    = รายได้ − ต้นทุน+รายจ่าย
Margin %      = กำไรขั้นต้น ÷ รายได้ × 100
```

ใช้ยอด `amount` (ก่อน VAT) ทั้งสองฝั่ง เพราะ VAT ไม่ใช่รายได้และไม่ใช่ค่าใช้จ่าย
แยก breakdown ตาม `ChartOfAccount` และเทียบกับ `ProjectBudget` ได้
เกณฑ์เงินสดใช้ `TransactionPayment` แทน

---

## 8. Chart of Accounts เริ่มต้น — ปรับสำหรับธุรกิจออกแบบและก่อสร้าง

```
4000 รายได้
  4100 รายได้งานออกแบบ
  4200 รายได้งานก่อสร้าง
  4300 รายได้งานตกแต่งภายใน
  4400 รายได้งานควบคุมงาน / ที่ปรึกษา
  4900 รายได้อื่น

5000 ต้นทุนงานก่อสร้าง
  5100 ค่าวัสดุก่อสร้าง
  5200 ค่าแรงงาน
  5300 ค่าจ้างผู้รับเหมาช่วง
  5400 ค่าเช่าเครื่องจักร / อุปกรณ์
  5500 ค่าขนส่ง
  5600 ค่าที่ปรึกษา / วิชาชีพ (วิศวกร, สถาปนิก outsource)
  5700 ค่าธรรมเนียมขออนุญาต / ราชการ
  5800 ค่าสาธารณูปโภคหน้างาน
  5900 ต้นทุนงานอื่น

6000 ค่าใช้จ่ายสำนักงาน
  6100 เงินเดือนพนักงาน
  6200 ประกันสังคม (สมทบนายจ้าง)
  6300 ค่าเช่าสำนักงาน
  6400 ค่าน้ำ-ไฟ
  6500 ค่าอินเทอร์เน็ต / โทรศัพท์
  6600 ค่าอุปกรณ์สำนักงาน
  6700 ค่าอุปกรณ์ IT / ซอฟต์แวร์
  6800 ค่าเดินทาง / ค่าน้ำมัน
  6900 ค่ารับรอง / เลี้ยงทีม
  6950 ค่าใช้จ่ายเบ็ดเตล็ด

7000 ค่าใช้จ่ายอื่น
  7100 ดอกเบี้ยจ่าย
  7200 ค่าธรรมเนียมธนาคาร
  7300 ค่าปรับ / เบี้ยปรับ

2000 หนี้สิน
  2100 เงินกู้ยืมกรรมการ
  2900 หนี้สินอื่น

3000 ทุน
  3100 ทุนจดทะเบียน
```

## 9. Withholding Tax Rates เริ่มต้น

| code   | rate | มาตรา    | คำอธิบาย                              |
| ------ | ---- | -------- | ------------------------------------- |
| `WHT0` | 0%   | —        | ไม่หัก ณ ที่จ่าย                      |
| `WHT1` | 1%   | 40(8)    | ค่าขนส่ง                              |
| `WHT2` | 2%   | 40(8)    | ค่าโฆษณา                              |
| `WHT3` | 3%   | 40(7)(8) | ค่าจ้างทำของ / ค่ารับเหมา / ค่าบริการ |
| `WHT5` | 5%   | 40(5)(6) | ค่าเช่าทรัพย์สิน                      |

---

## 10. API Contract

```
# Settings
GET|PUT    /company                        โปรไฟล์บริษัท (แถวเดียว ไม่มี selector)
GET|POST   /company/bank-accounts          (ไม่มี :id เพราะมีบริษัทเดียว)
PATCH|DELETE /company/bank-accounts/:id
GET        /chart-of-accounts              ผังบัญชีแบบ tree
GET        /chart-of-accounts/options      รายการแบนสำหรับ dropdown
POST|PATCH|DELETE /chart-of-accounts[/:id]
GET|POST   /wht-rates  |  PATCH /wht-rates/:id
GET        /fiscal-periods
POST       /fiscal-periods/close  |  POST /fiscal-periods/:id/reopen
GET        /document-sequences             ดูเลขล่าสุดและเลขถัดไป (read-only)

# Documents — endpoint เดียวครอบทุกประเภท
POST       /documents                      สร้าง DRAFT { docType, ... }
POST       /documents/from-milestones      สร้าง IV จากงวดเงินที่เลือก
GET        /documents                      filter: docType, status, projectId, customerId, vendorId, dateFrom/To, search
GET        /documents/:id
PATCH      /documents/:id                  เฉพาะ DRAFT
POST       /documents/:id/confirm          จ่ายเลข + snapshot + auto transaction
POST       /documents/:id/void             { reason }
POST       /documents/:id/reissue          ออกใบใหม่แทน
POST       /documents/:id/revise           เฉพาะ QUOTATION → -R{n}
POST       /documents/:id/allocate         { toDocId, amount } ตัดยอด
DELETE     /documents/:id                  เฉพาะ DRAFT
GET        /documents/:id/print-data       payload สำหรับหน้าพิมพ์ (คำนวณเสร็จแล้ว)

# Transactions
GET|POST   /transactions                   filter ครบทุกมิติ
GET|PATCH  /transactions/:id
POST       /transactions/:id/approve
POST       /transactions/:id/void
GET|POST   /transactions/:id/payments      บันทึกรับ/จ่ายเงินจริง

# AP
GET|POST   /vendors  |  GET|PATCH /vendors/:id  |  GET /vendors/:id/statement
GET|POST   /vendor-contracts  |  GET|PATCH /vendor-contracts/:id
GET|POST   /vendor-contracts/:id/milestones
PATCH      /vendor-milestones/:id

# WHT
GET|POST   /wht-certificates               filter: direction, formType, month
GET        /wht-certificates/:id/print-data

# Reports  (ทุกตัวรองรับ ?format=csv)
GET /accounting/reports/ar-aging                  ?asOf=
GET /accounting/reports/ap-aging                  ?asOf=
GET /accounting/reports/sales-tax                 ?month=YYYY-MM   รายงานภาษีขาย
GET /accounting/reports/purchase-tax              ?month=YYYY-MM   รายงานภาษีซื้อ
GET /accounting/reports/pp30                      ?month=YYYY-MM   ภ.พ.30
GET /accounting/reports/pnd                       ?form=PND3|PND53&month=
GET /accounting/reports/profit-loss                ?from=&to=       งบกำไรขาดทุน
GET /accounting/reports/cash-flow                  ?from=&to=
GET /accounting/reports/project-pnl                ?projectId=&basis=accrual|cash
GET /accounting/reports/project-pnl/overview       ทุกโครงการ
GET /accounting/reports/project-budget-vs-actual   ?projectId=
```

---

## 11. Permissions

เพิ่มใน `backend/prisma/seed.ts` — `PERMISSIONS`

```ts
// Documents (AR + เอกสารทุกประเภท)
{ key: 'document.view',    name: 'ดูเอกสาร',            group: 'billing' },
{ key: 'document.create',  name: 'สร้างเอกสาร',          group: 'billing' },
{ key: 'document.confirm', name: 'ยืนยัน/ออกเอกสาร',     group: 'billing' },
{ key: 'document.void',    name: 'ยกเลิกเอกสาร',         group: 'billing' },
// Transactions
{ key: 'transaction.view',    name: 'ดูรายการบัญชี',     group: 'accounting' },
{ key: 'transaction.create',  name: 'บันทึกรายการบัญชี',  group: 'accounting' },
{ key: 'transaction.approve', name: 'อนุมัติรายการบัญชี', group: 'accounting' },
{ key: 'transaction.pay',     name: 'บันทึกรับ/จ่ายเงิน', group: 'accounting' },
// AP
{ key: 'vendor.view',    name: 'ดูผู้ขาย',              group: 'ap' },
{ key: 'vendor.manage',  name: 'จัดการผู้ขาย',           group: 'ap' },
{ key: 'apcontract.view',   name: 'ดูสัญญาผู้ขาย',       group: 'ap' },
{ key: 'apcontract.manage', name: 'จัดการสัญญาผู้ขาย',   group: 'ap' },
// Accounting
{ key: 'accounting.report',   name: 'ดูรายงานบัญชี',     group: 'accounting' },
{ key: 'accounting.settings', name: 'ตั้งค่าบัญชี',       group: 'accounting' },
{ key: 'accounting.close',    name: 'ปิดงวดบัญชี',        group: 'accounting' },
```

| Role              | สิทธิ์                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `ADMIN`           | ทั้งหมด                                                                                                       |
| `ACCOUNTANT`      | ทั้งหมดในกลุ่ม billing / ap / accounting                                                                      |
| `PROJECT_MANAGER` | `document.view`, `transaction.view`, `transaction.create`, `vendor.view`, `apcontract.*`, `accounting.report` |
| `SALE`            | `document.view`, `document.create`                                                                            |
| `CUSTOMER`        | `document.view` — กรองเฉพาะของตัวเองผ่าน Client Portal                                                        |

---

## 12. โครงสร้างโค้ด

### Backend

```
backend/src/modules/
├── company/          CompanyProfile, BankAccount, DocumentSequence, ChartOfAccount, WhtRate, FiscalPeriod
│   └── document-sequence.service.ts   ← export ให้โมดูลอื่นใช้
├── documents/        Document, DocumentItem, DocumentAllocation + confirm/void/reissue/revise
│   ├── document-number.service.ts
│   ├── document-snapshot.service.ts
│   └── document-to-transaction.service.ts   ← พอร์ตจาก docToTxAuto.ts ของ KK
├── transactions/     Transaction, TransactionPayment
├── vendors/          Vendor, VendorContract, VendorMilestone
├── wht/              WhtCertificate
└── accounting/       รายงานทั้งหมด (read-only)

backend/src/common/utils/
├── money.util.ts        คำนวณ VAT/WHT/ปัดเศษ ด้วย Decimal — พอร์ตจาก taxCalc.ts แต่ใช้ Decimal
└── baht-text.util.ts    ย้าย bahtText() จากหน้า print มา backend
```

ทุกโมดูลตามแบบแผนเดิม: `@ApiBearerAuth()` + `@ApiTags()` + `@Permissions()` ต่อ endpoint, `ActivityLogService` ทุก mutation, `PaginationDto` + `buildPaginationMeta`, error ภาษาไทย

### Frontend

```
frontend/src/app/admin/
├── documents/            รายการเอกสารทุกประเภท + filter ตาม docType
│   ├── new/              ฟอร์มสร้าง เลือกประเภทแล้วสลับ field
│   └── [id]/
├── transactions/         รายรับ-รายจ่าย
├── vendors/              ผู้ขาย + สัญญา + งวดจ่าย
├── accounting/           รายงานทั้งหมด
└── settings/company      บริษัท + บัญชีธนาคาร + ผังบัญชี + อัตรา WHT

frontend/src/app/print/
└── document/[id]/        หน้าเดียวรองรับทุก docType — เลือก template จาก docType

frontend/src/hooks/       useDocuments, useTransactions, useVendors, useAccounting
```

หน้าพิมพ์ **หน้าเดียว** `print/document/[id]` แล้ว switch template ตาม `docType` แทนการทำ 9 หน้า — ใช้ `PrintDocumentLayout` ร่วมกัน (หัวบริษัท / ข้อมูลคู่สัญญา / ตารางรายการ / สรุปยอด / ลายเซ็น) ดึงจาก `print-data` endpoint และ**ไม่คำนวณเงินเอง**

nav ใหม่ใน `frontend/src/components/admin/adminNav.ts`:

```ts
{
  title: 'บัญชีและการเงิน',
  items: [
    { key: 'documents',    label: 'เอกสาร',        icon: FileText,  href: '/admin/documents' },
    { key: 'transactions', label: 'รายรับ-รายจ่าย', icon: Wallet,    href: '/admin/transactions' },
    { key: 'vendors',      label: 'ผู้ขาย',         icon: Truck,     href: '/admin/vendors' },
    { key: 'accounting',   label: 'รายงานบัญชี',    icon: BarChart3, href: '/admin/accounting' },
  ],
}
```

---

## 13. แผนการพัฒนา

| Phase    | ขอบเขต                | ผลลัพธ์ที่ตรวจรับได้                                                                                                                             |
| -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1** ✅ | Foundation            | **เสร็จแล้ว** — ดู §13.1                                                                                                                         |
| **2**    | Document core + IV    | สร้างใบแจ้งหนี้จากงวดเงิน → confirm → พิมพ์ได้ + หน้า list/detail + `print/document/[id]` + **Raw Editor** (§13.2)                               |
| **3**    | RC + Transaction      | ออกใบเสร็จ/ใบกำกับภาษี, ตัดยอด IV, รับชำระบางส่วน/หลายช่องทาง, auto-create Transaction, status ไหลถึง `PaymentMilestone`, บันทึก 50 ทวิ ที่รับมา |
| **4**    | BN + CN/DN + revision | ใบวางบิลรวมหลาย IV, ใบลดหนี้/เพิ่มหนี้, สาย reissue/revision                                                                                     |
| **5**    | AP                    | Vendor + VendorContract + VendorMilestone + Transaction ฝั่งจ่าย + PV + ออก 50 ทวิ ให้ vendor                                                    |
| **6**    | รายงาน                | AR/AP aging, ภาษีขาย/ซื้อ, ภ.พ.30, ภ.ง.ด.3/53, งบกำไรขาดทุน, cash flow, P&L รายโครงการ, budget vs actual, export CSV                             |
| **7**    | เก็บงาน               | nav + สิทธิ์ ACCOUNTANT + Client Portal ดูเอกสารของตัวเอง + ส่งอีเมลผ่าน `MailModule` ที่มีอยู่ + ปิดงวดบัญชี                                    |

Phase 2–3 เป็น critical path ที่เหลือ — snapshot และกฎ auto-transaction ต้องถูกตั้งแต่ใบแรก แก้ย้อนหลังไม่ได้

### 13.1 Phase 1 — สิ่งที่ส่งมอบแล้ว

**Database**

- `backend/prisma/migrations/20260921000001_add_accounting_foundation/` — 6 ตาราง 2 enum
- `CompanyProfile`, `BankAccount`, `DocumentSequence`, `ChartOfAccount`, `WhtRate`, `FiscalPeriod`

**Backend** — `backend/src/modules/company/`

- `document-sequence.service.ts` — จ่ายเลขแบบ atomic + `peek()` + `listCurrent()`
- `company.service.ts` — โปรไฟล์บริษัท (singleton) + บัญชีธนาคาร พร้อมกฎบัญชีหลัก
- `accounting-settings.service.ts` — ผังบัญชี (tree, กันวนลูป), อัตรา WHT, ปิด/เปิดงวดบัญชี
- `backend/src/common/utils/money.util.ts` — `calcTax()` / `round2()` ด้วย `Prisma.Decimal`
- 4 controller, 15 permission ใหม่, ผูกสิทธิ์ให้ ADMIN / ACCOUNTANT / PROJECT_MANAGER / SALE / CUSTOMER

**Seed**

- บริษัท ฃวด จำกัด + บัญชีกสิกรไทย (ย้ายออกจาก hardcode ในหน้า print)
- ผังบัญชี 36 บัญชี (6 หมวดหลัก) สำหรับงานออกแบบและก่อสร้าง
- อัตรา WHT 5 รายการพร้อมอ้างมาตรา

**Frontend** — `/admin/settings/company`

- 5 แท็บ: ข้อมูลบริษัท · บัญชีธนาคาร · ผังบัญชี · หัก ณ ที่จ่าย · เลขที่เอกสาร
- hooks `useCompany.ts`, `useAccountingSettings.ts` + เมนูใน `adminNav.ts`

**ผลการทดสอบ**
| รายการ | ผล |
|---|---|
| `tsc --noEmit` backend / frontend | ผ่านทั้งคู่ ไม่มี error |
| `eslint` ไฟล์ใหม่ทั้งหมด | ผ่าน |
| `prisma migrate deploy` (Postgres 16 จริง) | migration ใหม่ apply สำเร็จ |
| `prisma db seed` | ลงข้อมูลครบ ตรวจยืนยันด้วย SQL แล้ว |
| `jest` ทั้ง repo | 5 suite · 38 ผ่าน · 6 skip (DB test ที่ข้ามเมื่อไม่ตั้ง `TEST_DATABASE_URL`) |
| จ่ายเลขพร้อมกัน 60 transaction | ไม่ซ้ำ ต่อเนื่อง 001–060 ครบ |

รัน DB test ด้วย: `TEST_DATABASE_URL=postgresql://... pnpm test document-sequence`

---

### 13.2 Raw Editor — ฟีเจอร์ที่ยกมาจาก KK (Phase 2)

อ้างอิง `app/admin/(dashboard)/accounting/documents/components/DescriptionsRawEditor.tsx` ของ KK

ฟอร์มกรอกรายการทีละบรรทัดใช้เวลานานเมื่อขอบเขตงานยาว — Raw Editor เปิด modal ที่แก้
รายละเอียดทั้งกลุ่มเป็นข้อความก้อนเดียว **1 บรรทัด = 1 รายการ** วางลิสต์จากที่อื่นมาทีเดียวจบ

พฤติกรรมที่ต้องคงไว้:

- บรรทัดว่างถูกตัดทิ้ง
- **เว้นวรรคหน้าบรรทัด = ระยะเยื้อง** (ใช้ space ไม่ใช่ tab เพราะ PDF ไม่มี tab stop)
- ปุ่มเติม/เอา `-` ออกจากทุกบรรทัดในครั้งเดียว
- รักษาตัวหนาของบรรทัดที่ผู้ใช้ไม่ได้แก้
- **คลิกนอกกรอบและปุ่ม Escape ไม่ปิด modal** — ระหว่างพิมพ์ลิสต์ยาวการเผลอปิดแล้วงานหาย
  เสียหายกว่าความสะดวกที่ได้ ปิดได้ทางปุ่มเท่านั้น และถามยืนยันถ้ายังมีที่แก้ค้าง

ฝั่งนี้เก็บลง `DocumentItem` แบบ typed (ไม่ใช่ JSONB) ตาม §2 — ตัวช่วยแปลงข้อความ ↔ รายการ
พอร์ตมาจาก `lib/docDescLines.ts` ของ KK

---

## 14. ความเสี่ยงและการรับมือ

| #   | ความเสี่ยง                                                                                          | การรับมือ                                                                                    |
| --- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Race condition ตอนจ่ายเลข (KK มีปัญหานี้อยู่)                                                       | `SELECT ... FOR UPDATE` ใน transaction + `@@unique` บน `code` + integration test ยิงพร้อมกัน |
| 2   | Transaction ถูกสร้างซ้ำตอน confirm สองครั้ง                                                         | ทำ idempotent — เช็ค `document.transactionId` ก่อนเสมอ                                       |
| 3   | void แล้ว `paidAmount` ไม่ rollback                                                                 | ทุก mutation ที่แตะยอดอยู่ใน `$transaction` เดียว + reconcile job รายคืน                     |
| 4   | ยอดปัดเศษไม่ตรงระหว่าง item กับ header                                                              | คำนวณจาก header ลงล่างเสมอ ห้ามรวม item ที่ปัดแล้วขึ้นเป็น header                            |
| 5   | ผู้ใช้เข้าใจผิดว่า IV คือใบกำกับภาษี                                                                | พิมพ์ "ใบแจ้งหนี้ (ไม่ใช่ใบกำกับภาษี)" บนแบบฟอร์ม IV ชัดเจน                                  |
| 6   | `formData` JSONB ถูกใช้เก็บยอดเงินจนทำรายงานไม่ได้                                                  | บังคับด้วย code review: ยอดเงินทุกตัวต้องอยู่ในคอลัมน์ typed เท่านั้น                        |
| 7   | เอกสารเก่าจาก `/print/billing` ที่ส่งลูกค้าไปแล้ว                                                   | เก็บ route เดิม read-only ติดป้ายว่าระบบเก่า ถอดหลัง Phase 3                                 |
| 8   | ข้อมูลบริษัท/บัญชีธนาคาร hardcode ในหน้า print เดิม                                                 | ✅ Phase 1 ย้ายเข้า DB แล้ว                                                                  |
| 9   | **schema drift ที่มีอยู่เดิม** — `prisma migrate deploy` จากศูนย์สร้าง DB ที่ไม่ตรง `schema.prisma` | ดู §14.1 — ต้องแก้ก่อน deploy ระบบใหม่ขึ้น production                                        |

### 14.1 schema drift ที่พบระหว่างทดสอบ Phase 1

ตรวจพบตอนรัน `prisma migrate deploy` บน Postgres เปล่า แล้ว `db seed` ล้มด้วย
`The column projects.province does not exist`

**ไม่เกี่ยวกับ Phase 1** — ตาราง 6 ตัวของ Phase 1 ไม่อยู่ใน drift เลย ตรวจยืนยันแล้ว

สิ่งที่อยู่ใน `schema.prisma` แต่ไม่มี migration รองรับ (203 บรรทัด SQL):

| ประเภท          | รายการ                                                                                                                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ตารางที่หายไป   | `daily_reports`, `daily_report_items`, `daily_report_images`, `daily_report_issues`, `estimate_installments`, `sub_quotations`, `work_categories`                                                                                   |
| คอลัมน์ที่หายไป | `projects` (province, district, subdistrict, postcode, addressLine, areaSize, latitude, longitude, designStartDate, designEndDate), `payment_milestones` (quotationId, subQuotationId, estimateId), `estimate_items.subQuotationId` |
| enum ที่หายไป   | `DailyReportStatus`, `WeatherCondition`, `ReportIssueSeverity` ฯลฯ + ค่าใหม่ใน `FileCategory`, `ProjectType`                                                                                                                        |

สาเหตุ: เคยใช้ `prisma db push` หรือ `migrate dev` แล้วไม่ได้ commit ไฟล์ migration

**ผลกระทบ** — environment ที่มีอยู่ยังทำงานปกติเพราะ schema ถูก push เข้าไปแล้ว แต่
**สร้าง environment ใหม่จาก migration ไม่ได้** ซึ่งกระทบทั้ง CI, staging และการ deploy ครั้งหน้า

**วิธีแก้ที่แนะนำ** — สร้าง migration ชดเชยหนึ่งไฟล์จาก diff:

```bash
cd backend
pnpm exec prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma \
  --shadow-database-url "postgresql://...ฐานข้อมูลเปล่า..." \
  --script > prisma/migrations/<timestamp>_backfill_schema_drift/migration.sql
```

แล้ว `prisma migrate resolve --applied <ชื่อ migration>` บน environment ที่มีข้อมูลอยู่แล้ว
เพื่อบอกว่า migration นี้ถือว่า apply แล้ว ไม่ต้องรันซ้ำ

---

## 15. รายการที่รอการยืนยัน

### ยืนยันแล้ว

- ✅ running **3 หลัก** (§5.2)
- ✅ **บริษัท ฃวด รายเดียว** ไม่รองรับหลายบริษัท
- ✅ **แยกขาดจาก KK** ไม่แชร์ข้อมูลใด ๆ

### ยังรอยืนยัน

1. **ไม่สร้าง `QUOTATION` ใน `Document`** ใช้ `Quotation` เดิมที่ผูก BOQ แทน (§5.5) — ยืนยันว่าตรงกับที่ต้องการ
2. **ผังบัญชีเริ่มต้น** (§8) ครบพอสำหรับงานออกแบบและก่อสร้างหรือไม่ ต้องเพิ่ม/ตัดหมวดไหน
3. **ใบวางบิล (BN)** ใช้จริงในกระบวนการหรือใช้แค่ IV — ถ้าไม่ใช้จะตัดออกจาก Phase 4 ได้
