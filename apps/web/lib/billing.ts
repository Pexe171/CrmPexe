export type BillingStatus =
  | "ACTIVE"
  | "PENDING"
  | "IN_PROCESS"
  | "REJECTED"
  | "CANCELED"
  | "NO_SUBSCRIPTION"
  | "NO_WORKSPACE";

export type BillingInvoice = {
  id: string;
  amount: number;
  status: "PAID" | "PENDING" | "OVERDUE";
  dueDate: string;
};

export type BillingPaymentMethod = {
  brand: string;
  last4: string;
  holder: string;
  expiresAt: string;
};

export type BillingSummary = {
  workspaceId: string | null;
  status: BillingStatus;
  isDelinquent: boolean;
  lastUpdatedAt: string | null;
  invoices: BillingInvoice[];
  paymentMethod: BillingPaymentMethod | null;
};

export const fetchWorkspaceBillingSummary = async (
  signal?: AbortSignal
): Promise<BillingSummary> => {
  const response = await fetch("/api/billing/workspace-summary", {
    credentials: "include",
    signal
  });

  if (!response.ok) {
    throw new Error(
      "Não foi possível carregar o status de cobrança do workspace."
    );
  }

  return (await response.json()) as BillingSummary;
};
