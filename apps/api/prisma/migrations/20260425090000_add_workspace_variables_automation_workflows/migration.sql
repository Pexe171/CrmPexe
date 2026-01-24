-- Add automation workflow fields
ALTER TABLE "AutomationInstance"
ADD COLUMN "externalWorkflowId" TEXT,
ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT false;

-- Create workspace variables table
CREATE TABLE "WorkspaceVariable" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "encryptedValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceVariable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceVariable_workspaceId_key_key" ON "WorkspaceVariable"("workspaceId", "key");
CREATE INDEX "WorkspaceVariable_workspaceId_idx" ON "WorkspaceVariable"("workspaceId");

ALTER TABLE "WorkspaceVariable"
ADD CONSTRAINT "WorkspaceVariable_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
