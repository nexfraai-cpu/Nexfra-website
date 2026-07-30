# Nexfra ERP — Customer Module (OpenAPI Documentation)

## Overview

The Customer module manages the organization's customer directory. Each customer represents a company/person that purchases products or services. Customers are linked to quotations, work orders, and sales records.

**Base URL:** `/api/customers`

**Authentication:** All endpoints require a valid JWT via `Authorization: Bearer <token>`.

---

## Schemas

### CustomerResponse

```json
{
  "id": "uuid",
  "customerNumber": "CUS-000001",
  "name": "Ravi Sharma",
  "company": "Sharma Fabricators",
  "gst": "27AABCU1234D1Z1",
  "phone": "+91-9876543210",
  "email": "ravi@sharmafab.in",
  "address": "123 Industrial Area, Mumbai",
  "vehicles": [{ "registration": "MH-01-AB-1234", "type": "Truck" }],
  "outstanding": 150000.00,
  "createdAt": "2026-01-15T08:00:00Z",
  "createdBy": "uuid",
  "updatedAt": "2026-07-30T10:00:00Z"
}
```

### CreateCustomerInput

```json
{
  "name": "Ravi Sharma",
  "company": "Sharma Fabricators",
  "gst": "27AABCU1234D1Z1",
  "phone": "+91-9876543210",
  "email": "ravi@sharmafab.in",
  "address": "123 Industrial Area, Mumbai",
  "vehicles": [{ "registration": "MH-01-AB-1234", "type": "Truck" }]
}
```

**Validation:**
- `name`: 1–200 characters, required
- `company`: 1–200 characters, required
- `gst`: 15-character GST format (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`), optional
- `phone`: regex `/^\+?[\d\s-]{10,15}$/`, optional
- `email`: valid email format, optional
- `address`: max 500 characters, optional
- `vehicles`: array of `{ registration?, type? }`, optional

### UpdateCustomerInput

All fields from `CreateCustomerInput` made optional. Fields can be set to `null` to clear them (except `name`, `company`).

---

## Endpoints

### GET /api/customers

List customers with pagination, search, and filtering.

**Authorization:** `admin`, `manager`, `sales`, `finance`

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number (>= 1) |
| `perPage` | integer | `20` | Items per page (1–100) |
| `search` | string | — | Search across `name`, `company`, `email`, `phone`, `gst`, `customer_number` |
| `company` | string | — | Filter by company name (partial match) |
| `sortBy` | enum | `created_at` | Sort field: `name`, `company`, `created_at`, `outstanding` |
| `sortOrder` | enum | `desc` | Sort direction: `asc`, `desc` |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "customerNumber": "CUS-000001",
      "name": "Ravi Sharma",
      "company": "Sharma Fabricators",
      "gst": "27AABCU1234D1Z1",
      "phone": "+91-9876543210",
      "email": "ravi@sharmafab.in",
      "address": "123 Industrial Area, Mumbai",
      "vehicles": [],
      "outstanding": 150000.00,
      "createdAt": "2026-01-15T08:00:00Z",
      "createdBy": "uuid",
      "updatedAt": "2026-07-30T10:00:00Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "perPage": 20,
    "totalPages": 3
  }
}
```

**Response 400:**
```json
{ "error": "InvalidPaginationError", "message": "Invalid pagination parameters. page must be >= 1, perPage must be 1-100." }
```

---

### GET /api/customers/:id

Get a single customer by UUID.

**Authorization:** `admin`, `manager`, `sales`, `finance`

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | uuid | Yes | Customer UUID |

**Response 200:** Single `CustomerResponse`

**Response 404:**
```json
{ "error": "CustomerNotFoundError", "message": "Customer 'uuid' not found" }
```

---

### POST /api/customers

Create a new customer. The `customerNumber` is auto-generated via the database sequence (`CUS-000001`, `CUS-000002`, ...).

**Authorization:** `admin`, `manager`, `sales`

**Request Body:** `CreateCustomerInput`

**Guards:**
- GST must be unique (if provided). Returns `409 CustomerGstConflictError` if duplicate.

**Response 201:** `CustomerResponse`

**Response 409:**
```json
{ "error": "CustomerGstConflictError", "message": "A customer with GST '27AABCU1234D1Z1' already exists" }
```

---

### PUT /api/customers/:id

Update an existing customer's fields.

**Authorization:** `admin`, `manager`, `sales`

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | uuid | Yes | Customer UUID |

**Request Body:** `UpdateCustomerInput`

**Guards:**
- GST uniqueness checked against other active customers (excludes self)

**Response 200:** `CustomerResponse`

**Response 404:** `CustomerNotFoundError`

**Response 409:** `CustomerGstConflictError`

---

### DELETE /api/customers/:id

Soft-delete a customer. Sets `deleted_at` timestamp. The customer record is preserved and excluded from all queries.

**Authorization:** `admin` only

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | uuid | Yes | Customer UUID |

**Response 200:**
```json
{ "data": { "message": "Customer deleted successfully" } }
```

**Response 404:** `CustomerNotFoundError`

---

## Error Codes

| HTTP Status | Error | Description |
|---|---|---|
| 400 | `InvalidPaginationError` | page < 1 or perPage not in 1–100 |
| 404 | `CustomerNotFoundError` | Customer UUID not found or deleted |
| 409 | `CustomerGstConflictError` | GST already registered |

---

## Role Access Matrix

| Endpoint | admin | manager | sales | finance |
|---|---|---|---|---|
| GET /api/customers | ✅ | ✅ | ✅ | ✅ |
| GET /api/customers/:id | ✅ | ✅ | ✅ | ✅ |
| POST /api/customers | ✅ | ✅ | ✅ | ❌ |
| PUT /api/customers/:id | ✅ | ✅ | ✅ | ❌ |
| DELETE /api/customers/:id | ✅ | ❌ | ❌ | ❌ |

---

## Audit Trail

| Action | entity_type | Description |
|---|---|---|
| `create` | `customer` | Customer created |
| `update` | `customer` | Fields updated (old + new values in metadata) |
| `delete` | `customer` | Customer soft-deleted |

---

## Database Indexes

The following indexes exist on the `customers` table to support search and filtering:

```sql
CREATE INDEX idx_customers_company ON customers(company) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_email ON customers(email) WHERE deleted_at IS NULL;
```

Additional indexes benefit the common query patterns:
- `customer_number` is indexed via `UNIQUE` constraint
- `name` and `phone` searches use `ilike` (sequential scan) — add a `pg_trgm` index if the table exceeds 10,000 rows

---

## Example cURL Commands

```bash
# List customers (page 1, 10 per page, search)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/customers?page=1&perPage=10&search=Sharma"

# List customers by company, sorted by name
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/customers?company=Fabricators&sortBy=name&sortOrder=asc"

# Get customer by ID
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/customers/c1d2e3f4-a5b6-7890-abcd-ef1234567890

# Create customer
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Priya Patel","company":"Patel Engineers","phone":"+91-9988776655"}' \
  http://localhost:4000/api/customers

# Update customer
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+91-1111111111","email":"updated@email.in"}' \
  http://localhost:4000/api/customers/c1d2e3f4-a5b6-7890-abcd-ef1234567890

# Delete customer
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/customers/c1d2e3f4-a5b6-7890-abcd-ef1234567890
```
