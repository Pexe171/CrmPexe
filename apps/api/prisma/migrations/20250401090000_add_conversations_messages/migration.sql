-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('IN', 'OUT', 'SYSTEM');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToUserId" TEXT,
    "channel" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "text" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_idx" ON "Conversation"("workspaceId");

-- CreateIndex
CREATE INDEX "Conversation_contactId_idx" ON "Conversation"("contactId");

-- CreateIndex
CREATE INDEX "Conversation_assignedToUserId_idx" ON "Conversation"("assignedToUserId");

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_status_idx" ON "Conversation"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Message_workspaceId_idx" ON "Message"("workspaceId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_providerMessageId_idx" ON "Message"("providerMessageId");

-- CreateIndex
CREATE INDEX "Message_workspaceId_sentAt_idx" ON "Message"("workspaceId", "sentAt");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
