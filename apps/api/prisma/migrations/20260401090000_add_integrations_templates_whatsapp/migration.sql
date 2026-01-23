-- Add integrations/secrets, message templates, and unique provider message ids
CREATE TYPE "IntegrationProvider" AS ENUM ('WHATSAPP');

CREATE TABLE "Integration" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationSecret" (
  "id" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationSecret_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageTemplate" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "externalId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

DROP INDEX "Message_providerMessageId_idx";

CREATE UNIQUE INDEX "Message_workspaceId_providerMessageId_key" ON "Message"("workspaceId", "providerMessageId");
CREATE UNIQUE INDEX "Integration_workspaceId_provider_key" ON "Integration"("workspaceId", "provider");
CREATE UNIQUE INDEX "IntegrationSecret_integrationId_key_key" ON "IntegrationSecret"("integrationId", "key");
CREATE UNIQUE INDEX "MessageTemplate_workspaceId_channel_name_language_key" ON "MessageTemplate"("workspaceId", "channel", "name", "language");

CREATE INDEX "Integration_workspaceId_idx" ON "Integration"("workspaceId");
CREATE INDEX "IntegrationSecret_integrationId_idx" ON "IntegrationSecret"("integrationId");
CREATE INDEX "MessageTemplate_workspaceId_idx" ON "MessageTemplate"("workspaceId");

ALTER TABLE "Integration" ADD CONSTRAINT "Integration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationSecret" ADD CONSTRAINT "IntegrationSecret_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
