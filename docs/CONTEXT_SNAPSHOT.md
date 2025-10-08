# Context Snapshot Utility

The Context Snapshot utility provides an immutable snapshot of the request context at any point during request processing. This is useful for logging, debugging, audit trails, and preserving state for later analysis.

## Features

- **Immutable Snapshots**: All snapshots are frozen and cannot be modified
- **Deep Cloning**: Nested objects and arrays are properly cloned
- **Partial Snapshots**: Capture only specific fields when needed
- **Type-Safe**: Full TypeScript support with proper type definitions
- **Zero Dependencies**: Uses built-in utilities for cloning

## Usage

### Full Snapshot

Capture all context properties:

```typescript
import { CenzeroApp, CenzeroContext } from 'cnzr';

const app = new CenzeroApp();

app.get('/api/users/:id', (ctx: CenzeroContext) => {
  // Capture full snapshot
  const snapshot = ctx.snapshot();
  
  console.log('Request snapshot:', {
    id: snapshot.requestId,
    method: snapshot.method,
    path: snapshot.path,
    params: snapshot.params,
    timestamp: new Date(snapshot.timestamp).toISOString()
  });
  
  ctx.json({ userId: ctx.params.id });
});
```

### Partial Snapshot

Capture only specific fields:

```typescript
app.post('/api/data', (ctx: CenzeroContext) => {
  ctx.state.validated = true;
  ctx.state.processedAt = Date.now();
  
  // Only capture specific fields
  const auditLog = ctx.snapshot(['requestId', 'method', 'path', 'state']);
  
  // Save to audit system
  saveAuditLog(auditLog);
  
  ctx.json({ success: true });
});
```

### Middleware Snapshots

Capture state at different middleware stages:

```typescript
app.use(async (ctx: CenzeroContext, next: () => Promise<void>) => {
  // Before processing
  const before = ctx.snapshot(['state', 'timestamp']);
  
  await next();
  
  // After processing
  const after = ctx.snapshot(['state', 'timestamp']);
  
  console.log('State changes:', {
    before: before.state,
    after: after.state,
    duration: after.timestamp! - before.timestamp!
  });
});
```

### Error Tracking

Preserve context state when errors occur:

```typescript
app.use(async (ctx: CenzeroContext, next: () => Promise<void>) => {
  try {
    await next();
  } catch (error) {
    // Capture snapshot at error point
    const errorSnapshot = ctx.snapshot();
    
    console.error('Error occurred:', {
      requestId: errorSnapshot.requestId,
      path: errorSnapshot.path,
      state: errorSnapshot.state,
      error: error.message
    });
    
    // Send to error tracking service
    sendToErrorTracker({
      error,
      context: errorSnapshot
    });
    
    ctx.status(500).json({ error: 'Internal server error' });
  }
});
```

### Audit Logging

Create immutable audit trails:

```typescript
app.post('/api/sensitive-action', (ctx: CenzeroContext) => {
  ctx.state.userId = ctx.session.get('userId');
  ctx.state.action = 'sensitive-action';
  ctx.state.data = ctx.body;
  
  // Create audit snapshot
  const audit = ctx.snapshot();
  
  // Store in audit log (snapshot is immutable)
  database.auditLogs.insert({
    id: audit.requestId,
    timestamp: audit.timestamp,
    user: audit.state.userId,
    action: audit.state.action,
    ip: audit.clientIP,
    userAgent: audit.userAgent,
    data: audit.state.data
  });
  
  ctx.json({ success: true });
});
```

## Snapshot Properties

A full snapshot includes:

```typescript
interface ContextSnapshot {
  requestId: string;           // Unique request identifier
  method: string;              // HTTP method
  path: string;                // Request path
  url: string;                 // Full URL
  params: Record<string, string>;  // Route parameters
  query: Record<string, any>;      // Query parameters
  body: any;                   // Request body
  headers: Record<string, string | string[]>;  // Request headers
  state: Record<string, any>;      // Middleware state
  timestamp: number;           // Snapshot timestamp (ms)
  clientIP: string;            // Client IP address
  userAgent: string;           // User agent string
}
```

## Immutability

All snapshots are deeply frozen:

```typescript
const snapshot = ctx.snapshot();

// This will fail (in strict mode) or be silently ignored
snapshot.state.newField = 'value';  // ❌ Cannot modify
snapshot.method = 'PUT';             // ❌ Cannot modify

// Original context can still be modified
ctx.state.newField = 'value';  // ✅ Works fine

// Later snapshots will have different values
const snapshot2 = ctx.snapshot();
console.log(snapshot2.state.newField);  // 'value'
console.log(snapshot.state.newField);    // undefined
```

## Performance Considerations

- **Full snapshots** perform deep cloning of all properties
- **Partial snapshots** only clone specified fields (more efficient)
- Use partial snapshots when you only need specific fields
- Snapshots are independent - modifying context doesn't affect existing snapshots

## Use Cases

1. **Request Logging**: Capture complete request details for logs
2. **Audit Trails**: Create immutable records of actions
3. **Debugging**: Preserve state at different execution points
4. **Error Tracking**: Include full context in error reports
5. **Performance Monitoring**: Compare state before/after processing
6. **Security**: Track sensitive operations with full context

## Example: Complete Audit System

```typescript
import { CenzeroApp, CenzeroContext, ContextSnapshot } from 'cnzr';

const app = new CenzeroApp();

// Audit middleware
app.use(async (ctx: CenzeroContext, next: () => Promise<void>) => {
  const startSnapshot = ctx.snapshot(['requestId', 'method', 'path', 'timestamp']);
  
  await next();
  
  const endSnapshot = ctx.snapshot(['requestId', 'state', 'timestamp']);
  
  // Save to audit log
  await saveAudit({
    requestId: startSnapshot.requestId,
    method: startSnapshot.method,
    path: startSnapshot.path,
    duration: endSnapshot.timestamp! - startSnapshot.timestamp!,
    result: endSnapshot.state
  });
});

async function saveAudit(data: any) {
  // Save to database, file, or logging service
  console.log('Audit:', data);
}
```

## Testing

The snapshot utility is fully tested with:
- Full snapshot capture
- Partial snapshot selection
- Deep cloning verification
- Immutability enforcement
- Multiple snapshots independence
- Edge cases (null, undefined, Date objects)

See `test/context-snapshot.test.ts` for complete test coverage.
