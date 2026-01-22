export interface CreateOutgoingMessageDto {
  text: string;
  providerMessageId?: string | null;
  sentAt?: string;
  meta?: Record<string, unknown> | null;
}
