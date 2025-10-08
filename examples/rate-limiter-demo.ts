// Demo for Rate Limiter Middleware - prevents request flooding within a time window

import { CenzeroApp } from "../src/core/server";
import { CenzeroContext } from "../src/core/context";
import { createRateLimiterMiddleware } from "../src/middleware/rate-limiter";

const app = new CenzeroApp({
  port: 3020,
  useContext: true,
});

const limiter = createRateLimiterMiddleware({
  windowMs: 15_000,
  max: 5,
  message: {
    error: "Slow down buddy, give it a moment before retrying.",
  },
  onLimitReached: (ctx, info) => {
    console.warn(
      `⚠️  Rate limit reached for key=${info.key} remaining=${info.remaining} reset=${new Date(
        info.reset
      ).toISOString()}`
    );
  },
});

app.use(limiter);

app.get("/", (ctx: CenzeroContext) => {
  ctx.json({
    message: "Welcome to the rate limiter demo",
    timestamp: new Date().toISOString(),
  });
});

app.get("/status", (ctx: CenzeroContext) => {
  ctx.json({
    status: "ok",
    requestId: ctx.requestId,
  });
});

app.listen(3020, "localhost", () => {
  console.log("🚦 Rate Limiter Demo running on http://localhost:3020");
  console.log("Hit the same endpoint repeatedly to trigger the limiter.");
});
