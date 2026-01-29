-- Add new audit action for impersonation
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'IMPERSONATION_STARTED'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
    ) THEN
        ALTER TYPE "AuditAction" ADD VALUE 'IMPERSONATION_STARTED';
    END IF;
END $$;

-- Create automation template versions table
CREATE TABLE IF NOT EXISTS "AutomationTemplateVersion" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "templateId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "changelog" TEXT,
    "definitionJson" JSONB NOT NULL,
    "requiredIntegrations" TEXT[] NOT NULL,
    "createdByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationTemplateVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AutomationTemplateVersion_templateId_version_key"
ON "AutomationTemplateVersion"("templateId", "version");
CREATE INDEX IF NOT EXISTS "AutomationTemplateVersion_templateId_idx"
ON "AutomationTemplateVersion"("templateId");
CREATE INDEX IF NOT EXISTS "AutomationTemplateVersion_createdByAdminId_idx"
ON "AutomationTemplateVersion"("createdByAdminId");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationTemplateVersion_templateId_fkey'
    ) THEN
        ALTER TABLE "AutomationTemplateVersion"
        ADD CONSTRAINT "AutomationTemplateVersion_templateId_fkey"
        FOREIGN KEY ("templateId") REFERENCES "AutomationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationTemplateVersion_createdByAdminId_fkey'
    ) THEN
        ALTER TABLE "AutomationTemplateVersion"
        ADD CONSTRAINT "AutomationTemplateVersion_createdByAdminId_fkey"
        FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Extend automation templates with changelog + current version link
ALTER TABLE "AutomationTemplate"
ADD COLUMN IF NOT EXISTS "changelog" TEXT,
ADD COLUMN IF NOT EXISTS "currentVersionId" TEXT;

CREATE INDEX IF NOT EXISTS "AutomationTemplate_currentVersionId_idx"
ON "AutomationTemplate"("currentVersionId");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationTemplate_currentVersionId_fkey'
    ) THEN
        ALTER TABLE "AutomationTemplate"
        ADD CONSTRAINT "AutomationTemplate_currentVersionId_fkey"
        FOREIGN KEY ("currentVersionId") REFERENCES "AutomationTemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Extend automation instances to keep pinned template versions
ALTER TABLE "AutomationInstance"
ADD COLUMN IF NOT EXISTS "templateVersionId" TEXT;

CREATE INDEX IF NOT EXISTS "AutomationInstance_templateVersionId_idx"
ON "AutomationInstance"("templateVersionId");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationInstance_templateVersionId_fkey'
    ) THEN
        ALTER TABLE "AutomationInstance"
        ADD CONSTRAINT "AutomationInstance_templateVersionId_fkey"
        FOREIGN KEY ("templateVersionId") REFERENCES "AutomationTemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Backfill versions for existing templates
WITH inserted_versions AS (
    INSERT INTO "AutomationTemplateVersion" (
        "id",
        "templateId",
        "version",
        "definitionJson",
        "requiredIntegrations",
        "createdByAdminId",
        "createdAt"
    )
    SELECT
        gen_random_uuid(),
        "id",
        "version",
        "definitionJson",
        "requiredIntegrations",
        "createdByAdminId",
        "createdAt"
    FROM "AutomationTemplate"
    RETURNING "id" AS "versionId", "templateId"
)
UPDATE "AutomationTemplate" AS template
SET "currentVersionId" = inserted_versions."versionId"
FROM inserted_versions
WHERE template."id" = inserted_versions."templateId"
  AND template."currentVersionId" IS NULL;

UPDATE "AutomationInstance" AS instance
SET "templateVersionId" = template."currentVersionId"
FROM "AutomationTemplate" AS template
WHERE instance."templateId" = template."id"
  AND instance."templateVersionId" IS NULL;
