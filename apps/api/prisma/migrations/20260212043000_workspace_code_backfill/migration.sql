-- Ensure legacy databases have Workspace.code column required by current Prisma schema.
ALTER TABLE "Workspace"
ADD COLUMN IF NOT EXISTS "code" TEXT;

UPDATE "Workspace"
SET "code" = UPPER(SUBSTRING(REPLACE("id", '-', '') FROM 1 FOR 12))
WHERE "code" IS NULL OR "code" = '';

ALTER TABLE "Workspace"
ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_code_key" ON "Workspace"("code");
