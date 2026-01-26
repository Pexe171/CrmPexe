-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "leadScore" INTEGER,
ADD COLUMN "leadScoreLabel" TEXT;

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN "contactId" TEXT,
ADD COLUMN "leadScore" INTEGER,
ADD COLUMN "leadScoreLabel" TEXT;

-- CreateIndex
CREATE INDEX "Deal_contactId_idx" ON "Deal"("contactId");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
