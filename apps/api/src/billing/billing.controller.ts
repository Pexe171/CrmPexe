import { Body, Controller, Get, Headers, Post, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { MercadoPagoWebhookPayload } from "./dto/mercado-pago-webhook.dto";
import { BillingService } from "./billing.service";

@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post("webhooks/mercadopago")
  async receiveMercadoPagoWebhook(
    @Body() payload: MercadoPagoWebhookPayload,
    @Headers() headers: Record<string, string>
  ) {
    return this.billingService.handleMercadoPagoWebhook(payload, headers);
  }

  @Get("workspace-summary")
  @UseGuards(AccessTokenGuard)
  async getWorkspaceSummary(@CurrentUser() user: AuthUser) {
    return this.billingService.getWorkspaceSummary(user);
  }
}
