# CLI Route Generator

The CLI route generator provides a quick way to scaffold route handlers with pre-built templates. It supports basic routes, RESTful API endpoints, and full CRUD operations.

## Installation

The CLI is included with the Cenzero framework. After installing:

```bash
npm install -g cnzr
# or use npx
npx cnzr generate <route-name>
```

## Commands

### Generate Route

```bash
cnzr generate <route-name> [options]
# or
cnzr g <route-name> [options]
```

### Options

- `-m, --method <method>` - HTTP method (get, post, put, delete). Default: `get`
- `-p, --path <path>` - Route path. Default: `/<route-name>`
- `-d, --dir <directory>` - Output directory. Default: `src/routes`
- `-t, --template <template>` - Template type (basic, api, crud). Default: `basic`

## Templates

### Basic Template

Simple route handler with error handling:

```bash
cnzr generate users --method get --template basic
```

Generates `src/routes/users.ts`:

```typescript
import { CenzeroContext } from "cnzr";

export async function usersHandler(ctx: CenzeroContext) {
  try {
    ctx.json({
      message: "users route",
      path: "/users",
      method: "GET",
    });
  } catch (error: any) {
    ctx.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}
```

Usage:
```typescript
import { usersHandler } from './src/routes/users';
app.get('/users', usersHandler);
```

### API Template

RESTful API handler with request validation:

```bash
cnzr generate createUser --method post --path /api/users --template api
```

Generates `src/routes/createUser.ts`:

```typescript
import { CenzeroContext } from "cnzr";

export async function createUserHandler(ctx: CenzeroContext) {
  try {
    // Validate request
    if (!ctx.body) {
      return ctx.status(400).json({
        error: "Bad Request",
        message: "Request body is required",
      });
    }

    const result = {
      success: true,
      data: ctx.body,
      timestamp: new Date().toISOString(),
    };

    ctx.json(result);
  } catch (error: any) {
    ctx.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
}
```

### CRUD Template

Full CRUD operations scaffold:

```bash
cnzr generate product --template crud
```

Generates `src/routes/product.ts` with 5 handlers:

- `listProducts` - GET all items
- `getProduct` - GET single item by ID
- `createProduct` - POST new item
- `updateProduct` - PUT update item
- `deleteProduct` - DELETE item

```typescript
import { CenzeroContext } from "cnzr";

const productStore: any[] = [];

// GET - List all products
export async function listProducts(ctx: CenzeroContext) {
  // ... pagination support
}

// GET - Get single product
export async function getProduct(ctx: CenzeroContext) {
  // ... by ID
}

// POST - Create new product
export async function createProduct(ctx: CenzeroContext) {
  // ... with validation
}

// PUT - Update product
export async function updateProduct(ctx: CenzeroContext) {
  // ... by ID
}

// DELETE - Remove product
export async function deleteProduct(ctx: CenzeroContext) {
  // ... by ID
}
```

Usage:
```typescript
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from './src/routes/product';

app.get('/products', listProducts);
app.get('/products/:id', getProduct);
app.post('/products', createProduct);
app.put('/products/:id', updateProduct);
app.delete('/products/:id', deleteProduct);
```

## Examples

### Generate Simple GET Route

```bash
cnzr g hello
```

Creates `src/routes/hello.ts` with basic handler.

### Generate API POST Route

```bash
cnzr g signup --method post --path /api/auth/signup --template api
```

Creates `src/routes/signup.ts` with API template.

### Generate Full CRUD

```bash
cnzr g article --template crud --dir src/api
```

Creates `src/api/article.ts` with all CRUD operations.

### Custom Path and Method

```bash
cnzr g dashboard --method get --path /admin/dashboard --dir src/admin
```

## File Organization

The generator respects your project structure:

```
project/
├── src/
│   ├── routes/           # Default location
│   │   ├── users.ts
│   │   └── products.ts
│   ├── api/              # Custom with --dir
│   │   └── auth.ts
│   └── admin/
│       └── dashboard.ts
```

## Workflow

1. **Generate route**:
   ```bash
   cnzr g users --template crud
   ```

2. **Import in your app**:
   ```typescript
   import { CenzeroApp } from 'cnzr';
   import { listUsers, getUser, createUser } from './routes/users';
   
   const app = new CenzeroApp();
   
   app.get('/users', listUsers);
   app.get('/users/:id', getUser);
   app.post('/users', createUser);
   ```

3. **Customize logic**:
   - Replace in-memory store with database
   - Add validation logic
   - Implement business rules

## Best Practices

1. **Use CRUD template** for resource-based APIs
2. **Use API template** for single endpoints with validation
3. **Use basic template** for simple routes
4. **Organize by feature**: Use `--dir` to group related routes
5. **Name consistently**: Use singular for CRUD (e.g., `user` not `users`)

## Tips

- Generator checks for existing files (use `--force` to overwrite in future versions)
- CRUD template automatically pluralizes entity names
- All templates include TypeScript types
- Error handling is built-in
- Response formats follow REST conventions

## Integration with File-Based Routing

If using file-based routing, generate routes in your routes directory:

```bash
cnzr g api/v1/users --template crud --dir src/routes
```

The file structure will match the URL structure automatically.

## Customization

Edit the generated files to:
- Add database integration
- Include authentication/authorization
- Add input validation schemas
- Implement caching
- Add rate limiting
- Include logging

## Troubleshooting

**File already exists**
- Choose a different name or remove the existing file

**Permission denied**
- Check directory permissions
- Run with appropriate privileges

**Module not found**
- Ensure cnzr is installed: `npm install cnzr`
- Check import paths match your project structure
