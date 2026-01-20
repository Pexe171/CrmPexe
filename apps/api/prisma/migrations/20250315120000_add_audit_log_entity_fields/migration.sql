-- Add CRUD actions to AuditAction enum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'UPDATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DELETE';

-- Add entity tracking to audit logs
ALTER TABLE "AuditLog" ADD COLUMN "entity" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "AuditLog" ADD COLUMN "entityId" TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE "AuditLog" ALTER COLUMN "entity" DROP DEFAULT;
ALTER TABLE "AuditLog" ALTER COLUMN "entityId" DROP DEFAULT;
