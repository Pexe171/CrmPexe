import { Injectable } from "@nestjs/common";
import { SubscriptionStatus } from "@prisma/client";
import { ExternalCallLoggerService } from "../../common/logging/external-call-logger.service";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly externalCallLogger: ExternalCallLoggerService
  ) {}

  async createCustomer(
    input: BillingCustomerInput
  ): Promise<BillingCustomerResult> {
    const start = Date.now();
    const safeEmail = input.email.trim().toLowerCase();
    const result = {
      providerCustomerId: `sandbox-customer-${safeEmail}`,
      sandbox: true
    };

    this.externalCallLogger.log({
      system: "billing",
      operation: "createCustomer",
      status: "sandbox",
      durationMs: Date.now() - start,
      success: true
    });

    return result;
  }

  async processPayment(
    input: BillingPaymentInput
  ): Promise<BillingCheckoutResult> {
    const start = Date.now();
    const result = {
      checkoutUrl: MERCADO_PAGO_SANDBOX_CHECKOUT_URL,
      providerReference: `sandbox-payment-${input.customerId}`,
      sandbox: true
    };

    this.externalCallLogger.log({
      system: "billing",
      operation: "processPayment",
      status: "sandbox",
      durationMs: Date.now() - start,
      success: true
    });

    return result;
  }

  async handleNotification(
    notification: BillingNotificationEnvelope<MercadoPagoWebhookPayload>
  ): Promise<BillingNotificationResult> {
    const start = Date.now();
    const payloadType = notification.payload.type;

    if (
      payloadType !== "payment" &&
      payloadType !== "subscription_authorized"
    ) {
      const result = {
        handled: false,
        reason: "Tipo de notificação não suportado pelo Mercado Pago."
      };
      this.externalCallLogger.log({
        system: "billing",
        operation: "handleNotification",
        status: "ignored",
        durationMs: Date.now() - start,
        success: false,
        errorMessage: result.reason
      });
      return result;
    }

    const externalId = this.resolveExternalId(notification.payload);
    if (!externalId) {
      const result = {
        handled: false,
        reason: "Notificação do Mercado Pago sem identificador externo."
      };
      this.externalCallLogger.log({
        system: "billing",
        operation: "handleNotification",
        status: "invalid",
        durationMs: Date.now() - start,
        success: false,
        errorMessage: result.reason
      });
      return result;
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

    const result = {
      handled: true,
      mappedStatus,
      externalId
    };

    this.externalCallLogger.log({
      system: "billing",
      operation: "handleNotification",
      status: mappedStatus,
      durationMs: Date.now() - start,
      success: true
    });

    return result;
  }

  private resolveExternalId(payload: MercadoPagoWebhookPayload): string | null {
    const dataId = payload.data?.id ?? payload.id;
    if (dataId === undefined || dataId === null) {
      return null;
    }
    return String(dataId);
  }

  private resolveStatus(
    payload: MercadoPagoWebhookPayload,
    payloadType?: string
  ): string {
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
