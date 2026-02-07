import { BadRequestException, Injectable } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../auth/auth.types";
import { MercadoPagoWebhookPayload } from "./dto/mercado-pago-webhook.dto";
import { MercadoPagoBillingProvider } from "./providers/mercado-pago-billing.provider";

export type WorkspaceBillingStatus =
  | "ACTIVE"
  | "PENDING"
  | "IN_PROCESS"
  | "REJECTED"
  | "CANCELED"
  | "NO_SUBSCRIPTION"
  | "NO_WORKSPACE";

export type WorkspaceBillingSummary = {
  workspaceId: string | null;
  status: WorkspaceBillingStatus;
  isDelinquent: boolean;
  lastUpdatedAt: string | null;
  invoices: Array<{
    id: string;
    amount: number;
    status: "PAID" | "PENDING" | "OVERDUE";
    dueDate: string;
  }>;
  paymentMethod: {
    brand: string;
    last4: string;
    holder: string;
    expiresAt: string;
  } | null;
};

@Injectable()
export class BillingService {
  constructor(
    private readonly mercadoPagoProvider: MercadoPagoBillingProvider,
    private readonly prisma: PrismaService
  ) {}

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

  async getWorkspaceSummary(user: AuthUser): Promise<WorkspaceBillingSummary> {
    if (!user.currentWorkspaceId) {
      return {
        workspaceId: null,
        status: "NO_WORKSPACE",
        isDelinquent: false,
        lastUpdatedAt: null,
        invoices: [],
        paymentMethod: null
      };
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { workspaceId: user.currentWorkspaceId },
      orderBy: { updatedAt: "desc" }
    });

    const status = (subscription?.status ??
      "NO_SUBSCRIPTION") as WorkspaceBillingStatus;
    const isDelinquent = status === "REJECTED" || status === "CANCELED";

    return {
      workspaceId: user.currentWorkspaceId,
      status,
      isDelinquent,
      lastUpdatedAt: subscription?.updatedAt.toISOString() ?? null,
      invoices: [],
      paymentMethod: null
    };
  }

  private validateMercadoPagoSignature(
    payload: MercadoPagoWebhookPayload,
    headers: Record<string, string | undefined>
  ): boolean {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    const signature = headers["x-signature"];
    const requestId = headers["x-request-id"];

    if (!secret) {
      return process.env.NODE_ENV !== "production";
    }

    if (!signature || !requestId) {
      return false;
    }

    const parsedSignature = this.parseSignature(signature);
    if (!parsedSignature?.ts || !parsedSignature?.v1) {
      return false;
    }

    const timestamp = Number(parsedSignature.ts);
    if (!Number.isFinite(timestamp)) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const maxSkewSeconds = 300;
    if (Math.abs(now - timestamp) > maxSkewSeconds) {
      return false;
    }

    const payloadId = String(payload.data?.id ?? payload.id ?? "");
    if (!payloadId) {
      return false;
    }

    const signatureBase = `${timestamp}.${requestId}.${payloadId}`;
    const expected = createHmac("sha256", secret)
      .update(signatureBase)
      .digest("hex");

    return this.safeCompare(expected, parsedSignature.v1);
  }

  private parseSignature(
    signature: string
  ): { ts?: string; v1?: string } | null {
    const parts = signature.split(",");
    const entries = parts
      .map((part) => part.trim().split("="))
      .filter((entry) => entry.length === 2 && entry[0] && entry[1]);

    if (entries.length === 0) {
      return null;
    }

    const record = Object.fromEntries(entries) as Record<string, string>;
    return { ts: record.ts, v1: record.v1 };
  }

  private safeCompare(expected: string, received: string): boolean {
    const expectedBuffer = Buffer.from(expected, "utf8");
    const receivedBuffer = Buffer.from(received, "utf8");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }
}
