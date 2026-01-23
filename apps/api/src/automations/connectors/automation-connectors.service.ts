import { Injectable } from "@nestjs/common";
import {
  AutomationProvisioningResult,
  AutomationProvisioningStatus
} from "./automation-connector";
import { MockAutomationConnector } from "./mock-automation-connector.service";

type ProvisioningSummary = {
  status: AutomationProvisioningStatus;
  results: AutomationProvisioningResult[];
};

@Injectable()
export class AutomationConnectorsService {
  constructor(private readonly mockConnector: MockAutomationConnector) {}

  async provisionIntegrations(
    integrations: string[],
    context: {
      templateId: string;
      workspaceId: string;
      config: Record<string, unknown>;
    }
  ): Promise<ProvisioningSummary> {
    if (integrations.length === 0) {
      return {
        status: "skipped",
        results: []
      };
    }

    const results = await Promise.all(
      integrations.map((integration) =>
        this.mockConnector.provision({
          integration,
          templateId: context.templateId,
          workspaceId: context.workspaceId,
          config: context.config
        })
      )
    );

    const status = results.every((result) => result.status === "connected")
      ? "connected"
      : "failed";

    return {
      status,
      results
    };
  }
}
