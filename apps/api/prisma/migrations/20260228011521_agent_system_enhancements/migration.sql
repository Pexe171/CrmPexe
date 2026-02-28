-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AgentAuditAction" ADD VALUE 'UPDATED';
ALTER TYPE "AgentAuditAction" ADD VALUE 'DELETED';
ALTER TYPE "AgentAuditAction" ADD VALUE 'ASSIGNED';
ALTER TYPE "AgentAuditAction" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "AgentTemplate" ADD COLUMN     "iconUrl" TEXT,
ADD COLUMN     "priceLabel" TEXT;

-- AlterTable
ALTER TABLE "AgentTemplateVersion" ADD COLUMN     "requiredVariables" JSONB;

-- AlterTable
ALTER TABLE "WorkspaceAgent" ADD COLUMN     "assignedByAdminId" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "whatsappSessionId" TEXT;

-- CreateIndex
CREATE INDEX "WorkspaceAgent_expiresAt_idx" ON "WorkspaceAgent"("expiresAt");
