-- CreateTable
CREATE TABLE "WhatsappSession" (
    "id" TEXT NOT NULL,
    "integrationAccountId" TEXT NOT NULL,
    "profileUserId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sessionName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "qrCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsappSession_integrationAccountId_idx" ON "WhatsappSession"("integrationAccountId");

-- CreateIndex
CREATE INDEX "WhatsappSession_profileUserId_idx" ON "WhatsappSession"("profileUserId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSession_integrationAccountId_profileUserId_sessionName_key" ON "WhatsappSession"("integrationAccountId", "profileUserId", "sessionName");

-- AddForeignKey
ALTER TABLE "WhatsappSession" ADD CONSTRAINT "WhatsappSession_integrationAccountId_fkey" FOREIGN KEY ("integrationAccountId") REFERENCES "IntegrationAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappSession" ADD CONSTRAINT "WhatsappSession_profileUserId_fkey" FOREIGN KEY ("profileUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
