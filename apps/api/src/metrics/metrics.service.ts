import { Injectable } from "@nestjs/common";
import { Prisma, MetricEvent } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MetricEventType } from "./metric-event.types";

interface RecordMetricEventInput {
  workspaceId: string;
  type: MetricEventType;
  payload?: Prisma.InputJsonValue | null;
}

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordEvent({ workspaceId, type, payload }: RecordMetricEventInput): Promise<MetricEvent> {
    return this.prisma.metricEvent.create({
      data: {
        workspaceId,
        type,
        payload: payload ?? undefined
      }
    });
  }
}
