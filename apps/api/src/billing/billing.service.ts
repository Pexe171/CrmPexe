import { BadRequestException, Injectable } from "@nestjs/common";
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

    const status = (subscription?.status ?? "NO_SUBSCRIPTION") as WorkspaceBillingStatus;
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
