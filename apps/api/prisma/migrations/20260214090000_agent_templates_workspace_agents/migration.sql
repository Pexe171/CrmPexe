-- CreateEnum
CREATE TYPE "AgentTemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AgentAuditAction" AS ENUM ('IMPORTED', 'PUBLISHED', 'ACTIVATED', 'DEACTIVATED', 'ROLLED_BACK');

-- CreateTable
CREATE TABLE "AgentTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "channel" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "compatibility" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedPlans" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "AgentTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTemplateVersion" (
    "id" TEXT NOT NULL,
    "agentTemplateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "sourceJson" JSONB NOT NULL,
    "normalizedJson" JSONB NOT NULL,
    "validationReport" JSONB NOT NULL,
    "n8nWorkflowId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceAgent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "agentTemplateId" TEXT NOT NULL,
    "agentTemplateVersionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "configJson" JSONB NOT NULL,
    "activatedById" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),
    CONSTRAINT "WorkspaceAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AgentAuditAction" NOT NULL,
    "agentTemplateId" TEXT NOT NULL,
    "versionId" TEXT,
    "workspaceId" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentTemplate_slug_key" ON "AgentTemplate"("slug");
CREATE INDEX "AgentTemplate_status_category_idx" ON "AgentTemplate"("status", "category");
CREATE UNIQUE INDEX "AgentTemplateVersion_agentTemplateId_version_key" ON "AgentTemplateVersion"("agentTemplateId", "version");
CREATE INDEX "AgentTemplateVersion_agentTemplateId_version_idx" ON "AgentTemplateVersion"("agentTemplateId", "version");
CREATE INDEX "WorkspaceAgent_workspaceId_isActive_idx" ON "WorkspaceAgent"("workspaceId", "isActive");
CREATE INDEX "WorkspaceAgent_agentTemplateId_idx" ON "WorkspaceAgent"("agentTemplateId");
CREATE INDEX "AgentAuditLog_agentTemplateId_idx" ON "AgentAuditLog"("agentTemplateId");
CREATE INDEX "AgentAuditLog_workspaceId_idx" ON "AgentAuditLog"("workspaceId");

-- AddForeignKey
ALTER TABLE "AgentTemplate" ADD CONSTRAINT "AgentTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentTemplateVersion" ADD CONSTRAINT "AgentTemplateVersion_agentTemplateId_fkey" FOREIGN KEY ("agentTemplateId") REFERENCES "AgentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentTemplateVersion" ADD CONSTRAINT "AgentTemplateVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkspaceAgent" ADD CONSTRAINT "WorkspaceAgent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceAgent" ADD CONSTRAINT "WorkspaceAgent_agentTemplateId_fkey" FOREIGN KEY ("agentTemplateId") REFERENCES "AgentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceAgent" ADD CONSTRAINT "WorkspaceAgent_agentTemplateVersionId_fkey" FOREIGN KEY ("agentTemplateVersionId") REFERENCES "AgentTemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceAgent" ADD CONSTRAINT "WorkspaceAgent_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentAuditLog" ADD CONSTRAINT "AgentAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentAuditLog" ADD CONSTRAINT "AgentAuditLog_agentTemplateId_fkey" FOREIGN KEY ("agentTemplateId") REFERENCES "AgentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentAuditLog" ADD CONSTRAINT "AgentAuditLog_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AgentTemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentAuditLog" ADD CONSTRAINT "AgentAuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
