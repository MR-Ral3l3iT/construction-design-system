-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "quotations" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "boqId" INTEGER,
    "title" TEXT NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "note" TEXT,
    "mgmtRate" DECIMAL(5,4) NOT NULL DEFAULT 0.10,
    "vatRate" DECIMAL(5,4) NOT NULL DEFAULT 0.07,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "mgmtCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "vat" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_categories" (
    "id" SERIAL NOT NULL,
    "quotationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    CONSTRAINT "quotation_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_sub_categories" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    CONSTRAINT "quotation_sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotations_code_key" ON "quotations"("code");

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_boqId_fkey" FOREIGN KEY ("boqId") REFERENCES "boqs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_categories" ADD CONSTRAINT "quotation_categories_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_sub_categories" ADD CONSTRAINT "quotation_sub_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "quotation_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
