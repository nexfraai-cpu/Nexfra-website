# Nexfra ERP — Backend Architecture

## Overview

The Nexfra ERP backend is a **modular monolith** — a single Express.js application partitioned into self-contained modules by domain boundary. Each module owns its routes, controller, service, validation, and database queries. This structure preserves the deployment simplicity of a monolith while enforcing the separation boundaries of microservices.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Client (Browser)                                 │
│  ┌─────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │   www.nexfra.in     │  │   erp.nexfra.in                          │  │
│  │   (app.js)          │  │   (erp.js → StorageProvider)             │  │
│  └─────────┬───────────┘  └────────────────┬─────────────────────────┘  │
│            │                                │                            │
└────────────┼────────────────────────────────┼────────────────────────────┘
             │                                │
             ▼                                ▼
      ┌─────────────────────────────────────────────────────────┐
      │               HTTPS (api.nexfra.in)                     │
      │                                                         │
      │  ┌───────────────────────────────────────────────────┐  │
      │  │               Express.js Server                   │  │
      │  │                                                   │  │
      │  │  Middleware Layer                                 │  │
      │  │  ┌──────────┐ ┌──────────┐ ┌────────────────┐    │  │
      │  │  │ helmet   │ │ cors     │ │ rate-limiter   │    │  │
      │  │  └──────────┘ └──────────┘ └────────────────┘    │  │
      │  │  ┌──────────┐ ┌──────────┐ ┌────────────────┐    │  │
      │  │  │ auth     │ │ validate │ │ error-handler  │    │  │
      │  │  └──────────┘ └──────────┘ └────────────────┘    │  │
      │  │                                                   │  │
      │  │  Module Layer (self-contained domains)            │  │
      │  │                                                   │  │
      │  │  ┌───────────────────────────────────────────┐    │  │
      │  │  │  Each module:                             │    │  │
      │  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │  │
      │  │  │  │ routes   │ │controller│ │ service   │  │    │  │
      │  │  │  └──────────┘ └──────────┘ └──────────┘  │    │  │
      │  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │  │
      │  │  │  │validator │ │ queries  │ │ types    │  │    │  │
      │  │  │  └──────────┘ └──────────┘ └──────────┘  │    │  │
      │  │  └───────────────────────────────────────────┘    │  │
      │  └───────────────────────────────────────────────────┘  │
      │                              │                          │
      └──────────────────────────────┼──────────────────────────┘
                                     │
                                     ▼
      ┌─────────────────────────────────────────────────────────┐
      │               Supabase (PostgreSQL + Auth)              │
      │                                                         │
      │  ┌────────────────┐  ┌──────────────┐  ┌────────────┐  │
      │  │  PostgreSQL 15  │  │  Auth (JWT)  │  │  Storage   │  │
      │  │  - 19 tables   │  │  - signup    │  │  3 buckets │  │
      │  │  - 6 enums     │  │  - login     │  │  - RLS     │  │
      │  │  - 33 indexes  │  │  - RLS       │  │            │  │
      │  │  - 77 policies │  └──────────────┘  └────────────┘  │
      │  │  - 3 views     │                                     │
      │  └────────────────┘                                     │
      └─────────────────────────────────────────────────────────┘
```

---

## Modular Monolith Philosophy

Each domain module is a **mini-application** inside the monolith:

```
src/auth/
├── auth.routes.ts        # Express router — defines endpoints
├── auth.controller.ts    # Request parsing, response formatting
├── auth.service.ts       # Business logic, orchestration
├── auth.validator.ts     # Request body/param validation schemas
├── auth.queries.ts       # Raw SQL / Supabase queries
├── auth.errors.ts        # Domain-specific error classes
├── auth.test.ts          # Unit tests
└── index.ts              # Barrel exports
```

### Rules

1. **No cross-module imports at the route/controller level.** Modules interact only through their public service API or through shared middleware.
2. **No direct database access from controllers.** Controllers call services. Services call queries.
3. **No business logic in routes.** Routes only wire HTTP methods to controllers.
4. **Shared code** lives in `src/middleware/`, `src/config/`, or `src/database/` — never in a module.
5. **Each module is independently testable.** Mock its service dependencies, inject the controller.

### Dependency Flow

```
HTTP Request
    │
    ▼
