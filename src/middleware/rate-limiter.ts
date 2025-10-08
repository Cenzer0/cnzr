import { CenzeroContext } from "../core/context";
import type { RateLimitInfo, RateLimiterOptions } from "../core/types";

type RateLimiterMessage = Exclude<RateLimiterOptions["message"], undefined>;

interface RateLimiterState {
  count: number;
  resetAt: number;
}

const defaultMessage = {
  error: "Too many requests, please try again later.",
};

type InternalRateLimiterOptions = Required<Pick<RateLimiterOptions, "windowMs" | "max" | "statusCode" | "headers">> & {
  message: RateLimiterMessage;
  keyGenerator?: RateLimiterOptions["keyGenerator"];
  skip?: RateLimiterOptions["skip"];
  onLimitReached?: RateLimiterOptions["onLimitReached"];
};

const defaultOptions: InternalRateLimiterOptions = {
  windowMs: 60_000,
  max: 60,
  statusCode: 429,
  headers: true,
  message: defaultMessage,
  keyGenerator: undefined,
  skip: undefined,
  onLimitReached: undefined,
};

const HEADER_LIMIT = "X-RateLimit-Limit";
const HEADER_REMAINING = "X-RateLimit-Remaining";
const HEADER_RESET = "X-RateLimit-Reset";
const HEADER_RETRY_AFTER = "Retry-After";

function resolveKey(ctx: CenzeroContext, generator?: RateLimiterOptions["keyGenerator"]): string {
  const candidate = generator?.(ctx);
  if (typeof candidate === "string") {
    const normalized = candidate.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }
  // Fall back to best-effort IP detection, then request ID as last resort
  return ctx.clientIP || ctx.requestId;
}

function scheduleCleanup(
  key: string,
  windowMs: number,
  store: Map<string, RateLimiterState>,
  timers: Map<string, NodeJS.Timeout>
): void {
  const existing = timers.get(key);
  if (existing) {
    clearTimeout(existing);
  }

  const timeout = setTimeout(() => {
    store.delete(key);
    timers.delete(key);
  }, windowMs);

  if (typeof timeout.unref === "function") {
    timeout.unref();
  }

  timers.set(key, timeout);
}

function applyHeaders(
  ctx: CenzeroContext,
  cfg: InternalRateLimiterOptions,
  remaining: number,
  resetAt: number,
  now: number,
  limited: boolean
): void {
  if (!cfg.headers) {
    return;
  }

  ctx.set(HEADER_LIMIT, String(cfg.max));
  ctx.set(HEADER_REMAINING, String(Math.max(remaining, 0)));
  ctx.set(HEADER_RESET, Math.ceil(resetAt / 1000).toString());

  if (limited || remaining === 0) {
    const retryAfter = Math.max(0, Math.ceil((resetAt - now) / 1000));
    ctx.set(HEADER_RETRY_AFTER, retryAfter.toString());
  }
}

function resolveMessagePayload(
  ctx: CenzeroContext,
  cfg: InternalRateLimiterOptions,
  info: RateLimitInfo
): any {
  if (typeof cfg.message === "function") {
    return cfg.message(ctx, info);
  }

  if (cfg.message === undefined) {
    return defaultMessage;
  }

  return cfg.message;
}

/**
 * Convenience limiter with default configuration
 */
export function rateLimiterMiddleware(
  ctx: CenzeroContext,
  next: () => Promise<void>
): Promise<void> {
  return createRateLimiterMiddleware()(ctx, next);
}

/**
 * Creates a configurable rate limiting middleware using an in-memory store.
 * Defaults to a sliding window counter with per-key tracking.
 */
export function createRateLimiterMiddleware(
  options: RateLimiterOptions = {}
): (ctx: CenzeroContext, next: () => Promise<void>) => Promise<void> {
  const cfg: InternalRateLimiterOptions = {
    windowMs: options.windowMs ?? defaultOptions.windowMs,
    max: options.max ?? defaultOptions.max,
    statusCode: options.statusCode ?? defaultOptions.statusCode,
    headers: options.headers ?? defaultOptions.headers,
    message: options.message ?? defaultOptions.message,
    keyGenerator: options.keyGenerator ?? defaultOptions.keyGenerator,
    skip: options.skip ?? defaultOptions.skip,
    onLimitReached: options.onLimitReached ?? defaultOptions.onLimitReached,
  };

  const store = new Map<string, RateLimiterState>();
  const timers = new Map<string, NodeJS.Timeout>();

  return async function rateLimiter(ctx: CenzeroContext, next: () => Promise<void>): Promise<void> {
    if (cfg.skip && cfg.skip(ctx)) {
      await next();
      return;
    }

    const now = Date.now();
    const key = resolveKey(ctx, cfg.keyGenerator);

    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + cfg.windowMs };
      store.set(key, entry);
      scheduleCleanup(key, cfg.windowMs, store, timers);
    }

    if (entry.count >= cfg.max) {
      const info: RateLimitInfo = {
        key,
        limit: cfg.max,
        remaining: 0,
        reset: entry.resetAt,
      };

      applyHeaders(ctx, cfg, 0, entry.resetAt, now, true);
      cfg.onLimitReached?.(ctx, info);

      const payload = resolveMessagePayload(ctx, cfg, info);
      ctx.status(cfg.statusCode);

      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        ctx.json(payload);
      } else {
        ctx.text(String(payload ?? defaultMessage.error));
      }

      return;
    }

    entry.count += 1;
    const remaining = Math.max(cfg.max - entry.count, 0);

    applyHeaders(ctx, cfg, remaining, entry.resetAt, now, false);

    await next();
  };
}

export type { RateLimiterOptions, RateLimitInfo };
