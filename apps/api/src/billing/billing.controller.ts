import { Body, Controller, Headers, Post } from "@nestjs/common";
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
}
