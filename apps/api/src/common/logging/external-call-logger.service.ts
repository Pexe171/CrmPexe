import { Injectable } from "@nestjs/common";
import { JsonLoggerService } from "./json-logger.service";

type ExternalCallPayload = {
  system: "n8n" | "whatsapp" | "billing" | "email";
  operation: string;
  method?: string;
  url?: string;
  status?: number | string;
  durationMs: number;
  success: boolean;
  workspaceId?: string | null;
  errorMessage?: string;
};

@Injectable()
export class ExternalCallLoggerService {
  constructor(private readonly logger: JsonLoggerService) {}

  log(payload: ExternalCallPayload) {
    this.logger.log({
      event: "external_call",
      ...payload
    });
  }
}
