import { ChannelContact, ChannelInboundMessage, ChannelSendMessageInput, ChannelSendMessageResult } from "../types";

export interface IChannelProvider {
  readonly channel: string;
  sendMessage(input: ChannelSendMessageInput): Promise<ChannelSendMessageResult>;
  receiveWebhook(payload: unknown, headers: Record<string, string>): Promise<ChannelInboundMessage[]>;
  verifyWebhook(payload: unknown, headers: Record<string, string>): Promise<boolean>;
  mapInboundToContact(message: ChannelInboundMessage): ChannelContact;
}
