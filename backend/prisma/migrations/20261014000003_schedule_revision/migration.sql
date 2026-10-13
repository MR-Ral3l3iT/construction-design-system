-- schedule แก้ได้หลังออกใบเสนอราคา — เก็บแค่ครั้งที่ปรับปรุงล่าสุด (ฉบับแรกอยู่ใน snapshot ของใบเสนอราคา)
-- ดู docs/billing-accounting-spec.md §13.8

ALTER TABLE "estimates" ADD COLUMN "scheduleRevision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "scheduleUpdatedAt" TIMESTAMP(3);
