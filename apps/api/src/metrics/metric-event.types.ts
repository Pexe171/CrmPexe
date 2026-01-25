export const MetricEventType = {
  MessageInbound: "message.inbound",
  MessageOutbound: "message.outbound",
  ConversationOpened: "conversation.opened",
  ConversationClosed: "conversation.closed",
  AutomationSuccess: "automation.success",
  AutomationFailure: "automation.failure",
  DealStageChanged: "deal.stage.changed"
} as const;

export type MetricEventType = (typeof MetricEventType)[keyof typeof MetricEventType];
