-- Ensure enum exists for automation instance status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AutomationInstanceStatus') THEN
        CREATE TYPE "AutomationInstanceStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');
    END IF;
END $$;

-- Ensure automation template table exists
CREATE TABLE IF NOT EXISTS "AutomationTemplate" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "definitionJson" JSONB NOT NULL,
    "requiredIntegrations" TEXT[] NOT NULL,
    "createdByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AutomationTemplate_category_idx" ON "AutomationTemplate"("category");
CREATE INDEX IF NOT EXISTS "AutomationTemplate_createdByAdminId_idx" ON "AutomationTemplate"("createdByAdminId");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationTemplate_createdByAdminId_fkey'
    ) THEN
        ALTER TABLE "AutomationTemplate"
        ADD CONSTRAINT "AutomationTemplate_createdByAdminId_fkey"
        FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Ensure automation instance table exists
CREATE TABLE IF NOT EXISTS "AutomationInstance" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "AutomationInstanceStatus" NOT NULL DEFAULT 'PENDING',
    "externalWorkflowId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "configJson" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationInstance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AutomationInstance_workspaceId_idx" ON "AutomationInstance"("workspaceId");
CREATE INDEX IF NOT EXISTS "AutomationInstance_templateId_idx" ON "AutomationInstance"("templateId");
CREATE INDEX IF NOT EXISTS "AutomationInstance_createdByUserId_idx" ON "AutomationInstance"("createdByUserId");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationInstance_workspaceId_fkey'
    ) THEN
        ALTER TABLE "AutomationInstance"
        ADD CONSTRAINT "AutomationInstance_workspaceId_fkey"
        FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationInstance_templateId_fkey'
    ) THEN
        ALTER TABLE "AutomationInstance"
        ADD CONSTRAINT "AutomationInstance_templateId_fkey"
        FOREIGN KEY ("templateId") REFERENCES "AutomationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationInstance_createdByUserId_fkey'
    ) THEN
        ALTER TABLE "AutomationInstance"
        ADD CONSTRAINT "AutomationInstance_createdByUserId_fkey"
        FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add automation workflow fields
ALTER TABLE "AutomationInstance"
ADD COLUMN IF NOT EXISTS "externalWorkflowId" TEXT,
ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN NOT NULL DEFAULT false;

-- Create workspace variables table
CREATE TABLE "WorkspaceVariable" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "encryptedValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceVariable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceVariable_workspaceId_key_key" ON "WorkspaceVariable"("workspaceId", "key");
CREATE INDEX "WorkspaceVariable_workspaceId_idx" ON "WorkspaceVariable"("workspaceId");

ALTER TABLE "WorkspaceVariable"
ADD CONSTRAINT "WorkspaceVariable_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
