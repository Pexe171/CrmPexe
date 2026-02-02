DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'AutomationAccessStatus'
    ) THEN
        CREATE TYPE "AutomationAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "AutomationAccess" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "AutomationAccessStatus" NOT NULL DEFAULT 'APPROVED',
    "grantedByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AutomationAccessRequest" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "status" "AutomationAccessStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationAccessRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AutomationAccess_workspaceId_templateId_key"
ON "AutomationAccess"("workspaceId", "templateId");
CREATE INDEX IF NOT EXISTS "AutomationAccess_workspaceId_idx"
ON "AutomationAccess"("workspaceId");
CREATE INDEX IF NOT EXISTS "AutomationAccess_templateId_idx"
ON "AutomationAccess"("templateId");
CREATE INDEX IF NOT EXISTS "AutomationAccess_status_idx"
ON "AutomationAccess"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "AutomationAccessRequest_workspaceId_templateId_key"
ON "AutomationAccessRequest"("workspaceId", "templateId");
CREATE INDEX IF NOT EXISTS "AutomationAccessRequest_workspaceId_idx"
ON "AutomationAccessRequest"("workspaceId");
CREATE INDEX IF NOT EXISTS "AutomationAccessRequest_templateId_idx"
ON "AutomationAccessRequest"("templateId");
CREATE INDEX IF NOT EXISTS "AutomationAccessRequest_status_idx"
ON "AutomationAccessRequest"("status");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationAccess_workspaceId_fkey'
    ) THEN
        ALTER TABLE "AutomationAccess"
        ADD CONSTRAINT "AutomationAccess_workspaceId_fkey"
        FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationAccess_templateId_fkey'
    ) THEN
        ALTER TABLE "AutomationAccess"
        ADD CONSTRAINT "AutomationAccess_templateId_fkey"
        FOREIGN KEY ("templateId") REFERENCES "AutomationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationAccess_grantedByAdminId_fkey'
    ) THEN
        ALTER TABLE "AutomationAccess"
        ADD CONSTRAINT "AutomationAccess_grantedByAdminId_fkey"
        FOREIGN KEY ("grantedByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationAccessRequest_workspaceId_fkey'
    ) THEN
        ALTER TABLE "AutomationAccessRequest"
        ADD CONSTRAINT "AutomationAccessRequest_workspaceId_fkey"
        FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationAccessRequest_templateId_fkey'
    ) THEN
        ALTER TABLE "AutomationAccessRequest"
        ADD CONSTRAINT "AutomationAccessRequest_templateId_fkey"
        FOREIGN KEY ("templateId") REFERENCES "AutomationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationAccessRequest_requestedByUserId_fkey'
    ) THEN
        ALTER TABLE "AutomationAccessRequest"
        ADD CONSTRAINT "AutomationAccessRequest_requestedByUserId_fkey"
        FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
