# Nexfra ERP — Backend API Specification

## Architecture

The frontend communicates with the backend exclusively through the **StorageProvider** abstraction layer (`src/storage/`). Currently using `LocalStorageProvider`; switching to `ApiProvider` connects to a REST API without changing any UI code.

## StorageProvider Interface

```js
class StorageProvider {
  async get(key)        // → string | null
  async set(key, value) // → void
  async remove(key)     // → void
  async clear()         // → void
  async getJSON(key)    // → any | null
  async setJSON(key, value) // → void
}
```

### Configuration

Set via environment variables:

| Variable | Production Value | Purpose |
|---|---|---|
| `VITE_APP_ENV` | `production` | Environment mode |
| `VITE_STORAGE_PROVIDER` | `api` | Switches to ApiProvider |
| `VITE_API_URL` | `https://api.nexframfg.com` | Backend base URL |
| `VITE_ENABLE_QUICK_LOGIN` | `false` | Disable dev quick-login |
| `VITE_ENABLE_RESET_DATA` | `false` | Disable dev reset button |
| `VITE_ENABLE_DEMO_ACCOUNTS` | `false` | Disable demo accounts |

## API Endpoints (Proposed)

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticate employee, return JWT |
| POST | `/api/auth/logout` | Invalidate session |
| GET  | `/api/auth/me` | Get current user profile |

### Employees

| Method | Endpoint | Description |
|---|---|---|
| GET    | `/api/employees` | List active employees |
| GET    | `/api/employees/:id` | Get employee by ID |
| POST   | `/api/employees` | Create employee |
| PUT    | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Soft-delete employee |
| PATCH  | `/api/employees/:id/status` | Toggle active/disabled |
| PATCH  | `/api/employees/:id/password` | Reset password |

### Customers

| Method | Endpoint | Description |
|---|---|---|
| GET    | `/api/customers` | List customers |
| GET    | `/api/customers/:id` | Get customer with vehicles |
| POST   | `/api/customers` | Create customer |
| PUT    | `/api/customers/:id` | Update customer |
| DELETE | `/api/customers/:id` | Delete customer |

### Quotations

| Method | Endpoint | Description |
|---|---|---|
| GET    | `/api/quotations` | List quotations (filtered by role) |
| GET    | `/api/quotations/:id` | Get quotation with specs |
| POST   | `/api/quotations` | Create quotation |
| PUT    | `/api/quotations/:id` | Update quotation |
| PATCH  | `/api/quotations/:id/approve` | Approve quotation |
| PATCH  | `/api/quotations/:id/deny` | Deny quotation |
| DELETE | `/api/quotations/:id` | Delete draft quotation |

### Work Orders

| Method | Endpoint | Description |
|---|---|---|
| GET    | `/api/work-orders` | List work orders |
| GET    | `/api/work-orders/:id` | Get work order details |
| POST   | `/api/work-orders` | Create from approved quotation |
| PUT    | `/api/work-orders/:id` | Update work order |
| PATCH  | `/api/work-orders/:id/due-date` | Set due date |
| PATCH  | `/api/work-orders/:id/urgent` | Toggle urgent flag |

### Production

| Method | Endpoint | Description |
|---|---|---|
| GET    | `/api/production` | List production items |
| PATCH  | `/api/production/:id/stage` | Update production stage |
| POST   | `/api/production/:id/chassis` | Add chassis record |
| GET    | `/api/production/:id/chassis` | Get chassis records |

### Finance

| Method | Endpoint | Description |
|---|---|---|
| GET    | `/api/finance/sales` | List sales records |
| GET    | `/api/finance/payments` | List payments |
| POST   | `/api/finance/sales` | Record a sale |
| POST   | `/api/finance/payments` | Record a payment |
| GET    | `/api/finance/stats` | Monthly statistics |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| GET    | `/api/admin/pricing` | Get pricing coefficients |
| PUT    | `/api/admin/pricing` | Update pricing coefficients |
| GET    | `/api/admin/products` | Get product definitions |
| PUT    | `/api/admin/products` | Update product definitions |
| GET    | `/api/admin/logs` | Get system activity logs |
| POST   | `/api/admin/reset` | Reset system data (dev only) |

## Data Model (JSON State Shape)

```json
{
  "customers": [],
  "quotations": [],
  "workOrders": [],
  "productionItems": [],
  "sales": [],
  "payments": [],
  "employees": [],
  "logs": [],
  "customItemDefinitions": [],
  "chassisRecords": [],
  "adminPricing": {},
  "productSpecOverrides": {}
}
```

## Implementing ApiProvider

See `src/storage/ApiProvider.js` for the stub. Each method should make `fetch` calls to the corresponding API endpoint, handling JWT tokens, error responses, and caching as needed.
