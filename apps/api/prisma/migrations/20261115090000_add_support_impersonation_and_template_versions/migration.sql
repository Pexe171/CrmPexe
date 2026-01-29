ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUPPORT_IMPERSONATION_CREATED';

ALTER TABLE "AutomationTemplate" ADD COLUMN "templateKey" TEXT;
UPDATE "AutomationTemplate" SET "templateKey" = "id" WHERE "templateKey" IS NULL;
ALTER TABLE "AutomationTemplate" ALTER COLUMN "templateKey" SET NOT NULL;

ALTER TABLE "AutomationTemplate" ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "AutomationTemplate" ADD COLUMN "changelog" TEXT;

CREATE INDEX IF NOT EXISTS "AutomationTemplate_templateKey_idx" ON "AutomationTemplate"("templateKey");
CREATE UNIQUE INDEX IF NOT EXISTS "AutomationTemplate_templateKey_versionNumber_key" ON "AutomationTemplate"("templateKey", "versionNumber");

CREATE TABLE IF NOT EXISTS "SupportImpersonationToken" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tokenHash" TEXT NOT NULL,
    "createdByAdminId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "SupportImpersonationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SupportImpersonationToken_tokenHash_key" ON "SupportImpersonationToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "SupportImpersonationToken_workspaceId_idx" ON "SupportImpersonationToken"("workspaceId");
CREATE INDEX IF NOT EXISTS "SupportImpersonationToken_createdByAdminId_idx" ON "SupportImpersonationToken"("createdByAdminId");
CREATE INDEX IF NOT EXISTS "SupportImpersonationToken_targetUserId_idx" ON "SupportImpersonationToken"("targetUserId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SupportImpersonationToken_createdByAdminId_fkey'
    ) THEN
        ALTER TABLE "SupportImpersonationToken"
        ADD CONSTRAINT "SupportImpersonationToken_createdByAdminId_fkey"
        FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SupportImpersonationToken_targetUserId_fkey'
    ) THEN
        ALTER TABLE "SupportImpersonationToken"
        ADD CONSTRAINT "SupportImpersonationToken_targetUserId_fkey"
        FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SupportImpersonationToken_workspaceId_fkey'
    ) THEN
        ALTER TABLE "SupportImpersonationToken"
        ADD CONSTRAINT "SupportImpersonationToken_workspaceId_fkey"
        FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
