-- CreateEnum
CREATE TYPE "AiUsageAction" AS ENUM ('SUMMARIZE_CONVERSATION', 'CLASSIFY_LEAD', 'SUGGEST_REPLY', 'EXTRACT_FIELDS');

-- CreateEnum
CREATE TYPE "AiUsageStatus" AS ENUM ('SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "action" "AiUsageAction" NOT NULL,
    "status" "AiUsageStatus" NOT NULL DEFAULT 'SUCCESS',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsageLog_workspaceId_idx" ON "AiUsageLog"("workspaceId");

-- CreateIndex
CREATE INDEX "AiUsageLog_workspaceId_action_idx" ON "AiUsageLog"("workspaceId", "action");

-- CreateIndex
CREATE INDEX "AiUsageLog_workspaceId_createdAt_idx" ON "AiUsageLog"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
