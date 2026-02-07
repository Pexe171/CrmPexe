import { Injectable, LoggerService } from "@nestjs/common";
import { CorrelationIdService } from "./correlation-id.service";

type LogLevel = "debug" | "info" | "warn" | "error" | "verbose";

@Injectable()
export class JsonLoggerService implements LoggerService {
  constructor(private readonly correlationIdService: CorrelationIdService) {}

  log(message: unknown, context?: string) {
    this.write("info", message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.write("error", message, context, trace);
  }

  warn(message: unknown, context?: string) {
    this.write("warn", message, context);
  }

  debug(message: unknown, context?: string) {
    this.write("debug", message, context);
  }

  verbose(message: unknown, context?: string) {
    this.write("verbose", message, context);
  }

  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    trace?: string
  ) {
    const correlationId = this.correlationIdService.getId();
    const payload: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      correlationId: correlationId ?? null
    };

    if (context) {
      payload.context = context;
    }

    if (message instanceof Error) {
      payload.message = message.message;
      payload.error = {
        name: message.name,
        stack: message.stack
      };
    } else if (typeof message === "string") {
      payload.message = message;
    } else if (message && typeof message === "object") {
      const record = message as Record<string, unknown>;
      payload.message = record.message ?? "Evento";
      payload.data = record;
    } else {
      payload.message = String(message);
    }

    if (trace) {
      payload.trace = trace;
    }

    const output = JSON.stringify(payload);
    switch (level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "debug":
      case "verbose":
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }
}
