import { Body, Controller, Headers, Param, Post } from "@nestjs/common";
import { ChannelsService } from "./channels.service";

@Controller("channels")
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post(":channel/webhook")
  async receiveWebhook(
    @Param("channel") channel: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.channelsService.receiveWebhook(
      channel,
      body,
      headers,
      workspaceId
    );
  }
}
