-- Replace Integration with IntegrationAccount + encrypted secrets
DROP TABLE "IntegrationSecret";
DROP TABLE "Integration";
DROP TYPE "IntegrationProvider";

CREATE TYPE "IntegrationAccountType" AS ENUM ('WHATSAPP');
CREATE TYPE "IntegrationAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "IntegrationAccount" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "type" "IntegrationAccountType" NOT NULL,
  "name" TEXT NOT NULL,
  "status" "IntegrationAccountStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationSecret" (
  "id" TEXT NOT NULL,
  "integrationAccountId" TEXT NOT NULL,
  "encryptedPayload" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationSecret_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationAccount_workspaceId_type_key" ON "IntegrationAccount"("workspaceId", "type");
CREATE INDEX "IntegrationAccount_workspaceId_idx" ON "IntegrationAccount"("workspaceId");
CREATE UNIQUE INDEX "IntegrationSecret_integrationAccountId_key" ON "IntegrationSecret"("integrationAccountId");
CREATE INDEX "IntegrationSecret_integrationAccountId_idx" ON "IntegrationSecret"("integrationAccountId");

ALTER TABLE "IntegrationAccount"
  ADD CONSTRAINT "IntegrationAccount_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationSecret"
  ADD CONSTRAINT "IntegrationSecret_integrationAccountId_fkey"
  FOREIGN KEY ("integrationAccountId") REFERENCES "IntegrationAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
