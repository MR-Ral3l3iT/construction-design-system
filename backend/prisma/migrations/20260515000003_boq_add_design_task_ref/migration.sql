-- AlterTable: add designTaskId column to boqs (nullable FK to design_tasks)
ALTER TABLE "boqs" ADD COLUMN "designTaskId" INTEGER;

-- AddForeignKey
ALTER TABLE "boqs" ADD CONSTRAINT "boqs_designTaskId_fkey"
  FOREIGN KEY ("designTaskId") REFERENCES "design_tasks"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
