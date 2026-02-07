import { Injectable } from "@nestjs/common";

type LoginAttemptEntry = {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
};

@Injectable()
export class LoginAttemptsService {
  private readonly maxAttempts = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
  private readonly windowMs = Number(
    process.env.LOGIN_WINDOW_MS || 15 * 60 * 1000
  );
  private readonly blockMs = Number(
    process.env.LOGIN_BLOCK_MS || 15 * 60 * 1000
  );
  private readonly attempts = new Map<string, LoginAttemptEntry>();

  isBlocked(key: string) {
    const entry = this.attempts.get(key);
    if (!entry) {
      return false;
    }

    if (entry.blockedUntil && entry.blockedUntil > Date.now()) {
      return true;
    }

    if (entry.blockedUntil && entry.blockedUntil <= Date.now()) {
      this.attempts.delete(key);
      return false;
    }

    return false;
  }

  registerFailure(key: string) {
    const now = Date.now();
    const entry = this.attempts.get(key);

    if (!entry || now - entry.firstAttemptAt > this.windowMs) {
      this.attempts.set(key, { count: 1, firstAttemptAt: now });
      return;
    }

    const nextCount = entry.count + 1;
    const nextEntry: LoginAttemptEntry = {
      count: nextCount,
      firstAttemptAt: entry.firstAttemptAt
    };

    if (nextCount >= this.maxAttempts) {
      nextEntry.blockedUntil = now + this.blockMs;
    }

    this.attempts.set(key, nextEntry);
  }

  reset(key: string) {
    this.attempts.delete(key);
  }

  getSummary() {
    return {
      maxAttempts: this.maxAttempts,
      windowMs: this.windowMs,
      blockMs: this.blockMs
    };
  }
}
