-- Clear mock BOQ data to allow schema restructure (data is not production)
TRUNCATE TABLE "boq_items" CASCADE;
TRUNCATE TABLE "boq_categories" CASCADE;
TRUNCATE TABLE "boqs" RESTART IDENTITY CASCADE;

-- DropForeignKey
ALTER TABLE "boq_items" DROP CONSTRAINT "boq_items_categoryId_fkey";

-- AlterTable
ALTER TABLE "boq_items" DROP COLUMN "categoryId",
ADD COLUMN     "remark" TEXT,
ADD COLUMN     "subCategoryId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "boq_sub_categories" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "boq_sub_categories_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "boq_sub_categories" ADD CONSTRAINT "boq_sub_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "boq_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "boq_sub_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
