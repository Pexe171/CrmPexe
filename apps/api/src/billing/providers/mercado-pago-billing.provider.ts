import { Injectable } from "@nestjs/common";
import { SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MercadoPagoWebhookPayload } from "../dto/mercado-pago-webhook.dto";
import {
  BillingCheckoutResult,
  BillingCustomerInput,
  BillingCustomerResult,
  BillingNotificationEnvelope,
  BillingNotificationResult,
  BillingPaymentInput,
  IBillingProvider
} from "./billing-provider.interface";

const MERCADO_PAGO_SANDBOX_CHECKOUT_URL =
  "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=TEST-123";

const STATUS_MAPPING: Record<string, SubscriptionStatus> = {
  approved: SubscriptionStatus.ACTIVE,
  pending: SubscriptionStatus.PENDING,
  in_process: SubscriptionStatus.IN_PROCESS,
  rejected: SubscriptionStatus.REJECTED,
  cancelled: SubscriptionStatus.CANCELED
};

@Injectable()
export class MercadoPagoBillingProvider implements IBillingProvider {
  constructor(private readonly prisma: PrismaService) {}

  async createCustomer(input: BillingCustomerInput): Promise<BillingCustomerResult> {
    const safeEmail = input.email.trim().toLowerCase();

    return {
      providerCustomerId: `sandbox-customer-${safeEmail}`,
      sandbox: true
    };
  }

  async processPayment(input: BillingPaymentInput): Promise<BillingCheckoutResult> {
    return {
      checkoutUrl: MERCADO_PAGO_SANDBOX_CHECKOUT_URL,
      providerReference: `sandbox-payment-${input.customerId}`,
      sandbox: true
    };
  }

  async handleNotification(
    notification: BillingNotificationEnvelope<MercadoPagoWebhookPayload>
  ): Promise<BillingNotificationResult> {
    const payloadType = notification.payload.type;

    if (payloadType !== "payment" && payloadType !== "subscription_authorized") {
      return {
        handled: false,
        reason: "Tipo de notificação não suportado pelo Mercado Pago."
      };
    }

    const externalId = this.resolveExternalId(notification.payload);
    if (!externalId) {
      return {
        handled: false,
        reason: "Notificação do Mercado Pago sem identificador externo."
      };
    }

    const status = this.resolveStatus(notification.payload, payloadType);
    const mappedStatus = this.mapStatus(status);

    await this.prisma.subscription.upsert({
      where: { externalId },
      update: { status: mappedStatus },
      create: {
        externalId,
        provider: "MERCADO_PAGO",
        status: mappedStatus
      }
    });

    return {
      handled: true,
      mappedStatus,
      externalId
    };
  }

  private resolveExternalId(payload: MercadoPagoWebhookPayload): string | null {
    const dataId = payload.data?.id ?? payload.id;
    if (dataId === undefined || dataId === null) {
      return null;
    }
    return String(dataId);
  }

  private resolveStatus(payload: MercadoPagoWebhookPayload, payloadType?: string): string {
    if (payload.status) {
      return payload.status;
    }

    if (payloadType === "subscription_authorized") {
      return "approved";
    }

    return "pending";
  }

  private mapStatus(status: string): SubscriptionStatus {
    const normalizedStatus = status.trim().toLowerCase();
    return STATUS_MAPPING[normalizedStatus] ?? SubscriptionStatus.PENDING;
  }
}
