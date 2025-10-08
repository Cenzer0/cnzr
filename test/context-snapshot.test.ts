import { Context, ContextSnapshot } from "../src/core/context";
import { CenzeroRequest, CenzeroResponse } from "../src/core/types";
import { mockConsole } from "./setup";

declare const describe: any;
declare const test: any;
declare const beforeEach: any;
declare const expect: any;
declare const jest: any;

describe("Context Snapshot", () => {
  mockConsole();

  const buildContext = () => {
    const req = {
      method: "POST",
      url: "/api/test?foo=bar",
      headers: {
        "content-type": "application/json",
        "user-agent": "test-agent",
      },
      body: { name: "test", value: 123 },
      params: { id: "456" },
      query: { foo: "bar" },
      path: "/api/test",
      connection: { remoteAddress: "192.168.1.1" },
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

    return new Context(req, res);
  };

  test("should create a full snapshot with all properties", () => {
    const ctx = buildContext();
    ctx.state.testData = "value";

    const snapshot = ctx.snapshot();

    expect(snapshot).toHaveProperty("requestId");
    expect(snapshot.method).toBe("POST");
    expect(snapshot.path).toBe("/api/test");
    expect(snapshot.url).toBe("/api/test?foo=bar");
    expect(snapshot.params).toEqual({ id: "456" });
    expect(snapshot.query).toEqual({ foo: "bar" });
    expect(snapshot.body).toEqual({ name: "test", value: 123 });
    expect(snapshot.state).toEqual({ testData: "value" });
    expect(snapshot).toHaveProperty("timestamp");
    expect(snapshot.clientIP).toBe("192.168.1.1");
    expect(snapshot.userAgent).toBe("test-agent");
  });

  test("should create partial snapshot with specified keys", () => {
    const ctx = buildContext();
    ctx.state.important = "data";

    const snapshot = ctx.snapshot(["method", "path", "state"]) as Partial<ContextSnapshot>;

    expect(snapshot.method).toBe("POST");
    expect(snapshot.path).toBe("/api/test");
    expect(snapshot.state).toEqual({ important: "data" });
    expect(snapshot.requestId).toBeUndefined();
    expect(snapshot.body).toBeUndefined();
  });

  test("should create immutable snapshot", () => {
    const ctx = buildContext();
    ctx.state.mutable = { count: 1 };

    const snapshot = ctx.snapshot();

    // Snapshot should be frozen
    expect(Object.isFrozen(snapshot)).toBe(true);

    // Attempting to modify should not affect snapshot
    ctx.state.mutable.count = 2;
    ctx.state.newField = "added";

    expect(snapshot.state.mutable.count).toBe(1);
    expect(snapshot.state.newField).toBeUndefined();
  });

  test("should deep clone nested objects", () => {
    const ctx = buildContext();
    ctx.state.nested = {
      level1: {
        level2: {
          value: "original",
        },
      },
    };

    const snapshot = ctx.snapshot();

    // Modify original
    ctx.state.nested.level1.level2.value = "modified";

    // Snapshot should retain original value
    expect(snapshot.state.nested.level1.level2.value).toBe("original");
  });

  test("should clone arrays correctly", () => {
    const ctx = buildContext();
    ctx.state.items = [1, 2, 3];

    const snapshot = ctx.snapshot();

    ctx.state.items.push(4);

    expect(snapshot.state.items).toEqual([1, 2, 3]);
    expect(snapshot.state.items.length).toBe(3);
  });

  test("should handle Date objects in snapshot", () => {
    const ctx = buildContext();
    const testDate = new Date("2025-01-01");
    ctx.state.date = testDate;

    const snapshot = ctx.snapshot();

    expect(snapshot.state.date).toBeInstanceOf(Date);
    expect(snapshot.state.date.getTime()).toBe(testDate.getTime());

    // Modifying original date shouldn't affect snapshot
    testDate.setFullYear(2026);
    expect(snapshot.state.date.getFullYear()).toBe(2025);
  });

  test("should capture timestamp at snapshot time", () => {
    const ctx = buildContext();
    const before = Date.now();

    const snapshot = ctx.snapshot();

    const after = Date.now();

    expect(snapshot.timestamp).toBeGreaterThanOrEqual(before);
    expect(snapshot.timestamp).toBeLessThanOrEqual(after);
  });

  test("should handle empty state", () => {
    const ctx = buildContext();

    const snapshot = ctx.snapshot();

    expect(snapshot.state).toEqual({});
  });

  test("should handle null and undefined in state", () => {
    const ctx = buildContext();
    ctx.state.nullValue = null;
    ctx.state.undefinedValue = undefined;

    const snapshot = ctx.snapshot();

    expect(snapshot.state.nullValue).toBeNull();
    expect(snapshot.state.undefinedValue).toBeUndefined();
  });

  test("should create multiple independent snapshots", () => {
    const ctx = buildContext();

    ctx.state.stage = "first";
    const snapshot1 = ctx.snapshot();

    ctx.state.stage = "second";
    const snapshot2 = ctx.snapshot();

    expect(snapshot1.state.stage).toBe("first");
    expect(snapshot2.state.stage).toBe("second");
    expect(snapshot1.timestamp).not.toBe(snapshot2.timestamp);
  });

  test("should ignore invalid keys in partial snapshot", () => {
    const ctx = buildContext();

    const snapshot = ctx.snapshot(["method", "invalidKey", "path"]) as Partial<ContextSnapshot>;

    expect(snapshot.method).toBe("POST");
    expect(snapshot.path).toBe("/api/test");
    expect(snapshot).not.toHaveProperty("invalidKey");
  });
});
