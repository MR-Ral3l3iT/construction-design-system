-- รายละเอียดรายการแบบหลายบรรทัดพร้อมรูปแบบ (ตัวหนา / ไฮไลต์แดง) และหัวข้อหมวดที่ไม่มีราคา
-- additive ทั้งหมด · ดู docs/billing-accounting-spec.md §13.4

ALTER TABLE "estimate_items" ADD COLUMN "lines" JSONB,
ADD COLUMN "isPriced" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "document_items" ADD COLUMN "lines" JSONB,
ADD COLUMN "isPriced" BOOLEAN NOT NULL DEFAULT true;

-- แปลง description เดิมเป็น lines: 1 บรรทัด = 1 รายการ ตัดบรรทัดว่างทิ้ง ยังไม่มีรูปแบบ
UPDATE "estimate_items" AS i
SET "lines" = sub.lines
FROM (
  SELECT id,
         jsonb_agg(jsonb_build_object('text', rtrim(line)) ORDER BY ord) AS lines
  FROM "estimate_items",
       LATERAL unnest(string_to_array(replace("description", E'\r', ''), E'\n'))
         WITH ORDINALITY AS t(line, ord)
  WHERE "description" IS NOT NULL AND btrim(line) <> ''
  GROUP BY id
) AS sub
WHERE i.id = sub.id;

UPDATE "document_items" AS i
SET "lines" = sub.lines
FROM (
  SELECT id,
         jsonb_agg(jsonb_build_object('text', rtrim(line)) ORDER BY ord) AS lines
  FROM "document_items",
       LATERAL unnest(string_to_array(replace("description", E'\r', ''), E'\n'))
         WITH ORDINALITY AS t(line, ord)
  WHERE "description" IS NOT NULL AND btrim(line) <> ''
  GROUP BY id
) AS sub
WHERE i.id = sub.id;
