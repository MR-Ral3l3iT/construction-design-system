-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('QUOTATION', 'INVOICE', 'BILLING', 'RECEIPT', 'PAYMENT_VOUCHER', 'RECEIPT_VOUCHER', 'WHT_CERT', 'CREDIT_NOTE', 'DEBIT_NOTE');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('INCOME', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY');

-- CreateTable
CREATE TABLE "company_profiles" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branchName" TEXT NOT NULL DEFAULT 'สำนักงานใหญ่',
    "branchCode" TEXT NOT NULL DEFAULT '00000',
    "taxId" TEXT,
    "address" TEXT,
    "contactLine" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "signatureUrl" TEXT,
    "signatureName" TEXT,
    "isVatRegistered" BOOLEAN NOT NULL DEFAULT true,
    "defaultVatRate" DECIMAL(5,4) NOT NULL DEFAULT 0.07,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'ออมทรัพย์',
    "accountName" TEXT NOT NULL,
    "accountNo" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" SERIAL NOT NULL,
    "docType" "DocType" NOT NULL,
    "period" TEXT NOT NULL,
    "currentNo" INTEGER NOT NULL DEFAULT 0,
    "digits" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "parentId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wht_rates" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "description" TEXT NOT NULL,
    "section" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "wht_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_periods" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "closedById" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fiscal_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_profiles_code_key" ON "company_profiles"("code");

-- CreateIndex
CREATE INDEX "bank_accounts_companyId_idx" ON "bank_accounts"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_docType_period_key" ON "document_sequences"("docType", "period");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_code_key" ON "chart_of_accounts"("code");

-- CreateIndex
CREATE INDEX "chart_of_accounts_parentId_idx" ON "chart_of_accounts"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "wht_rates_code_key" ON "wht_rates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_periods_year_month_key" ON "fiscal_periods"("year", "month");

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
