-- Add activity timeline and webhook subscription tables
CREATE TYPE "ActivityEntity" AS ENUM ('DEAL', 'CONTACT', 'COMPANY');
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'EMAIL', 'NOTE', 'MEETING');
CREATE TYPE "WebhookEvent" AS ENUM ('DEAL_WON', 'CONTACT_CREATED');

CREATE TABLE "Activity" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "entityType" "ActivityEntity" NOT NULL,
  "entityId" TEXT NOT NULL,
  "type" "ActivityType" NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookSubscription" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "event" "WebhookEvent" NOT NULL,
  "targetUrl" TEXT NOT NULL,
  "secret" TEXT,
  "headers" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Activity_workspaceId_idx" ON "Activity"("workspaceId");
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");
CREATE INDEX "Activity_workspaceId_entityType_entityId_idx" ON "Activity"("workspaceId", "entityType", "entityId");
CREATE INDEX "Activity_workspaceId_occurredAt_idx" ON "Activity"("workspaceId", "occurredAt");

CREATE INDEX "WebhookSubscription_workspaceId_idx" ON "WebhookSubscription"("workspaceId");
CREATE INDEX "WebhookSubscription_workspaceId_event_idx" ON "WebhookSubscription"("workspaceId", "event");

ALTER TABLE "Activity" ADD CONSTRAINT "Activity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
