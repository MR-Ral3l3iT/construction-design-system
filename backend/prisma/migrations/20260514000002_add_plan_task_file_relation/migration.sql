-- Add planTaskId to file_assets (camelCase to match existing column convention)
ALTER TABLE "file_assets" ADD COLUMN "planTaskId" INTEGER;

ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_planTaskId_fkey"
  FOREIGN KEY ("planTaskId") REFERENCES "project_plan_tasks"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
