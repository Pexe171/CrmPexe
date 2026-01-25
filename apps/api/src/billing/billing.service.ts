import { BadRequestException, Injectable } from "@nestjs/common";
import { MercadoPagoWebhookPayload } from "./dto/mercado-pago-webhook.dto";
import { MercadoPagoBillingProvider } from "./providers/mercado-pago-billing.provider";

@Injectable()
export class BillingService {
  constructor(private readonly mercadoPagoProvider: MercadoPagoBillingProvider) {}

  async handleMercadoPagoWebhook(
    payload: MercadoPagoWebhookPayload,
    headers: Record<string, string | undefined>
  ) {
    if (!this.validateMercadoPagoSignature(payload, headers)) {
      throw new BadRequestException("Assinatura do Mercado Pago inválida.");
    }

    return this.mercadoPagoProvider.handleNotification({
      payload,
      headers
    });
  }

  private validateMercadoPagoSignature(
    payload: MercadoPagoWebhookPayload,
    headers: Record<string, string | undefined>
  ): boolean {
    const signature = headers["x-signature"];
    const requestId = headers["x-request-id"];

    // TODO: Validar o x-signature conforme a documentação do Mercado Pago (timestamp + assinatura HMAC).
    // Manteremos o placeholder para implementar a verificação criptográfica quando as chaves forem configuradas.
    void payload;
    void signature;
    void requestId;

    return true;
  }
}
