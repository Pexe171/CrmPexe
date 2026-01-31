import { randomUUID } from "crypto";
import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response } from "express";
import { CorrelationIdService } from "./correlation-id.service";

type RequestWithCorrelationId = Request & { correlationId?: string };

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly correlationIdService: CorrelationIdService) {}

  use(req: RequestWithCorrelationId, res: Response, next: () => void) {
    const headerId = req.header("x-correlation-id");
    const correlationId = headerId?.trim() || randomUUID();

    req.correlationId = correlationId;
    res.setHeader("x-correlation-id", correlationId);

    this.correlationIdService.run(correlationId, () => next());
  }
}
