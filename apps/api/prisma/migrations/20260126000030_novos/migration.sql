-- Garantir tipos e tabelas de automação antes de alterar constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AutomationInstanceStatus') THEN
        CREATE TYPE "AutomationInstanceStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');
    END IF;
END $$;

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

-- DropForeignKey
ALTER TABLE "AutomationInstance" DROP CONSTRAINT IF EXISTS "AutomationInstance_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "AutomationInstance" DROP CONSTRAINT IF EXISTS "AutomationInstance_templateId_fkey";

-- DropForeignKey
ALTER TABLE "AutomationInstance" DROP CONSTRAINT IF EXISTS "AutomationInstance_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "AutomationTemplate" DROP CONSTRAINT IF EXISTS "AutomationTemplate_createdByAdminId_fkey";

-- DropForeignKey
ALTER TABLE "IntegrationAccount" DROP CONSTRAINT IF EXISTS "IntegrationAccount_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "MessageTemplate" DROP CONSTRAINT IF EXISTS "MessageTemplate_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_workspaceId_fkey";

-- AlterTable
ALTER TABLE "AutomationInstance" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AutomationTemplate" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "first_response_time_seconds" INTEGER,
ADD COLUMN     "resolution_time_seconds" INTEGER;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "id" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "IntegrationAccount" ADD CONSTRAINT "IntegrationAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationTemplate" ADD CONSTRAINT "AutomationTemplate_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationInstance" ADD CONSTRAINT "AutomationInstance_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationInstance" ADD CONSTRAINT "AutomationInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AutomationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationInstance" ADD CONSTRAINT "AutomationInstance_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
