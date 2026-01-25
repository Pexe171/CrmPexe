import { SubscriptionStatus } from "@prisma/client";

export interface BillingCustomerInput {
  name: string;
  email: string;
  externalReference?: string;
}

export interface BillingCustomerResult {
  providerCustomerId: string;
  sandbox: boolean;
}

export interface BillingPaymentInput {
  customerId: string;
  amount: number;
  description?: string;
  currency?: string;
  externalReference?: string;
}

export interface BillingCheckoutResult {
  checkoutUrl: string;
  providerReference?: string;
  sandbox: boolean;
}

export interface BillingNotificationResult {
  handled: boolean;
  mappedStatus?: SubscriptionStatus;
  externalId?: string;
  reason?: string;
}

export interface BillingNotificationEnvelope<TPayload = unknown> {
  payload: TPayload;
  headers: Record<string, string | undefined>;
}

export interface IBillingProvider {
  createCustomer(input: BillingCustomerInput): Promise<BillingCustomerResult>;
  processPayment(input: BillingPaymentInput): Promise<BillingCheckoutResult>;
  handleNotification(
    notification: BillingNotificationEnvelope
  ): Promise<BillingNotificationResult>;
}
