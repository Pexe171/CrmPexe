import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response } from "express";
import { JsonLoggerService } from "./json-logger.service";

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: JsonLoggerService) {}

  use(req: Request, res: Response, next: () => void) {
    const start = Date.now();
    const ip = this.resolveIp(req);
    const userAgent = req.get("user-agent");
    const workspaceId = this.resolveWorkspaceId(req);

    res.on("finish", () => {
      const durationMs = Date.now() - start;
      this.logger.log({
        event: "http_request",
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        ip,
        userAgent,
        workspaceId
      });
    });

    next();
  }

  private resolveIp(req: Request) {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string" && forwardedFor.trim()) {
      return forwardedFor.split(",")[0].trim();
    }
    return req.ip;
  }

  private resolveWorkspaceId(req: Request) {
    const headerWorkspace = req.headers["x-workspace-id"];
    if (typeof headerWorkspace === "string" && headerWorkspace.trim()) {
      return headerWorkspace.trim();
    }

    const user = req.user as { currentWorkspaceId?: string } | undefined;
    return user?.currentWorkspaceId ?? null;
  }
}
