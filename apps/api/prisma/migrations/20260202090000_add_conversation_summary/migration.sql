-- CreateTable
CREATE TABLE "ConversationSummary" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "bullets" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationSummary_workspaceId_idx" ON "ConversationSummary"("workspaceId");

-- CreateIndex
CREATE INDEX "ConversationSummary_conversationId_idx" ON "ConversationSummary"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationSummary_workspaceId_conversationId_idx" ON "ConversationSummary"("workspaceId", "conversationId");

-- AddForeignKey
ALTER TABLE "ConversationSummary" ADD CONSTRAINT "ConversationSummary_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationSummary" ADD CONSTRAINT "ConversationSummary_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
