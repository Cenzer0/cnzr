import { Context } from "../src/core/context";
import { createRateLimiterMiddleware } from "../src/middleware/rate-limiter";
import { CenzeroRequest, CenzeroResponse } from "../src/core/types";
import { mockConsole } from "./setup";

declare const describe: any;
declare const test: any;
declare const beforeEach: any;
declare const afterEach: any;
declare const expect: any;
declare const jest: any;

describe("RateLimiterMiddleware", () => {
  mockConsole();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const buildContext = (options: { ip?: string; headers?: Record<string, string> } = {}) => {
    const { ip = "127.0.0.1", headers = {} } = options;

    const req = {
      method: "GET",
      url: "/demo",
      headers,
      body: null,
      params: {},
      query: {},
      path: "/demo",
      connection: { remoteAddress: ip },
    } as unknown as CenzeroRequest;

    const res = {
      statusCode: 200,
      setHeader: jest.fn(),
      getHeader: jest.fn(),
      json: jest.fn(),
      html: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      end: jest.fn(),
    } as unknown as CenzeroResponse;

    const ctx = new Context(req, res);

    return { ctx, res };
  };

  test("allows requests under the configured limit", async () => {
    const limiter = createRateLimiterMiddleware({ windowMs: 1000, max: 2 });
    const next = jest.fn().mockResolvedValue(undefined);

    await limiter(buildContext().ctx, next);
    expect(next).toHaveBeenCalledTimes(1);

    await limiter(buildContext().ctx, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  test("blocks requests after the limit is exceeded", async () => {
    const limiter = createRateLimiterMiddleware({ windowMs: 1000, max: 1 });
    const next = jest.fn().mockResolvedValue(undefined);

    const first = buildContext();
    await limiter(first.ctx, next);
    expect(next).toHaveBeenCalledTimes(1);

    const second = buildContext();
    await limiter(second.ctx, next);
    expect(next).toHaveBeenCalledTimes(1);

    expect(second.res.status).toHaveBeenCalledWith(429);
    expect(second.res.json).toHaveBeenCalledWith({ error: "Too many requests, please try again later." });
    expect(second.res.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(String));
  });

  test("resets counters after the window expires", async () => {
    const limiter = createRateLimiterMiddleware({ windowMs: 1000, max: 1 });
    const next = jest.fn().mockResolvedValue(undefined);

    await limiter(buildContext().ctx, next);
    expect(next).toHaveBeenCalledTimes(1);

    await limiter(buildContext().ctx, next);
    expect(next).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    jest.runOnlyPendingTimers();

    await limiter(buildContext().ctx, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  test("uses custom key generator when provided", async () => {
    const limiter = createRateLimiterMiddleware({
      windowMs: 1000,
      max: 1,
      keyGenerator: (ctx) => (ctx.headers["x-api-key"] as string) || ctx.clientIP,
    });
    const next = jest.fn().mockResolvedValue(undefined);

    await limiter(
      buildContext({ headers: { "x-api-key": "alpha" } }).ctx,
      next
    );
    expect(next).toHaveBeenCalledTimes(1);

    await limiter(
      buildContext({ headers: { "x-api-key": "alpha" } }).ctx,
      next
    );
    expect(next).toHaveBeenCalledTimes(1);

    await limiter(
      buildContext({ headers: { "x-api-key": "beta" } }).ctx,
      next
    );
    expect(next).toHaveBeenCalledTimes(2);
  });
});
