import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

type RedisRateLimitResponse = [number, number];

type RedisFailurePolicy = "allow" | "deny" | "memory";

const DEFAULT_REDIS_PORT = 6379;
const REDIS_KEY_PREFIX = "rate_limit";

const RATE_LIMIT_INCREMENT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {current, ttl}
`;

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly failurePolicy = this.resolveFailurePolicy();
  private readonly redisEnabled =
    process.env.RATE_LIMIT_REDIS_ENABLED !== "false";
  private readonly redis = this.redisEnabled ? this.createRedisClient() : null;

  async consume(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    if (!this.redis) {
      return this.consumeInMemory(key, limit, windowMs);
    }

    try {
      const redisKey = `${REDIS_KEY_PREFIX}:${key}`;
      const [count, ttl] = (await this.redis.eval(
        RATE_LIMIT_INCREMENT_SCRIPT,
        1,
        redisKey,
        String(windowMs)
      )) as RedisRateLimitResponse;

      const normalizedTtl = ttl > 0 ? ttl : windowMs;
      const resetAt = Date.now() + normalizedTtl;
      const remaining = Math.max(limit - count, 0);

      return {
        allowed: count <= limit,
        remaining,
        resetAt
      };
    } catch (error) {
      this.logger.error(
        `Falha ao consumir rate-limit no Redis para a chave ${key}. Aplicando fallback "${this.failurePolicy}".`,
        error instanceof Error ? error.stack : undefined
      );

      return this.handleRedisFailure(key, limit, windowMs);
    }
  }

  async onModuleDestroy() {
    await this.redis?.quit();
  }

  private handleRedisFailure(
    key: string,
    limit: number,
    windowMs: number
  ): RateLimitResult {
    const now = Date.now();

    switch (this.failurePolicy) {
      case "deny":
        return { allowed: false, remaining: 0, resetAt: now + windowMs };
      case "allow":
        return {
          allowed: true,
          remaining: Math.max(limit - 1, 0),
          resetAt: now + windowMs
        };
      case "memory":
      default:
        return this.consumeInMemory(key, limit, windowMs);
    }
  }

  private consumeInMemory(
    key: string,
    limit: number,
    windowMs: number
  ): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt <= now) {
      const resetAt = now + windowMs;
      this.store.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: Math.max(limit - 1, 0), resetAt };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count += 1;
    this.store.set(key, entry);
    return {
      allowed: true,
      remaining: Math.max(limit - entry.count, 0),
      resetAt: entry.resetAt
    };
  }

  private createRedisClient() {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      return new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableReadyCheck: false
      });
    }

    return new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT || DEFAULT_REDIS_PORT),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false
    });
  }

  private resolveFailurePolicy(): RedisFailurePolicy {
    const envPolicy = process.env.RATE_LIMIT_REDIS_FAILURE_POLICY;

    if (
      envPolicy === "allow" ||
      envPolicy === "deny" ||
      envPolicy === "memory"
    ) {
      return envPolicy;
    }

    return "memory";
  }
}
