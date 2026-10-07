-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill schema drift
--
-- ก่อนหน้านี้มีการใช้ `prisma db push` แก้ schema โดยไม่ได้สร้างไฟล์ migration
-- ทำให้ schema.prisma กับ migration history ไม่ตรงกัน 203 บรรทัด SQL
-- `prisma migrate deploy` จาก DB เปล่าจึงสร้างตารางไม่ครบ แล้ว `db seed` ล้มด้วย
--   The column `projects.province` does not exist in the current database
-- กระทบ CI, staging และการสร้าง environment ใหม่ทุกกรณี
--
-- ไฟล์นี้สร้างด้วย:
--   prisma migrate diff --from-migrations ./prisma/migrations \
--     --to-schema-datamodel ./prisma/schema.prisma \
--     --shadow-database-url <db เปล่า> --script
--
-- ┌─ สำคัญ: environment ที่มีข้อมูลอยู่แล้ว ───────────────────────────────────┐
-- │ DB ที่สร้างด้วย `db push` มาก่อนจะมีตารางเหล่านี้ครบอยู่แล้ว การรัน SQL   │
-- │ นี้ซ้ำจะ error ต้องบอก prisma ว่าถือว่า apply แล้วแทนการรันจริง:          │
-- │                                                                           │
-- │   npx prisma@5.22.0 migrate resolve \                                     │
-- │     --applied 20261007000001_backfill_schema_drift                        │
-- │                                                                           │
-- │ ตรวจก่อนว่าจำเป็นไหม — ถ้า `migrate status` บอกว่า pending และตารางมีอยู่ │
-- │ แล้วจริง ให้ใช้ resolve  ถ้าเป็น DB เปล่าให้ปล่อย deploy รันตามปกติ       │
-- └───────────────────────────────────────────────────────────────────────────┘
--
-- หมายเหตุ: มี DROP COLUMN "projects"."location" อยู่หนึ่งคำสั่ง ซึ่งปลอดภัย
-- เพราะคอลัมน์นี้ถูกแทนด้วย addressLine/province/district/subdistrict/postcode
-- ไปแล้วตั้งแต่ตอน db push และ DB ที่มีอยู่จริงก็ไม่มีคอลัมน์นี้แล้ว
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "DailyReportStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "DailyReportItemStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "WeatherCondition" AS ENUM ('SUNNY', 'PARTLY_CLOUDY', 'CLOUDY', 'RAINY', 'HEAVY_RAIN', 'STORMY');

-- CreateEnum
CREATE TYPE "ReportIssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReportIssueStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ReportImageType" AS ENUM ('BEFORE', 'AFTER', 'PROGRESS', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FileCategory" ADD VALUE 'PLAN';
ALTER TYPE "FileCategory" ADD VALUE 'IMAGE';

-- AlterEnum
ALTER TYPE "ProjectType" ADD VALUE 'CONSTRUCTION';

-- AlterTable
ALTER TABLE "estimate_items" ADD COLUMN     "subQuotationId" INTEGER;

-- AlterTable
ALTER TABLE "payment_milestones" ADD COLUMN     "estimateId" INTEGER,
ADD COLUMN     "quotationId" INTEGER,
ADD COLUMN     "subQuotationId" INTEGER;

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "location",
ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "areaSize" DECIMAL(15,2),
ADD COLUMN     "designEndDate" TIMESTAMP(3),
ADD COLUMN     "designStartDate" TIMESTAMP(3),
ADD COLUMN     "district" TEXT,
ADD COLUMN     "latitude" DECIMAL(10,7),
ADD COLUMN     "longitude" DECIMAL(10,7),
ADD COLUMN     "postcode" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "subdistrict" TEXT;

-- CreateTable
CREATE TABLE "estimate_installments" (
    "id" SERIAL NOT NULL,
    "estimateId" INTEGER NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "reportDate" DATE NOT NULL,
    "weather" "WeatherCondition",
    "overallProgress" INTEGER NOT NULL DEFAULT 0,
    "nextPlan" TEXT,
    "issueSummary" TEXT,
    "status" "DailyReportStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report_items" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT,
    "quantity" DECIMAL(10,3),
    "status" "DailyReportItemStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_report_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report_images" (
    "id" SERIAL NOT NULL,
    "reportItemId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "storageKey" TEXT,
    "caption" TEXT,
    "imageType" "ReportImageType" NOT NULL DEFAULT 'PROGRESS',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_report_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report_issues" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "issue" TEXT NOT NULL,
    "impact" TEXT,
    "solution" TEXT,
    "severity" "ReportIssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "ReportIssueStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_report_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_quotations" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "quotationId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sub_quotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_projectId_reportDate_key" ON "daily_reports"("projectId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "sub_quotations_code_key" ON "sub_quotations"("code");

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_subQuotationId_fkey" FOREIGN KEY ("subQuotationId") REFERENCES "sub_quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_installments" ADD CONSTRAINT "estimate_installments_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_milestones" ADD CONSTRAINT "payment_milestones_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_milestones" ADD CONSTRAINT "payment_milestones_subQuotationId_fkey" FOREIGN KEY ("subQuotationId") REFERENCES "sub_quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_milestones" ADD CONSTRAINT "payment_milestones_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_items" ADD CONSTRAINT "daily_report_items_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_items" ADD CONSTRAINT "daily_report_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "work_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_images" ADD CONSTRAINT "daily_report_images_reportItemId_fkey" FOREIGN KEY ("reportItemId") REFERENCES "daily_report_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_issues" ADD CONSTRAINT "daily_report_issues_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_quotations" ADD CONSTRAINT "sub_quotations_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

