-- งวดในใบเสนอราคาคิดจาก % ของยอดสุทธิที่ลูกค้าจ่ายจริง — เก็บ VAT / หัก ณ ที่จ่าย / สุทธิ ของแต่ละงวด
-- ไว้ออกใบแจ้งหนี้รายงวด · ดู docs/billing-accounting-spec.md §13.7

ALTER TABLE "document_installments" ADD COLUMN "vatAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN "whtAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN "netAmount" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- เอกสารที่ออกไปก่อนหน้า: คิดจากราคาก่อน VAT ของงวดตามอัตราของเอกสาร (วิธีเดิม)
UPDATE "document_installments" AS i
SET "vatAmount" = round(i."amount" * d."vatRate", 2),
    "whtAmount" = round(i."amount" * d."whtRate", 2),
    "netAmount" = i."amount" + round(i."amount" * d."vatRate", 2) - round(i."amount" * d."whtRate", 2)
FROM "documents" AS d
WHERE d.id = i."documentId";
