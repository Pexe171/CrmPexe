import { Injectable } from "@nestjs/common";
import {
  AutomationConnector,
  AutomationConnectorPayload,
  AutomationProvisioningResult
} from "./automation-connector";

@Injectable()
export class MockAutomationConnector implements AutomationConnector {
  key = "mock";
  label = "Conector Mock";

  async provision(payload: AutomationConnectorPayload): Promise<AutomationProvisioningResult> {
    const now = new Date();

    return {
      integration: payload.integration,
      status: "connected",
      details: `Provisionamento mock concluído para ${payload.integration}.`,
      metadata: {
        executedAt: now.toISOString(),
        workspaceId: payload.workspaceId,
        templateId: payload.templateId,
        steps: [
          "Validar configuração",
          "Simular criação de recurso",
          "Finalizar vínculo com o workspace"
        ]
      }
    };
  }
}
