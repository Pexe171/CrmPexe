/*
  Warnings:

  - A unique constraint covering the columns `[currentVersionId]` on the table `AutomationTemplate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[workspaceId,phone]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.

*/
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
ALTER TABLE "AutomationTemplateVersion" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "queueId" TEXT;

-- AlterTable
ALTER TABLE "ConversationSummary" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "brandLogoUrl" TEXT,
ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "brandPrimaryColor" TEXT,
ADD COLUMN     "brandSecondaryColor" TEXT,
ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'pt-BR';

-- AlterTable
ALTER TABLE "WorkspaceMember" ADD COLUMN     "allowedTagIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "allowedUnitIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Queue" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastAssignedMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeBaseArticle" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBaseArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CannedResponse" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "shortcut" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CannedResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Team_workspaceId_idx" ON "Team"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_workspaceId_name_key" ON "Team"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_position_idx" ON "TeamMember"("teamId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "Queue_workspaceId_idx" ON "Queue"("workspaceId");

-- CreateIndex
CREATE INDEX "Queue_teamId_idx" ON "Queue"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Queue_workspaceId_channel_key" ON "Queue"("workspaceId", "channel");

-- CreateIndex
CREATE INDEX "KnowledgeBaseArticle_workspaceId_idx" ON "KnowledgeBaseArticle"("workspaceId");

-- CreateIndex
CREATE INDEX "KnowledgeBaseArticle_workspaceId_title_idx" ON "KnowledgeBaseArticle"("workspaceId", "title");

-- CreateIndex
CREATE INDEX "CannedResponse_workspaceId_idx" ON "CannedResponse"("workspaceId");

-- CreateIndex
CREATE INDEX "CannedResponse_workspaceId_title_idx" ON "CannedResponse"("workspaceId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationTemplate_currentVersionId_key" ON "AutomationTemplate"("currentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_workspaceId_phone_key" ON "Contact"("workspaceId", "phone");

-- CreateIndex
CREATE INDEX "Conversation_queueId_idx" ON "Conversation"("queueId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationSummary" ADD CONSTRAINT "ConversationSummary_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationAccount" ADD CONSTRAINT "IntegrationAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_lastAssignedMemberId_fkey" FOREIGN KEY ("lastAssignedMemberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeBaseArticle" ADD CONSTRAINT "KnowledgeBaseArticle_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CannedResponse" ADD CONSTRAINT "CannedResponse_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationTemplateVersion" ADD CONSTRAINT "AutomationTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AutomationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
