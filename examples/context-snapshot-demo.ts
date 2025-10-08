// Demo for Context Snapshot Utility - capture immutable context state
// Useful for logging, debugging, and preserving state at specific points

import { CenzeroApp } from "../src/core/server";
import { CenzeroContext } from "../src/core/context";

const app = new CenzeroApp({
  port: 3021,
  useContext: true,
});

// Middleware to log snapshots at different stages
app.use(async (ctx: CenzeroContext, next: () => Promise<void>) => {
  // Capture state before processing
  const beforeSnapshot = ctx.snapshot();
  console.log("📸 Snapshot BEFORE processing:", {
    requestId: beforeSnapshot.requestId,
    method: beforeSnapshot.method,
    path: beforeSnapshot.path,
    timestamp: new Date(beforeSnapshot.timestamp).toISOString(),
  });

  await next();

  // Capture state after processing
  const afterSnapshot = ctx.snapshot();
  console.log("📸 Snapshot AFTER processing:", {
    requestId: afterSnapshot.requestId,
    state: afterSnapshot.state,
    timestamp: new Date(afterSnapshot.timestamp).toISOString(),
  });
});

// Add some processing middleware
app.use(async (ctx: CenzeroContext, next: () => Promise<void>) => {
  ctx.state.processedAt = Date.now();
  ctx.state.middleware = "processing";
  await next();
});

app.get("/", (ctx: CenzeroContext) => {
  ctx.state.handler = "root";
  ctx.state.data = { message: "Hello from snapshot demo" };

  // Take full snapshot
  const fullSnapshot = ctx.snapshot();

  ctx.json({
    message: "Context Snapshot Demo",
    snapshot: fullSnapshot,
  });
});

app.get("/partial", (ctx: CenzeroContext) => {
  ctx.state.important = "This will be captured";
  ctx.state.debug = "Also captured";

  // Take partial snapshot - only specific fields
  const partialSnapshot = ctx.snapshot(["method", "path", "state", "requestId"]);

  ctx.json({
    message: "Partial snapshot demo",
    snapshot: partialSnapshot,
  });
});

app.post("/analyze", (ctx: CenzeroContext) => {
  // Simulate some processing
  ctx.state.requestBody = ctx.body;
  ctx.state.validation = "passed";
  ctx.state.processedFields = Object.keys(ctx.body || {});

  // Capture snapshot for audit log
  const auditSnapshot = ctx.snapshot();

  // Simulate saving to audit log
  console.log("💾 Audit Log Entry:", JSON.stringify(auditSnapshot, null, 2));

  ctx.json({
    message: "Request processed and logged",
    auditId: auditSnapshot.requestId,
    timestamp: auditSnapshot.timestamp,
  });
});

app.get("/debug/:id", (ctx: CenzeroContext) => {
  ctx.state.userId = ctx.params.id;
  ctx.state.debugMode = true;
  ctx.state.environment = process.env.NODE_ENV || "development";

  // Multiple snapshots at different points
  const snapshot1 = ctx.snapshot();

  ctx.state.additionalData = "Added after first snapshot";

  const snapshot2 = ctx.snapshot();

  // Demonstrate immutability - original snapshot unchanged
  console.log("🔒 Snapshot immutability test:");
  console.log("Snapshot 1 state:", snapshot1.state);
  console.log("Snapshot 2 state:", snapshot2.state);
  console.log("Are they different?", snapshot1.state !== snapshot2.state);

  ctx.json({
    message: "Multiple snapshots captured",
    snapshots: {
      first: snapshot1,
      second: snapshot2,
    },
  });
});

app.get("/error-tracking", (ctx: CenzeroContext) => {
  ctx.state.step = "initialization";
  const initSnapshot = ctx.snapshot(["requestId", "state", "timestamp"]);

  try {
    ctx.state.step = "processing";
    // Simulate an error
    throw new Error("Simulated error for demo");
  } catch (error: any) {
    // Capture snapshot at error point
    ctx.state.step = "error";
    ctx.state.error = error.message;
    const errorSnapshot = ctx.snapshot();

    console.error("❌ Error occurred:", {
      requestId: errorSnapshot.requestId,
      state: errorSnapshot.state,
      error: error.message,
    });

    ctx.status(500).json({
      error: "An error occurred",
      debug: {
        init: initSnapshot,
        errorState: errorSnapshot,
      },
    });
  }
});

app.listen(3021, "localhost", () => {
  console.log("📸 Context Snapshot Demo running on http://localhost:3021");
  console.log("");
  console.log("Test these endpoints:");
  console.log("👉 GET  http://localhost:3021/ - Full snapshot");
  console.log("👉 GET  http://localhost:3021/partial - Partial snapshot");
  console.log("👉 POST http://localhost:3021/analyze - Audit logging");
  console.log("👉 GET  http://localhost:3021/debug/123 - Multiple snapshots");
  console.log("👉 GET  http://localhost:3021/error-tracking - Error tracking");
  console.log("");
});
