import {
  ChannelContact,
  ChannelInboundMessage,
  ChannelIntegration,
  ChannelSendMessageInput,
  ChannelSendMessageResult
} from "../types";

export interface IChannelProvider {
  readonly channel: string;
  sendMessage(
    input: ChannelSendMessageInput,
    integration: ChannelIntegration
  ): Promise<ChannelSendMessageResult>;
  receiveWebhook(
    payload: unknown,
    headers: Record<string, string>,
    integration: ChannelIntegration
  ): Promise<ChannelInboundMessage[]>;
  verifyWebhook(
    payload: unknown,
    headers: Record<string, string>,
    integration: ChannelIntegration
  ): Promise<boolean>;
  mapInboundToContact(message: ChannelInboundMessage): ChannelContact;
}