Router (routes.ts)
    │  validates HTTP method + path
    ▼
Middleware Pipeline
    │  helmet → cors → rate-limiter → auth → [module-specific middleware]
    ▼
Controller (controller.ts)
    │  parses req.params, req.query, req.body
    │  calls service methods
    │  formats response (status code, body, errors)
    ▼
Service (service.ts)
    │  business logic, orchestration, authorization checks
    │  calls queries, coordinates across modules if needed
    ▼
Queries (queries.ts)
    │  raw SQL or Supabase SDK calls
    │  input sanitization, parameterized queries
    ▼
Supabase / PostgreSQL
    │  RLS enforces row-level access
    ▼
Response ←── Error Handler (catches thrown errors)
```

---

## Folder Structure

```
backend/
├── package.json               # Dependencies: express, @supabase/supabase-js, helmet, cors, etc.
├── tsconfig.json              # TypeScript configuration (strict mode)
├── .env.example               # Environment variable template
├── .eslintrc.cjs              # Linting rules
├── .prettierrc                # Formatting
├── jest.config.ts             # Test configuration
├── Dockerfile                 # Production container
├── docker-compose.yml         # Local development (Express + Supabase local)
│
├── src/
│   ├── index.ts               # Entry point — creates Express app, registers middleware + modules
│   │
│   ├── config/
│   │   ├── index.ts           # Central config — reads env vars, exports typed config object
│   │   ├── database.ts        # Supabase client initialization
│   │   └── logger.ts          # Logger configuration (pino or winston)
│   │
│   ├── database/
│   │   ├── client.ts          # Supabase client singleton
│   │   ├── migrations/        # Mirrored from frontend supabase/migrations
│   │   └── types.ts           # Database row type definitions
│   │
│   ├── middleware/
│   │   ├── auth.ts            # JWT verification, user extraction
│   │   ├── authorize.ts       # Role-based access control
│   │   ├── validate.ts        # Request validation (zod schemas)
│   │   ├── error-handler.ts   # Global error handler
│   │   ├── not-found.ts       # 404 handler
│   │   └── async-wrap.ts      # Async route wrapper (try/catch elimination)
│   │
│   ├── auth/                  # Authentication module
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.validator.ts
│   │   └── auth.errors.ts
│   │
│   ├── employees/             # Employee management module
│   │   ├── employees.routes.ts
│   │   ├── employees.controller.ts
│   │   ├── employees.service.ts
│   │   ├── employees.validator.ts
│   │   ├── employees.queries.ts
│   │   └── employees.errors.ts
│   │
│   ├── customers/             # Customer management module
│   │   ├── customers.routes.ts
│   │   ├── customers.controller.ts
│   │   ├── customers.service.ts
│   │   ├── customers.validator.ts
│   │   ├── customers.queries.ts
│   │   └── customers.errors.ts
│   │
│   ├── products/              # Product templates & configurations module
│   │   ├── products.routes.ts
│   │   ├── products.controller.ts
│   │   ├── products.service.ts
│   │   ├── products.validator.ts
│   │   ├── products.queries.ts
│   │   └── products.errors.ts
│   │
│   ├── quotations/            # Quotation management module
│   │   ├── quotations.routes.ts
│   │   ├── quotations.controller.ts
│   │   ├── quotations.service.ts
│   │   ├── quotations.validator.ts
│   │   ├── quotations.queries.ts
│   │   └── quotations.errors.ts
│   │
│   ├── workorders/            # Work order management module
│   │   ├── workorders.routes.ts
│   │   ├── workorders.controller.ts
│   │   ├── workorders.service.ts
│   │   ├── workorders.validator.ts
│   │   ├── workorders.queries.ts
│   │   └── workorders.errors.ts
│   │
│   ├── production/            # Production tracking module
│   │   ├── production.routes.ts
│   │   ├── production.controller.ts
│   │   ├── production.service.ts
│   │   ├── production.validator.ts
│   │   ├── production.queries.ts
│   │   └── production.errors.ts
│   │
│   ├── accounts/              # Finance / accounts module
│   │   ├── accounts.routes.ts
│   │   ├── accounts.controller.ts
│   │   ├── accounts.service.ts
│   │   ├── accounts.validator.ts
│   │   ├── accounts.queries.ts
│   │   └── accounts.errors.ts
│   │
│   ├── admin/                 # Administration module
│   │   ├── admin.routes.ts
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   ├── admin.validator.ts
│   │   ├── admin.queries.ts
│   │   └── admin.errors.ts
│   │
│   └── uploads/               # File upload handling module
│       ├── uploads.routes.ts
│       ├── uploads.controller.ts
│       ├── uploads.service.ts
│       ├── uploads.validator.ts
│       └── storage.ts         # Supabase Storage integration
│
├── tests/
│   ├── integration/           # Integration tests (API endpoints)
│   └── fixtures/              # Test data factories
│
└── scripts/
    ├── seed.ts                # Database seeding script
    └── migrate.ts             # Migration runner
