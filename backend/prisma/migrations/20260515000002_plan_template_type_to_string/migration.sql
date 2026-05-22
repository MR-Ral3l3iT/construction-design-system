-- Convert PlanTemplateType enum columns to TEXT
ALTER TABLE "project_plan_templates" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;
ALTER TABLE "project_plans" ALTER COLUMN "templateType" TYPE TEXT USING "templateType"::TEXT;

-- Drop enum (no longer needed)
DROP TYPE "PlanTemplateType";

-- Add CASCADE delete for template phases
ALTER TABLE "project_plan_template_phases" DROP CONSTRAINT IF EXISTS "project_plan_template_phases_templateId_fkey";
ALTER TABLE "project_plan_template_phases" ADD CONSTRAINT "project_plan_template_phases_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "project_plan_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add CASCADE delete for template tasks
ALTER TABLE "project_plan_template_tasks" DROP CONSTRAINT IF EXISTS "project_plan_template_tasks_phaseId_fkey";
ALTER TABLE "project_plan_template_tasks" ADD CONSTRAINT "project_plan_template_tasks_phaseId_fkey"
  FOREIGN KEY ("phaseId") REFERENCES "project_plan_template_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
