import { createHmac } from "crypto";
import { WhatsappProvider } from "./whatsapp.provider";

describe("WhatsappProvider.verifyWebhook", () => {
  const externalCallLoggerMock = {
    log: jest.fn()
  };

  const payload = {
    messages: [
      {
        id: "msg-1",
        text: "Olá",
        from: "5511999999999"
      }
    ]
  };

  const makeSignature = (body: unknown, secret: string) =>
    createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.WHATSAPP_WEBHOOK_SECRET;
    delete process.env.WHATSAPP_WEBHOOK_SIGNATURE_HEADER;
  });

  it("deve falhar quando não houver segredo configurado", async () => {
    const provider = new WhatsappProvider(externalCallLoggerMock as never);

    const isValid = await provider.verifyWebhook(
      payload,
      {},
      {
        id: "integration-1",
        type: "WHATSAPP",
        workspaceId: "workspace-1",
        secrets: {}
      }
    );

    expect(isValid).toBe(false);
  });

  it("deve falhar quando assinatura for inválida", async () => {
    const provider = new WhatsappProvider(externalCallLoggerMock as never);

    const isValid = await provider.verifyWebhook(
      payload,
      { "x-whatsapp-signature": makeSignature(payload, "segredo-errado") },
      {
        id: "integration-1",
        type: "WHATSAPP",
        workspaceId: "workspace-1",
        secrets: { webhookSecret: "segredo-correto" }
      }
    );

    expect(isValid).toBe(false);
  });

  it("deve validar quando assinatura estiver correta", async () => {
    const provider = new WhatsappProvider(externalCallLoggerMock as never);
    const signature = makeSignature(payload, "segredo-correto");

    const isValid = await provider.verifyWebhook(
      payload,
      { "x-whatsapp-signature": signature },
      {
        id: "integration-1",
        type: "WHATSAPP",
        workspaceId: "workspace-1",
        secrets: { webhookSecret: "segredo-correto" }
      }
    );

    expect(isValid).toBe(true);
  });
});
