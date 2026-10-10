-- Phase 2: Document (ใบเสนอราคา) + งวด/schedule ของ Estimate — additive ทั้งหมด
-- ดู docs/billing-accounting-spec.md §5.5, §13.3

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'SUPERSEDED', 'VOIDED');

-- AlterTable
ALTER TABLE "estimate_installments" ADD COLUMN     "triggerText" TEXT,
ADD COLUMN     "withinWeeks" INTEGER;

-- AlterTable
ALTER TABLE "payment_milestones" ADD COLUMN     "documentInstallmentId" INTEGER;

-- CreateTable
CREATE TABLE "estimate_schedule_phases" (
    "id" SERIAL NOT NULL,
    "estimateId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startWeek" INTEGER NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "estimate_schedule_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "docType" "DocType" NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "projectId" INTEGER,
    "estimateId" INTEGER,
    "quotationId" INTEGER,
    "referenceDocId" INTEGER,
    "referenceNumber" TEXT,
    "supersedesDocId" INTEGER,
    "rootDocId" INTEGER,
    "revisionNo" INTEGER NOT NULL DEFAULT 0,
    "documentDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "sellerName" TEXT,
    "sellerBranchCode" TEXT,
    "sellerTaxId" TEXT,
    "sellerAddress" TEXT,
    "sellerContact" TEXT,
    "partyName" TEXT,
    "partyBranchCode" TEXT,
    "partyTaxId" TEXT,
    "partyAddress" TEXT,
    "partyContact" TEXT,
    "partyPhone" TEXT,
    "partyEmail" TEXT,
    "projectName" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "baseAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(5,4) NOT NULL DEFAULT 0.07,
    "vatAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "whtRateId" INTEGER,
    "whtRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "whtAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "formData" JSONB,
    "pdfOptions" JSONB,
    "note" TEXT,
    "internalNote" TEXT,
    "createdById" INTEGER NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" INTEGER,
    "voidedAt" TIMESTAMP(3),
    "voidedById" INTEGER,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_items" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isNote" BOOLEAN NOT NULL DEFAULT false,
    "isDiscount" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_installments" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "triggerText" TEXT,
    "withinWeeks" INTEGER,
    "percentage" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "document_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_schedule_phases" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startWeek" INTEGER NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_schedule_phases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estimate_schedule_phases_estimateId_idx" ON "estimate_schedule_phases"("estimateId");

-- CreateIndex
CREATE UNIQUE INDEX "documents_code_key" ON "documents"("code");

-- CreateIndex
CREATE UNIQUE INDEX "documents_supersedesDocId_key" ON "documents"("supersedesDocId");

-- CreateIndex
CREATE INDEX "documents_docType_status_idx" ON "documents"("docType", "status");

-- CreateIndex
CREATE INDEX "documents_projectId_idx" ON "documents"("projectId");

-- CreateIndex
CREATE INDEX "documents_estimateId_idx" ON "documents"("estimateId");

-- CreateIndex
CREATE INDEX "documents_customerId_idx" ON "documents"("customerId");

-- CreateIndex
CREATE INDEX "documents_documentDate_idx" ON "documents"("documentDate");

-- CreateIndex
CREATE UNIQUE INDEX "documents_rootDocId_revisionNo_key" ON "documents"("rootDocId", "revisionNo");

-- CreateIndex
CREATE INDEX "document_items_documentId_idx" ON "document_items"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_installments_documentId_installmentNo_key" ON "document_installments"("documentId", "installmentNo");

-- CreateIndex
CREATE INDEX "document_schedule_phases_documentId_idx" ON "document_schedule_phases"("documentId");

-- AddForeignKey
ALTER TABLE "estimate_schedule_phases" ADD CONSTRAINT "estimate_schedule_phases_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_milestones" ADD CONSTRAINT "payment_milestones_documentInstallmentId_fkey" FOREIGN KEY ("documentInstallmentId") REFERENCES "document_installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_whtRateId_fkey" FOREIGN KEY ("whtRateId") REFERENCES "wht_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_referenceDocId_fkey" FOREIGN KEY ("referenceDocId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_supersedesDocId_fkey" FOREIGN KEY ("supersedesDocId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_rootDocId_fkey" FOREIGN KEY ("rootDocId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_items" ADD CONSTRAINT "document_items_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_installments" ADD CONSTRAINT "document_installments_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_schedule_phases" ADD CONSTRAINT "document_schedule_phases_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

