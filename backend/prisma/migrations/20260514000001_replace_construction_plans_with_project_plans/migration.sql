-- Drop old tables
DROP TABLE IF EXISTS "construction_tasks" CASCADE;
DROP TABLE IF EXISTS "construction_plans" CASCADE;

-- New enum
CREATE TYPE "PlanTemplateType" AS ENUM ('DESIGN_ONLY', 'CONSTRUCTION_ONLY', 'TURNKEY');

-- Template tables
CREATE TABLE "project_plan_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PlanTemplateType" NOT NULL,
    CONSTRAINT "project_plan_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_plan_templates_type_key" ON "project_plan_templates"("type");

CREATE TABLE "project_plan_template_phases" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "project_plan_template_phases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_plan_template_tasks" (
    "id" SERIAL NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "defaultDuration" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "project_plan_template_tasks_pkey" PRIMARY KEY ("id")
);

-- Project plan tables
CREATE TABLE "project_plans" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "templateType" "PlanTemplateType",
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "project_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_plans_projectId_key" ON "project_plans"("projectId");

CREATE TABLE "project_plan_phases" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "project_plan_phases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_plan_tasks" (
    "id" SERIAL NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ConstructionTaskStatus" NOT NULL DEFAULT 'TODO',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "project_plan_tasks_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "project_plan_template_phases" ADD CONSTRAINT "project_plan_template_phases_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "project_plan_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_plan_template_tasks" ADD CONSTRAINT "project_plan_template_tasks_phaseId_fkey"
    FOREIGN KEY ("phaseId") REFERENCES "project_plan_template_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_plans" ADD CONSTRAINT "project_plans_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_plan_phases" ADD CONSTRAINT "project_plan_phases_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "project_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_plan_tasks" ADD CONSTRAINT "project_plan_tasks_phaseId_fkey"
    FOREIGN KEY ("phaseId") REFERENCES "project_plan_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
