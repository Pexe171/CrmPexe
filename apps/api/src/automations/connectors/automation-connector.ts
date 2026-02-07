export type AutomationProvisioningStatus = "connected" | "skipped" | "failed";

export type AutomationProvisioningResult = {
  integration: string;
  status: AutomationProvisioningStatus;
  details: string;
  metadata?: Record<string, unknown>;
};

export type AutomationConnectorPayload = {
  integration: string;
  templateId: string;
  workspaceId: string;
  config: Record<string, unknown>;
};

export interface AutomationConnector {
  key: string;
  label: string;
  provision(
    payload: AutomationConnectorPayload
  ): Promise<AutomationProvisioningResult>;
}
