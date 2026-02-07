export type MercadoPagoWebhookType =
  | "payment"
  | "subscription_authorized"
  | string;

export interface MercadoPagoWebhookPayload {
  id?: number | string;
  type?: MercadoPagoWebhookType;
  action?: string;
  data?: {
    id?: number | string;
  };
  status?: string;
}
