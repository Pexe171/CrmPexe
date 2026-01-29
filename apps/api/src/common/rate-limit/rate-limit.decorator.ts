import { SetMetadata } from "@nestjs/common";
import { RateLimitOptions } from "./rate-limit.types";

export const RATE_LIMIT_METADATA_KEY = "rateLimitOptions";

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, options);