```

---

## Module Responsibilities

| Module | Domain | Key Endpoints | Database Tables |
|---|---|---|---|
| `auth` | Authentication & sessions | POST login, POST logout, GET me | `employees` (read), Supabase Auth |
| `employees` | Employee CRUD & role mgmt | GET, POST, PUT, DELETE, PATCH status/password | `employees` |
| `customers` | Customer management | GET, POST, PUT, DELETE | `customers` |
| `products` | Product templates & specs | GET templates, GET specs | `product_templates`, `product_template_specs`, `product_spec_options` |
| `quotations` | Quotation workflow | CRUD + approve/deny | `quotations`, `quotation_spec_values`, `quotation_custom_items` |
| `workorders` | Work order lifecycle | CRUD + due date + urgent | `work_orders` |
| `production` | Production tracking | GET items, PATCH stage, POST chassis, GET chassis | `production_items`, `chassis_records` |
| `accounts` | Finance, sales, payments | GET sales, GET payments, POST sale, POST payment, GET stats | `sales`, `payments` |
| `admin` | System settings | GET/PUT pricing, products, logs | `audit_logs` (read), pricing in settings |
| `uploads` | File storage | POST upload, GET download | Supabase Storage |

---

## Coding Standards

### TypeScript

- **Strict mode** enabled in `tsconfig.json`
- **Explicit return types** on all public methods
- **No `any`** — use `unknown` and narrow with type guards
- **Enums** for domain constants (matching PostgreSQL enums)
- **Interfaces** for request/response DTOs, not classes

### Naming

| Construct | Convention | Example |
|---|---|---|
| Files | `kebab-case` | `auth.controller.ts` |
| Classes | `PascalCase` | `AuthService` |
| Functions | `camelCase` | `authenticateUser()` |
| Interfaces | `PascalCase` with `I` prefix | `IAuthRequest` |
| Types | `PascalCase` | `UserRole`, `QuotationStatus` |
| Enum values | `PascalCase` | `Role.Admin`, `Status.Approved` |
| Database columns | `snake_case` | `full_name`, `created_at` |
| API response keys | `camelCase` (converted from snake_case) | `{ "fullName": "..." }` |

### File Structure (each module)

```
module/
├── module.routes.ts         # Express Router — endpoint definitions
├── module.controller.ts     # Request/response handling
├── module.service.ts        # Business logic
├── module.validator.ts      # Zod schemas for request validation
├── module.queries.ts        # Database query functions
├── module.errors.ts         # Domain error classes
└── index.ts                 # Barrel exports
```

### Controller Pattern

```typescript
// auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { asyncWrap } from '../middleware/async-wrap';

export class AuthController {
  constructor(private authService: AuthService) {}

  login = asyncWrap(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await this.authService.authenticate(email, password);
    res.status(200).json(result);
  });

  logout = asyncWrap(async (req: Request, res: Response) => {
    await this.authService.invalidateSession(req.user!.sessionId);
    res.status(200).json({ message: 'Logged out' });
  });

  me = asyncWrap(async (req: Request, res: Response) => {
    const user = await this.authService.getProfile(req.user!.id);
    res.status(200).json(user);
  });
}
```

### Service Pattern

```typescript
// auth.service.ts
import { AuthQueries } from './auth.queries';
import { AppError } from '../middleware/error-handler';
import { ILoginResult } from './types';

