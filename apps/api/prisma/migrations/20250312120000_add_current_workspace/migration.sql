-- Add current workspace reference to users
ALTER TABLE "User" ADD COLUMN "currentWorkspaceId" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_currentWorkspaceId_fkey" FOREIGN KEY ("currentWorkspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "User_currentWorkspaceId_idx" ON "User"("currentWorkspaceId");
