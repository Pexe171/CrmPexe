import { Body, Controller, Headers, Post } from "@nestjs/common";
import { ChannelsService } from "../channels/channels.service";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post("whatsapp")
  async receiveWhatsappWebhook(
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.channelsService.receiveWebhook("whatsapp", body, headers, workspaceId);
  }
}
