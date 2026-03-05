import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { IntegrationAccountType } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { PrismaService } from "../prisma/prisma.service";

export const WHATSAPP_QR_UPDATE = "whatsapp.qr_update";
export const WHATSAPP_CONNECTED = "whatsapp.connected";

const SESSION_NAME = "native";
const PROVIDER = "NATIVE";

type NativeSessionState = {
  qr: string | null;
  status: string;
  socket?: unknown;
  retryCount?: number;
};

@Injectable()
export class WhatsappNativeService {
  private readonly sessionsDir: string;
  private readonly stateByAccount = new Map<string, NativeSessionState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.sessionsDir = path.join(process.cwd(), "data", "wa-sessions");
    try {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  private static readonly CONNECTION_FAILED_MESSAGE =
    "WhatsApp bloqueou a conexão (IP de servidor/VPS costuma ser bloqueado). Use a opção API externa (Evolution) para maior estabilidade.";

  async startNativeSession(
    userId: string,
    accountId: string,
    workspaceId?: string
  ): Promise<{ qr: string | null; status: string; message?: string }> {
    const account = await this.resolveAccount(userId, accountId, workspaceId);
    if (account.type !== IntegrationAccountType.WHATSAPP) {
      throw new BadRequestException("Integração não é do tipo WhatsApp.");
    }

    const existing = this.stateByAccount.get(accountId);
    if (existing?.status === "connected" || existing?.status === "ready") {
      return { qr: null, status: existing.status };
    }
    if (existing?.qr) {
      return { qr: existing.qr, status: existing.status };
    }
    // Permite nova tentativa: limpa estado de falha para abrir novo socket
    if (existing?.status === "connection_failed") {
      this.stateByAccount.delete(accountId);
    }

    await this.connectSocket(accountId, userId, account.workspaceId);
    const state = this.stateByAccount.get(accountId);
    if (state?.qr) {
      return { qr: state.qr, status: state.status };
    }
    // Aguardar ate ~8s pelo QR (Baileys emite de forma assincrona)
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 400));
      const current = this.stateByAccount.get(accountId);
      if (current?.qr) {
        return { qr: current.qr, status: current.status };
      }
      if (current?.status === "connected" || current?.status === "ready") {
        return { qr: null, status: current.status };
      }
      if (current?.status === "connection_failed") {
        return {
          qr: null,
          status: "connection_failed",
          message: WhatsappNativeService.CONNECTION_FAILED_MESSAGE
        };
      }
    }
    const final = this.stateByAccount.get(accountId);
    const status = final?.status ?? "connecting";
    return {
      qr: final?.qr ?? null,
      status,
      ...(status === "connection_failed" && {
        message: WhatsappNativeService.CONNECTION_FAILED_MESSAGE
      })
    };
  }

  async getNativeStatus(
    userId: string,
    accountId: string,
    workspaceId?: string
  ): Promise<{ qr: string | null; status: string; message?: string }> {
    await this.resolveAccount(userId, accountId, workspaceId);
    const state = this.stateByAccount.get(accountId);
    if (state) {
      return {
        qr: state.qr,
        status: state.status,
        ...(state.status === "connection_failed" && {
          message: WhatsappNativeService.CONNECTION_FAILED_MESSAGE
        })
      };
    }
    const dbSession = await this.prisma.whatsappSession.findUnique({
      where: {
        integrationAccountId_profileUserId_sessionName: {
          integrationAccountId: accountId,
          profileUserId: userId,
          sessionName: SESSION_NAME
        }
      }
    });
    const status = dbSession?.status ?? "disconnected";
    return {
      qr: dbSession?.qrCode ?? null,
      status,
      ...(status === "connection_failed" && {
        message: WhatsappNativeService.CONNECTION_FAILED_MESSAGE
      })
    };
  }

  private async resolveAccount(
    userId: string,
    accountId: string,
    workspaceId?: string
  ) {
    const workspaceIdResolved = workspaceId?.trim()
      ? workspaceId
      : (await this.prisma.user.findUnique({
          where: { id: userId },
          select: { currentWorkspaceId: true }
        }))?.currentWorkspaceId ?? null;
    if (!workspaceIdResolved) {
      throw new BadRequestException("Workspace atual não definido.");
    }
    const account = await this.prisma.integrationAccount.findFirst({
      where: { id: accountId, workspaceId: workspaceIdResolved }
    });
    if (!account) {
      throw new NotFoundException("Integração não encontrada.");
    }
    return account;
  }

  private async connectSocket(
    accountId: string,
    userId: string,
    workspaceId: string,
    retryCount = 0
  ): Promise<void> {
    if (this.stateByAccount.has(accountId)) {
      return;
    }

    const accountDir = path.join(this.sessionsDir, accountId);
    try {
      fs.mkdirSync(accountDir, { recursive: true });
    } catch {
      throw new BadRequestException("Não foi possível criar pasta de sessão.");
    }

    const baileys = await import("@whiskeysockets/baileys");
    const { useMultiFileAuthState, makeWASocket, DisconnectReason, Browsers } = baileys;
    const { state, saveCreds } = await useMultiFileAuthState(accountDir);

    const silentLogger = {
      level: "silent" as const,
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      child: (_obj: Record<string, unknown>) => silentLogger,
    };
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.ubuntu("Chrome"),
      connectTimeoutMs: 60_000,
      logger: silentLogger,
    });

    const sessionState: NativeSessionState = {
      qr: null,
      status: "connecting",
      retryCount
    };
    this.stateByAccount.set(accountId, sessionState);
    sessionState.socket = sock;

    const self = this;
    sock.ev.on("connection.update", async (update) => {
      const { connection, qr: qrUpdate, lastDisconnect } = update;
      if (qrUpdate) {
        sessionState.qr = qrUpdate;
        sessionState.status = "connecting";
        await self.upsertSession(userId, accountId, "connecting", qrUpdate);
        self.eventEmitter.emit(WHATSAPP_QR_UPDATE, {
          workspaceId,
          accountId,
          qrCodeData: qrUpdate
        });
      }
      if (connection === "open") {
        sessionState.qr = null;
        sessionState.status = "connected";
        await self.upsertSession(userId, accountId, "connected", null);
        self.eventEmitter.emit(WHATSAPP_CONNECTED, { workspaceId, accountId });
      }
      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
          ?.statusCode;
        if (statusCode === DisconnectReason.loggedOut) {
          sessionState.qr = null;
          sessionState.status = "disconnected";
          self.stateByAccount.delete(accountId);
          await self.upsertSession(userId, accountId, "disconnected", null);
        } else {
          const currentRetries = sessionState.retryCount ?? 0;
          self.stateByAccount.delete(accountId);
          if (currentRetries < 2) {
            setTimeout(() => {
              self.connectSocket(accountId, userId, workspaceId, currentRetries + 1);
            }, 3000);
          } else {
            const failedState: NativeSessionState = { qr: null, status: "connection_failed" };
            self.stateByAccount.set(accountId, failedState);
            await self.upsertSession(userId, accountId, "connection_failed", null);
          }
        }
      }
    });

    sock.ev.on("creds.update", saveCreds);
  }

  private async upsertSession(
    userId: string,
    integrationAccountId: string,
    status: string,
    qrCode: string | null
  ): Promise<void> {
    await this.prisma.whatsappSession.upsert({
      where: {
        integrationAccountId_profileUserId_sessionName: {
          integrationAccountId,
          profileUserId: userId,
          sessionName: SESSION_NAME
        }
      },
      create: {
        integrationAccountId,
        profileUserId: userId,
        provider: PROVIDER,
        sessionName: SESSION_NAME,
        status,
        qrCode,
        metadata: { strategy: "native", note: "Sessão integrada via QR (Baileys)." }
      },
      update: {
        provider: PROVIDER,
        status,
        qrCode,
        metadata: { strategy: "native", note: "Sessão integrada via QR (Baileys)." }
      }
    });
  }
}