export class AuthService {
  constructor(private queries: AuthQueries) {}

  async authenticate(email: string, password: string): Promise<ILoginResult> {
    const { data, error } = await this.queries.login(email, password);
    if (error || !data.user) {
      throw new AppError(401, 'Invalid credentials');
    }
    return { token: data.session!.access_token, user: this.mapUser(data.user) };
  }

  private mapUser(user: any): IUserProfile {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name,
    };
  }
}
```

### Query Pattern

```typescript
// auth.queries.ts
import { supabase } from '../database/client';

export class AuthQueries {
  async login(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async getUserByAuthId(authId: string) {
    return supabase
      .from('employees')
      .select('*')
      .eq('auth_id', authId)
      .single();
  }
}
```

---

## Error Handling

### Error Class Hierarchy

```
AppError (base)
├── ValidationError    (400)  — Invalid request body/params
├── AuthError          (401)  — Missing/invalid JWT
├── ForbiddenError     (403)  — Insufficient role permissions
├── NotFoundError      (404)  — Resource not found
├── ConflictError      (409)  — Duplicate resource
└── InternalError      (500)  — Unexpected server error
```

### Global Error Handler

```typescript
// middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    logger.warn({ err }, err.message);
    return res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      details: err.details,
    });
  }

  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({
    error: 'InternalError',
    message: 'An unexpected error occurred',
  });
}
```

### Async Route Wrapper

```typescript
// middleware/async-wrap.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncWrap(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

### Error Response Format

```json
// Success
{ "data": { ... } }

// List with pagination
{ "data": [...], "meta": { "total": 42, "page": 1, "perPage": 20 } }

// Error
{ "error": "ValidationError", "message": "Email is required", "details": [...] }

// Validation errors (zod)
{ "error": "ValidationError", "message": "Validation failed", "details": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

---

## Logging

### Logger Configuration

Use **pino** (or winston with pino transport) for structured JSON logging:

```typescript
// config/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  redact: ['req.headers.authorization', 'req.body.password'],
});
```

### Logging Rules

1. **Every mutation** logged at `info` level with actor ID, action, entity type, entity ID
2. **Authentication events** logged at `info` level (login success, login failure, logout)
3. **Authorization failures** logged at `warn` level
4. **Unexpected errors** logged at `error` level with full stack trace
5. **No sensitive data** in logs — passwords, tokens redacted
6. **Audit trail** (business-level logging) goes to the `audit_logs` table, not the application logger
7. Request ID attached to every log line for correlation

### Request Logging

```typescript
// Morgan for HTTP request logging
import morgan from 'morgan';
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
```

---

## Validation

Use **zod** for runtime validation with TypeScript type inference:

```typescript
// employees/employees.validator.ts
import { z } from 'zod';

export const createEmployeeSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().regex(/^\+?[\d\s-]{10,15}$/).optional(),
    role: z.enum(['admin', 'sales', 'finance', 'manager']),
  }),
});

export const updateEmployeeSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100).optional(),
    phone: z.string().regex(/^\+?[\d\s-]{10,15}$/).optional(),
    role: z.enum(['admin', 'sales', 'finance', 'manager']).optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});
```

### Validation Middleware

```typescript
// middleware/validate.ts
import { AnyZodObject, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './error-handler';

export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({ body: req.body, params: req.params, query: req.query });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError('Validation failed', err.errors));
      } else {
        next(err);
      }
    }
  };
}
```

---

## Transactions

### Pattern

Use Supabase's **Database Functions** (PostgreSQL functions) for multi-step operations that require atomicity. This keeps transaction logic in the database where it belongs rather than trying to coordinate across service calls.

```sql
-- Example: approve quotation → create work order → create production items
CREATE OR REPLACE FUNCTION approve_quotation(quotation_id UUID, approved_by UUID)
RETURNS work_orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quotation quotations%ROWTYPE;
  v_work_order work_orders%ROWTYPE;
