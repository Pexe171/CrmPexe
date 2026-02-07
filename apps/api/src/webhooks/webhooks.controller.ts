import { Body, Controller, Headers, Post, UseGuards } from "@nestjs/common";
import { ChannelsService } from "../channels/channels.service";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post("whatsapp")
  @UseGuards(RateLimitGuard)
  @RateLimit({
    windowMs: Number(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS || 5 * 60 * 1000),
    max: Number(process.env.WEBHOOK_RATE_LIMIT_MAX || 120),
    byIp: true,
    byWorkspace: true,
    keyPrefix: "webhook-whatsapp"
  })
  async receiveWhatsappWebhook(
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.channelsService.receiveWebhook(
      "whatsapp",
      body,
      headers,
      workspaceId
    );
  }
}
