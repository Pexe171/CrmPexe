import { RateLimitService } from "./rate-limit.service";

const originalEnv = { ...process.env };

describe("RateLimitService", () => {
  afterEach(async () => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it("reseta a janela após o tempo configurado no fallback em memória", async () => {
    process.env.RATE_LIMIT_REDIS_ENABLED = "false";
    const service = new RateLimitService();

    const first = await service.consume("login:ip:1.1.1.1", 2, 1_000);
    const second = await service.consume("login:ip:1.1.1.1", 2, 1_000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);

    jest.spyOn(Date, "now").mockReturnValue(first.resetAt + 1);

    const third = await service.consume("login:ip:1.1.1.1", 2, 1_000);

    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(1);
  });

  it("bloqueia quando o limite é atingido", async () => {
    process.env.RATE_LIMIT_REDIS_ENABLED = "false";
    const service = new RateLimitService();

    await service.consume("webhook:ip:2.2.2.2", 2, 5_000);
    await service.consume("webhook:ip:2.2.2.2", 2, 5_000);
    const blocked = await service.consume("webhook:ip:2.2.2.2", 2, 5_000);

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("usa fallback em memória quando Redis falha e a política é memory", async () => {
    process.env.RATE_LIMIT_REDIS_FAILURE_POLICY = "memory";

    const service = new RateLimitService();
    const redisMock = {
      eval: jest.fn().mockRejectedValue(new Error("redis indisponível")),
      quit: jest.fn()
    };

    Object.defineProperty(service as object, "redis", {
      value: redisMock,
      writable: true
    });

    const loggerErrorSpy = jest
      .spyOn((service as any).logger, "error")
      .mockImplementation();

    const first = await service.consume("auth:ip:3.3.3.3", 2, 10_000);
    const second = await service.consume("auth:ip:3.3.3.3", 2, 10_000);
    const third = await service.consume("auth:ip:3.3.3.3", 2, 10_000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(3);
  });
});