BEGIN
  -- Lock quotation row
  SELECT * INTO v_quotation
  FROM quotations
  WHERE id = quotation_id
  FOR UPDATE;

  -- Validate state
  IF v_quotation.status != 'Pending' THEN
    RAISE EXCEPTION 'Cannot approve quotation in % status', v_quotation.status;
  END IF;

  -- Update quotation
  UPDATE quotations
  SET status = 'Approved', approved_by = approve_quotation.approved_by, approved_at = now()
  WHERE id = quotation_id;

  -- Create work order
  INSERT INTO work_orders (quotation_id, customer_id, total_amount, delivery_date)
  VALUES (quotation_id, v_quotation.customer_id, v_quotation.total_amount, v_quotation.delivery_date)
  RETURNING * INTO v_work_order;

  -- Create production items from quotation line items
  INSERT INTO production_items (work_order_id, product_name, quantity, specs)
  SELECT v_work_order.id, sq.product_name, sq.quantity, sq.specs
  FROM quotation_line_items sq
  WHERE sq.quotation_id = quotation_id;

  -- Log audit
  INSERT INTO audit_logs (employee_id, action, entity_type, entity_id, new_value)
  VALUES (approved_by, 'approve', 'quotation', quotation_id,
    jsonb_build_object('work_order_id', v_work_order.id));

  RETURN v_work_order;
END;
$$;
```

### Rules

1. **Multi-table mutations** go through PostgreSQL functions (not application code)
2. **Single-table mutations** use Supabase SDK directly (`.insert()`, `.update()`)
3. **No distributed transactions** — the monolith is a single database; no need for saga patterns
4. **Retry logic** for serialization failures (PostgreSQL will throw `40001` on conflict)

---

## Authorization

### Middleware Chain

```typescript
// Route definition
router.get(
  '/',
  auth,                    // 1. Verify JWT, attach req.user
  authorize('admin', 'manager', 'sales'),  // 2. Check role
  controller.list
);
```

### Auth Middleware

```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../database/client';
import { AuthError } from './error-handler';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; authId: string; role: string; email: string };
    }
  }
}

export async function auth(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next(new AuthError('Missing authorization token'));

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return next(new AuthError('Invalid or expired token'));

  // Fetch employee record (role, permissions)
  const { data: employee } = await supabase
    .from('employees')
    .select('id, role, full_name')
    .eq('auth_id', data.user.id)
    .single();

  if (!employee) return next(new AuthError('Employee record not found'));

  req.user = {
    id: employee.id,
    authId: data.user.id,
    role: employee.role,
    email: data.user.email!,
  };
  next();
}
```

### Role-Based Authorization Middleware

```typescript
// middleware/authorize.ts
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from './error-handler';

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}
```

---

## Response Format

### Success

```json
{
  "data": {
    "id": "uuid",
    "fullName": "John Doe",
    "email": "john@nexfra.in"
  }
}
```

### List with Pagination

```json
{
  "data": [
    { "id": "uuid-1", "fullName": "John Doe" },
    { "id": "uuid-2", "fullName": "Jane Doe" }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "perPage": 20
  }
}
```

### Error

```json
{
  "error": "ValidationError",
  "message": "Email is required",
  "details": [
    { "field": "email", "message": "Required" }
  ]
}
```

---

## Environment Configuration

```bash
# .env.example

# Server
NODE_ENV=development
PORT=4000
HOST=0.0.0.0

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# File Uploads
UPLOAD_MAX_SIZE=10485760
ALLOWED_MIME_TYPES=image/jpeg,image/png,application/pdf

