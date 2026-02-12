import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";
import { RATE_LIMIT_METADATA_KEY } from "./rate-limit.decorator";
import { RateLimitService } from "./rate-limit.service";
import { RateLimitOptions } from "./rate-limit.types";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService
  ) {}

  async canActivate(context: ExecutionContext) {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_METADATA_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const ip = this.resolveIp(request);
    const workspaceId = this.resolveWorkspaceId(request);
    const keys: Array<{ key: string; label: string | null }> = [];

    if (options.byIp !== false && ip) {
      keys.push({ key: `ip:${ip}`, label: "ip" });
    }

    if (options.byWorkspace && workspaceId) {
      keys.push({ key: `workspace:${workspaceId}`, label: "workspace" });
    }

    for (const entry of keys) {
      const result = await this.rateLimitService.consume(
        `${options.keyPrefix ?? "default"}:${entry.key}`,
        options.max,
        options.windowMs
      );

      if (entry.label) {
        response.setHeader(`x-rate-limit-limit-${entry.label}`, options.max);
        response.setHeader(
          `x-rate-limit-remaining-${entry.label}`,
          result.remaining
        );
        response.setHeader(`x-rate-limit-reset-${entry.label}`, result.resetAt);
      }

      if (!result.allowed) {
        throw new HttpException(
          "Muitas requisições. Tente novamente em instantes.",
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    }

    return true;
  }

  private resolveIp(request: Request) {
    const forwardedFor = request.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string" && forwardedFor.trim()) {
      return forwardedFor.split(",")[0].trim();
    }
    return request.ip;
  }

  private resolveWorkspaceId(request: Request) {
    const headerWorkspace = request.headers["x-workspace-id"];
    if (typeof headerWorkspace === "string" && headerWorkspace.trim()) {
      return headerWorkspace.trim();
    }
    const user = (
      request as Request & { user?: { currentWorkspaceId?: string | null } }
    ).user;
    return user?.currentWorkspaceId ?? null;
  }
}
