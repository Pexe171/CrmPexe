-- Criar enum de status se ainda não existir
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AutomationInstanceStatus') THEN
        CREATE TYPE "AutomationInstanceStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');
    END IF;
END $$;

-- Criar tabela base de instâncias de automação
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
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationInstance_createdByUserId_fkey'
    ) THEN
        ALTER TABLE "AutomationInstance"
        ADD CONSTRAINT "AutomationInstance_createdByUserId_fkey"
        FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
