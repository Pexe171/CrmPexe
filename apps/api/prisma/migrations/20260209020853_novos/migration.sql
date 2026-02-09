/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `AutomationTemplate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MarketplaceTemplateStatus" AS ENUM ('PENDING', 'APPROVED');

-- DropForeignKey
ALTER TABLE "AiUsageLog" DROP CONSTRAINT "AiUsageLog_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "AutomationTemplateVersion" DROP CONSTRAINT "AutomationTemplateVersion_templateId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationSummary" DROP CONSTRAINT "ConversationSummary_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "IntegrationAccount" DROP CONSTRAINT "IntegrationAccount_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "MessageTemplate" DROP CONSTRAINT "MessageTemplate_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_workspaceId_fkey";

-- DropIndex
DROP INDEX "AutomationTemplate_currentVersionId_idx";

-- AlterTable
ALTER TABLE "AiUsageLog" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AutomationAccess" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AutomationAccessRequest" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AutomationInstance" ADD COLUMN     "workflowData" JSONB;

-- AlterTable
ALTER TABLE "AutomationTemplate" ADD COLUMN     "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "configJson" JSONB,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pingUrl" TEXT,
ADD COLUMN     "priceLabel" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "responseSlaSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "status" "MarketplaceTemplateStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "workflowData" JSONB;

-- AlterTable
ALTER TABLE "AutomationTemplateVersion" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ConversationSummary" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MarketplaceCategory" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "MarketplaceInterest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "status" "AutomationAccessStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceInterest_workspaceId_idx" ON "MarketplaceInterest"("workspaceId");

-- CreateIndex
CREATE INDEX "MarketplaceInterest_templateId_idx" ON "MarketplaceInterest"("templateId");

-- CreateIndex
CREATE INDEX "MarketplaceInterest_status_idx" ON "MarketplaceInterest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceInterest_workspaceId_templateId_requestedByUserI_key" ON "MarketplaceInterest"("workspaceId", "templateId", "requestedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationTemplate_slug_key" ON "AutomationTemplate"("slug");

-- CreateIndex
CREATE INDEX "AutomationTemplate_status_idx" ON "AutomationTemplate"("status");

-- AddForeignKey
ALTER TABLE "ConversationSummary" ADD CONSTRAINT "ConversationSummary_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationAccount" ADD CONSTRAINT "IntegrationAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceInterest" ADD CONSTRAINT "MarketplaceInterest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceInterest" ADD CONSTRAINT "MarketplaceInterest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AutomationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceInterest" ADD CONSTRAINT "MarketplaceInterest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationTemplateVersion" ADD CONSTRAINT "AutomationTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AutomationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
