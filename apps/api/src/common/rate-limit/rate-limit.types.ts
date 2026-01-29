export type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  byIp?: boolean;
  byWorkspace?: boolean;
};
