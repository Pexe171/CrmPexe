import { N8nAgentPublisherService } from "./n8n-agent-publisher.service";

describe("N8nAgentPublisherService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      N8N_BASE_URL: "https://n8n.example.com",
      N8N_API_TOKEN: "token"
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("deve classificar erro 401 como AUTH_ERROR", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "unauthorized"
    } as Response);

    const service = new N8nAgentPublisherService();

    await expect(
      service.publishAgentVersion({
        normalizedJson: { nodes: [], connections: {} },
        name: "Teste"
      })
    ).rejects.toMatchObject({ code: "AUTH_ERROR" });
  });

  it("deve chamar endpoint de deactivate do workflow", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    } as Response);

    const service = new N8nAgentPublisherService();

    await service.deactivateWorkflow("workflow-123");

    expect(global.fetch).toHaveBeenCalledWith(
      new URL("/api/v1/workflows/workflow-123/deactivate", "https://n8n.example.com"),
      expect.objectContaining({
        method: "POST"
      })
    );
  });
});
