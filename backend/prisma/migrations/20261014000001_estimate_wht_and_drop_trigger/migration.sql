-- 1) หัก ณ ที่จ่ายตั้งที่ใบประเมิน (null = ไม่หัก)
-- 2) เลิกใช้ช่อง "หลังจาก" — เงื่อนไขของงวดเขียนไว้ในรายละเอียดอยู่แล้ว
--    ต่อท้ายรายละเอียดก่อนลบ ข้อมูลที่เคยกรอกจึงไม่หาย
-- ดู docs/billing-accounting-spec.md §13.5

ALTER TABLE "estimates" ADD COLUMN "whtPercent" DECIMAL(5,2);

UPDATE "estimate_installments"
SET "description" = "description" || ' (หลังจาก' || "triggerText" || ')'
WHERE "triggerText" IS NOT NULL AND btrim("triggerText") <> '';

UPDATE "document_installments"
SET "description" = "description" || ' (หลังจาก' || "triggerText" || ')'
WHERE "triggerText" IS NOT NULL AND btrim("triggerText") <> '';

ALTER TABLE "estimate_installments" DROP COLUMN "triggerText";
ALTER TABLE "document_installments" DROP COLUMN "triggerText";
