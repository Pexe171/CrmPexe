-- CreateEnum
CREATE TYPE "WorkspaceMembershipRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "WorkspaceMembershipStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Workspace"
ADD COLUMN "code" TEXT,
ADD COLUMN "passwordHash" TEXT;

-- Backfill existing rows
UPDATE "Workspace"
SET "code" = UPPER(SUBSTRING(REPLACE(id, '-', '') FROM 1 FOR 6)),
    "passwordHash" = md5(id || '-default-workspace-password')
WHERE "code" IS NULL OR "passwordHash" IS NULL;

-- Make required
ALTER TABLE "Workspace"
ALTER COLUMN "code" SET NOT NULL,
ALTER COLUMN "passwordHash" SET NOT NULL;

-- CreateTable
CREATE TABLE "WorkspaceMembership" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceMembershipRole" NOT NULL DEFAULT 'MEMBER',
    "status" "WorkspaceMembershipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

-- Seed memberships from existing approved members
INSERT INTO "WorkspaceMembership" ("id", "workspaceId", "userId", "role", "status", "createdAt", "updatedAt")
SELECT md5(wm."workspaceId" || ":" || wm."userId"),
       wm."workspaceId",
       wm."userId",
       CASE WHEN r."name" = 'Owner' THEN 'OWNER'::"WorkspaceMembershipRole" ELSE 'MEMBER'::"WorkspaceMembershipRole" END,
       'APPROVED'::"WorkspaceMembershipStatus",
       wm."createdAt",
       wm."updatedAt"
FROM "WorkspaceMember" wm
LEFT JOIN "Role" r ON r."id" = wm."roleId";

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_code_key" ON "Workspace"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMembership_workspaceId_userId_key" ON "WorkspaceMembership"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_userId_status_idx" ON "WorkspaceMembership"("userId", "status");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_workspaceId_status_idx" ON "WorkspaceMembership"("workspaceId", "status");

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
