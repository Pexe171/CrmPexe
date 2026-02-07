import { Injectable } from "@nestjs/common";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RateLimitService {
  private readonly store = new Map<string, RateLimitEntry>();

  consume(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt <= now) {
      const resetAt = now + windowMs;
      this.store.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: limit - 1, resetAt };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count += 1;
    this.store.set(key, entry);
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt
    };
  }
}
