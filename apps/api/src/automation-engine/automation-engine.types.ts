export type AutomationTrigger = "message.inbound.created" | "deal.stage.changed";

export interface MessageInboundCreatedPayload {
  workspaceId: string;
  conversationId: string;
  messageId: string;
  contactId: string;
}

export interface DealStageChangedPayload {
  workspaceId: string;
  dealId: string;
  stage: string;
  previousStage?: string | null;
}

export type AutomationPayloadMap = {
  "message.inbound.created": MessageInboundCreatedPayload;
  "deal.stage.changed": DealStageChangedPayload;
};
