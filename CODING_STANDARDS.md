# Nexfra ERP — Coding Standards

## General Principles

1. **No framework lock-in** — The frontend uses vanilla JavaScript to avoid dependency churn. If a framework is added, it must be a deliberate, documented decision.
2. **Backend-ready** — All service methods return Promises, even when the current implementation is synchronous. This ensures zero refactoring when the ApiProvider replaces LocalStorageProvider.
3. **Feature-flagged development** — Every developer-only feature must be wrapped in a `CONFIG.FEATURE_FLAGS.*` check. Nothing dev-only should leak into production.
4. **No secrets in code** — Passwords, API keys, and tokens must never appear in source files. Use `.env` files and environment variables.

---

## Naming Conventions

### Files & Folders

| Pattern | Example | When |
|---|---|---|
| `kebab-case.js` | `work-order-service.js` | Multi-word files |
| `PascalCase.js` | `StorageProvider.js` | Class exports |
| `camelCase.js` | `app.js`, `erp.js` | Entry points |

### JavaScript

| Construct | Convention | Example |
|---|---|---|
| Variables | `camelCase` | `const currentUser = ...` |
| Constants | `UPPER_SNAKE_CASE` | `CONFIG.STORAGE_KEYS.ERP_STATE` |
| Functions | `camelCase` | `function loadState() {}` |
| Classes | `PascalCase` | `class EmployeeService {}` |
| Private fields | `_camelCase` | `this._currentUser = null` |
| Async functions | `async` prefix | `async function getById() {}` |
| Boolean variables | `is/has/should` prefix | `isActive`, `hasAccess`, `shouldRender` |

### SQL / Database

| Construct | Convention | Example |
|---|---|---|
| Tables | `snake_case` plural | `work_orders`, `production_items` |
| Columns | `snake_case` | `full_name`, `created_at` |
| Primary keys | `id` | Always `UUID PRIMARY KEY` |
| Foreign keys | `{table}_id` | `customer_id`, `approved_by` |
| Indexes | `idx_{table}_{column}` | `idx_quotations_status` |
| Unique constraints | `uq_{table}_{columns}` | `uq_quotation_spec` |
| Sequences | `seq_{table}` | `seq_employees` |
| Enums | `snake_case` | `user_role`, `quotation_status` |
| Enum values | `PascalCase` | `'Draft', 'Approved', 'Denied'` |
| Views | `v_{purpose}` | `v_customer_outstanding` |
| Functions | `snake_case` | `recalculate_customer_outstanding()` |

### API (Planned)

| Pattern | Example |
|---|---|
| Endpoints | `GET /api/quotations` |
| Resource names | plural: `/api/work-orders` |
| Path parameters | `:id`: `/api/quotations/:id` |
| Query parameters | `?status=pending&page=1` |
| Request body | JSON with `camelCase` keys |
| Response body | JSON with `camelCase` keys |

---

## JavaScript Conventions

### Imports

```javascript
// Absolute imports from src/
import { CONFIG, isDevelopment } from './src/config.js';
import { getStorageProvider } from './src/storage/index.js';

// Named exports preferred
import { AuthenticationService } from './src/services/AuthenticationService.js';
```

### Exports

```javascript
// Singleton instances
const instance = new ServiceClass();
export { instance as ServiceName };

// Classes
export class ServiceName extends BaseService {}

// Named functions
export function getDefaultState() {}
```

### Async Patterns

```javascript
// Always use async/await, never raw .then()
async function getEmployee(id) {
  const state = await this.loadState();
  return state.employees.find(e => e.id === id) || null;
}

// Error handling with try/catch
try {
  await employeeService.create(data);
} catch (err) {
  Logger.error('Failed to create employee', err);
  throw err; // Re-raise for the caller
}

// Top-level await is acceptable in module entry points
const token = await storage.get(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
```

### Error Handling

```javascript
import { AppError, ValidationError, NotFoundError, AuthError } from './src/utils/ErrorHandler.js';

// Throw typed errors
throw new NotFoundError(`Employee ${id} not found`);
throw new ValidationError('Email is required');
throw new AuthError('Invalid credentials');
```

### Logging

```javascript
import { Logger } from './src/utils/Logger.js';

Logger.info('Employee created', emp.id);
Logger.warn('Session expiring soon');
Logger.error('Operation failed', err);

// Never use console.log directly in business logic
// StorageProvider.js is the ONLY exception (abstraction layer errors)
```

### Comments

```javascript
// No comments in application code unless the logic is non-obvious.
// Comments describing WHAT the code does are banned.
// If you need a comment, refactor the code to be self-documenting.

// ACCEPTABLE: explaining WHY a non-obvious decision was made
// We use localStorage.getItem directly here because this runs before
// the StorageProvider module is initialized.
```

---

## Service Layer Conventions

```javascript
import { BaseService } from './BaseService.js';

export class EmployeeService extends BaseService {
  // All data access methods are async
  async getAll() {
    const state = await this.loadState();
    return (state.employees || []).filter(e => !e.isDeleted);
  }

  // Write methods call saveState and logActivity
  async create(data) {
    const state = await this.loadState();
    // ... create logic ...
    await this.saveState(state);
    await this.logActivity(`Employee created: ${emp.fullName}`);
    return emp;
  }
}
```

### Service Rules

1. Every service extends `BaseService`.
2. Every public method returns a Promise.
3. Services operate on state loaded from the StorageProvider.
4. Write operations call `this.saveState(state)` after mutation.
5. Write operations call `this.logActivity()` for audit trail.
6. Services never reference `window`, `document`, or DOM APIs.
7. Services never import from `app.js` or `erp.js`.

---

## Git Conventions

### Branch Naming

| Pattern | Example |
|---|---|
| `feat/{description}` | `feat/employee-api` |
| `fix/{description}` | `fix/quotation-pdf-encoding` |
| `refactor/{description}` | `refactor/storage-provider` |
| `docs/{description}` | `docs/api-spec` |
| `chore/{description}` | `chore/update-deps` |

### Commit Messages

```
type(scope): brief description

- Bullet point details
- More context if needed
```

Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`
Scopes: `frontend`, `api`, `db`, `auth`, `deploy`, `docs`

Examples:
```
feat(api): implement quotation CRUD endpoints

- GET /api/quotations with role-based filtering
- POST /api/quotations with spec values and custom items
- Includes validation and error handling
```

```
refactor(frontend): replace inline EmployeeService with imported service

- Removed 97-line inline EmployeeService from erp.js
- Admin functions now use the async employeeService
- All 11 call sites updated with await
```

---

## Review Checklist

Before submitting any pull request:

- [ ] No hardcoded credentials, tokens, or secrets
- [ ] All dev-only features behind `CONFIG.FEATURE_FLAGS.*`
- [ ] No `console.log` in business logic
- [ ] All async functions have proper error handling (try/catch)
- [ ] Service methods call `saveState` after mutations
- [ ] Service methods call `logActivity` for audit trail
- [ ] No direct `localStorage` access in UI code
- [ ] No `window.*` assignments unless required for HTML onclick bridge
- [ ] All SQL migrations are idempotent (use `IF NOT EXISTS`)
- [ ] Database migrations have both `UP` and `DOWN` where practical
- [ ] New API endpoints follow the established naming pattern
- [ ] Code builds without errors (`npm run build`)