# Storage
STORAGE_BUCKET_QUOTATIONS=quotation-pdfs
STORAGE_BUCKET_ATTACHMENTS=attachments
STORAGE_BUCKET_ASSETS=company-assets
```

---

## Package Dependencies

### Production

```json
{
  "express": "^4.21",
  "@supabase/supabase-js": "^2.45",
  "zod": "^3.23",
  "pino": "^9.x",
  "helmet": "^7.x",
  "cors": "^2.x",
  "express-rate-limit": "^7.x",
  "morgan": "^1.x",
  "multer": "^1.x",
  "jsonwebtoken": "^9.x",
  "uuid": "^10.x"
}
```

### Dev

```json
{
  "typescript": "^5.5",
  "tsx": "^4.x",
  "jest": "^29.x",
  "ts-jest": "^29.x",
  "@types/express": "^4.x",
  "@types/cors": "^2.x",
  "@types/morgan": "^1.x",
  "@types/multer": "^1.x",
  "@types/jsonwebtoken": "^9.x",
  "eslint": "^8.x",
  "prettier": "^3.x",
  "nodemon": "^3.x",
  "supertest": "^7.x"
}
```

---

## Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Unit | Jest | Services, validators, error classes |
| Integration | Jest + Supertest | Full API endpoints with test database |
| Database | Jest + pg-mem or testcontainers | Query functions |
| E2E | Playwright (future) | Frontend + backend together |

### Test file placement

- Unit tests co-located with source: `auth.service.ts` → `auth.service.test.ts`
- Integration tests in `tests/integration/`
- Test fixtures in `tests/fixtures/`

---

## Entry Point

```typescript
// src/index.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './config/logger';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { authRouter } from './auth/auth.routes';
import { employeesRouter } from './employees/employees.routes';
import { customersRouter } from './customers/customers.routes';
import { productsRouter } from './products/products.routes';
import { quotationsRouter } from './quotations/quotations.routes';
import { workordersRouter } from './workorders/workorders.routes';
import { productionRouter } from './production/production.routes';
import { accountsRouter } from './accounts/accounts.routes';
import { adminRouter } from './admin/admin.routes';
import { uploadsRouter } from './uploads/uploads.routes';

const app = express();

// Global middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigins }));
app.use(rateLimit({ windowMs: config.rateLimitWindow, max: config.rateLimitMax }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Module routes
app.use('/api/auth', authRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/products', productsRouter);
app.use('/api/quotations', quotationsRouter);
app.use('/api/work-orders', workordersRouter);
app.use('/api/production', productionRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/uploads', uploadsRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

export default app;
```

---

## Database Integration

### Client Singleton

```typescript
// database/client.ts
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

### Query Module Pattern

```typescript
// employees/employees.queries.ts
import { supabase } from '../database/client';
import { Database } from '../database/types';

type EmployeeRow = Database['public']['Tables']['employees']['Row'];

export class EmployeeQueries {
  async findAll(role?: string): Promise<EmployeeRow[]> {
    let query = supabase
      .from('employees')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async findById(id: string): Promise<EmployeeRow | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async create(input: Partial<EmployeeRow>): Promise<EmployeeRow> {
    const { data, error } = await supabase
      .from('employees')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
```

---

## File Uploads

### Pattern

```typescript
// uploads/storage.ts
import { supabase } from '../database/client';
import { config } from '../config';

export class StorageService {
  async uploadQuotationPdf(
    quotationId: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<string> {
    const path = `quotations/${quotationId}.pdf`;

    const { error } = await supabase.storage
      .from(config.storageBucketQuotations)
      .upload(path, buffer, { contentType: mimeType, upsert: true });

    if (error) throw error;

    const { data } = supabase.storage
      .from(config.storageBucketQuotations)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  }
}
```

---

## Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **Modular monolith** | Simpler than microservices; clear domain boundaries; single deployable unit; no network overhead between modules |
| **TypeScript** | Type safety across module boundaries; interfaces for DTOs; zod + TypeScript for compile + runtime validation |
| **PostgreSQL functions for transactions** | Database-native atomicity; avoids distributed transaction complexity; Supabase SDK lacks transaction support across queries |
| **Supabase Auth** | Avoids building custom auth; JWT management, password hashing, session refresh handled out of the box |
| **Zod for validation** | Combines runtime validation with TypeScript type inference; better DX than Joi or express-validator |
| **Pino for logging** | Fastest structured logger for Node.js; JSON output for production; pino-pretty for development |
| **Co-located tests** | Tests next to source files improves discoverability and encourages testing |
| **Supabase service key on server** | Server-to-server communication bypasses RLS for admin operations; never exposed to client |
