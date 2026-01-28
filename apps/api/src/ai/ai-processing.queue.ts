import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import { LeadScoringService, LeadScorePayload } from "./lead-scoring.service";

const AI_PROCESSING_QUEUE = "ai-processing-queue";

type RedisConnectionOptions = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, unknown>;
};

const DEFAULT_REDIS_PORT = 6379;

const buildRedisConnection = (): RedisConnectionOptions => {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const parsed = new URL(redisUrl);
    const dbValue = parsed.pathname.replace("/", "");
    return {
      host: parsed.hostname,
      port: Number(parsed.port || DEFAULT_REDIS_PORT),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: dbValue ? Number(dbValue) : undefined,
      tls: parsed.protocol === "rediss:" ? {} : undefined
    };
  }

  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || DEFAULT_REDIS_PORT),
    password: process.env.REDIS_PASSWORD || undefined
  };
};

@Injectable()
export class AiProcessingQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiProcessingQueueService.name);
  private readonly queue: Queue<LeadScorePayload>;
  private worker?: Worker<LeadScorePayload>;

  constructor(private readonly leadScoringService: LeadScoringService) {
    this.queue = new Queue(AI_PROCESSING_QUEUE, {
      connection: buildRedisConnection()
    });
  }

  async onModuleInit() {
    const concurrency = Number(process.env.AI_PROCESSING_CONCURRENCY || 3);

    this.worker = new Worker(
      AI_PROCESSING_QUEUE,
      async (job) => {
        await this.leadScoringService.classifyInboundLead(job.data);
      },
      {
        connection: buildRedisConnection(),
        concurrency
      }
    );

    this.worker.on("failed", (job, error) => {
      const jobId = job?.id ?? "desconhecido";
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      this.logger.warn(`Job ${jobId} falhou no lead scoring inbound. ${message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue.close();
  }

  async enqueueLeadScoring(payload: LeadScorePayload) {
    await this.queue.add("lead-scoring", payload, {
      removeOnComplete: true,
      removeOnFail: { count: 100 }
    });
  }
}
