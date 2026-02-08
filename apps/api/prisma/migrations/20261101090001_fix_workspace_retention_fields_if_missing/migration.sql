-- Garantir campos de retenção do workspace quando bancos antigos não aplicaram a migration.
ALTER TABLE "Workspace"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "retentionEndsAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Workspace_deletedAt_idx" ON "Workspace"("deletedAt");
