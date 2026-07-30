# Nexfra ERP — Employee Module (OpenAPI Documentation)

## Overview

The Employee module manages the organization's workforce. Employees are the users of the ERP system, each linked to a Supabase Auth account. The module supports full CRUD, status management, role assignment, and password reset.

**Base URL:** `/api/employees`

**Authentication:** All endpoints require a valid JWT via `Authorization: Bearer <token>`.

---

## Schemas

### EmployeeResponse

```json
{
  "id": "uuid",
  "authId": "uuid | null",
  "employeeNumber": "EMP-000001",
  "fullName": "John Doe",
  "email": "john@nexfra.in",
  "phone": "+91-9876543210",
  "employeeCode": "EMP001",
  "role": "admin | sales | finance | manager",
  "status": "Active | Disabled",
  "lastLoginAt": "2026-07-30T10:00:00Z | null",
  "createdAt": "2026-01-15T08:00:00Z",
  "createdBy": "uuid | null",
  "updatedAt": "2026-07-30T10:00:00Z"
}
```

### CreateEmployeeInput

```json
{
  "fullName": "Jane Smith",
  "email": "jane@nexfra.in",
  "password": "securePassword123",
  "phone": "+91-9876543210",
  "employeeCode": "EMP042",
  "role": "sales"
}
```

**Validation:**
- `fullName`: 2–100 characters, required
- `email`: valid email format, required
- `password`: 8+ characters, required
- `phone`: optional, regex `/^\+?[\d\s-]{10,15}$/`
- `employeeCode`: optional, max 20 characters
- `role`: one of `admin`, `sales`, `finance`, `manager`, required

### UpdateEmployeeInput

```json
{
  "fullName": "Jane Smith-Updated",
  "phone": "+91-1111111111",
  "employeeCode": "EMP099",
  "role": "manager"
}
```

All fields optional.

---

## Endpoints

### GET /api/employees

List all active employees. Supports filtering and search.

**Authorization:** `admin`, `manager`

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `role` | string | No | Filter by role: `admin`, `sales`, `finance`, `manager` |
| `status` | string | No | Filter by status: `Active`, `Disabled` |
| `search` | string | No | Search across `full_name`, `email`, `employee_number`, `employee_code` |
| `includeDisabled` | boolean | No | Include disabled employees in results |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "authId": "uuid",
      "employeeNumber": "EMP-000001",
      "fullName": "John Doe",
      "email": "john@nexfra.in",
      "phone": "+91-9876543210",
      "employeeCode": null,
      "role": "admin",
      "status": "Active",
      "lastLoginAt": "2026-07-30T10:00:00Z",
      "createdAt": "2026-01-15T08:00:00Z",
      "createdBy": null,
      "updatedAt": "2026-07-30T10:00:00Z"
    }
  ]
}
```

---

### GET /api/employees/:id

Get a single employee by UUID.

**Authorization:** `admin`, `manager`

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | uuid | Yes | Employee UUID |

**Response 200:** Single `EmployeeResponse`

**Response 404:**
```json
{ "error": "EmployeeNotFoundError", "message": "Employee 'uuid' not found" }
```

---

### POST /api/employees

Create a new employee. Creates a Supabase Auth user (auto-confirmed) and updates the employee record with optional fields. The `employee_number` is auto-generated via the database sequence.

**Authorization:** `admin` only

**Request Body:** `CreateEmployeeInput`

**Response 201:** `EmployeeResponse`

**Response 409:**
```json
{ "error": "EmployeeEmailConflictError", "message": "An employee with email 'jane@nexfra.in' already exists" }
```

---

### PUT /api/employees/:id

Update an existing employee's fields.

**Authorization:** `admin` only

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | uuid | Yes | Employee UUID |

**Request Body:** `UpdateEmployeeInput`

**Guards:**
- Cannot change own role (admin cannot demote themselves)
- Cannot remove the last active admin role (at least one admin must remain)

**Response 200:** `EmployeeResponse`

**Response 400:**
```json
{ "error": "CannotChangeOwnRoleError", "message": "You cannot change your own role. Ask another admin." }
```

**Response 400:**
```json
{ "error": "LastAdminCannotChangeRoleError", "message": "Cannot change role. At least one admin must remain." }
```

**Response 404:** `EmployeeNotFoundError`

---

### DELETE /api/employees/:id

Soft-delete an employee. Sets `deleted_at` timestamp and removes the linked Supabase Auth user.

**Authorization:** `admin` only

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | uuid | Yes | Employee UUID |

**Guards:**
- Cannot delete yourself
- Cannot delete the last active admin

**Response 200:**
```json
{ "data": { "message": "Employee deleted successfully" } }
```

**Response 400:**
```json
{ "error": "CannotDeleteSelfError", "message": "You cannot delete your own account" }
```

---

### PATCH /api/employees/:id/status

Toggle an employee's status between `Active` and `Disabled`. A disabled employee cannot log in.

**Authorization:** `admin` only

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | uuid | Yes | Employee UUID |

**Guards:**
- Cannot disable yourself
- Cannot disable the last active admin

**Response 200:** `EmployeeResponse`

**Response 400:**
```json
{ "error": "CannotDisableSelfError", "message": "You cannot disable your own account" }
```

---

### PATCH /api/employees/:id/password

Reset an employee's password. Uses Supabase Admin API to set the new password directly if an auth_id exists, or generates a password reset email as fallback.

**Authorization:** `admin` only

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | uuid | Yes | Employee UUID |

**Request Body:**
```json
{ "password": "newSecurePassword123" }
```

**Validation:** `password` must be at least 8 characters.

**Response 200:**
```json
{ "data": { "message": "Password reset successfully" } }
```

**Response 404:** `EmployeeNotFoundError`

---

## Error Codes

| HTTP Status | Error | Description |
|---|---|---|
| 400 | `CannotDeleteSelfError` | Actor tried to delete their own account |
| 400 | `CannotDisableSelfError` | Actor tried to disable their own account |
| 400 | `CannotChangeOwnRoleError` | Actor tried to change their own role |
| 400 | `LastAdminCannotChangeRoleError` | Would leave zero active admins |
| 400 | `LastAdminCannotDisableError` | Would leave zero active admins |
| 400 | `LastAdminCannotDeleteError` | Would leave zero active admins |
| 404 | `EmployeeNotFoundError` | Employee UUID not found or deleted |
| 409 | `EmployeeEmailConflictError` | Email already registered |

---

## Role Access Matrix

| Endpoint | admin | manager |
|---|---|---|
| GET /api/employees | ✅ | ✅ |
| GET /api/employees/:id | ✅ | ✅ |
| POST /api/employees | ✅ | ❌ |
| PUT /api/employees/:id | ✅ | ❌ |
| DELETE /api/employees/:id | ✅ | ❌ |
| PATCH /api/employees/:id/status | ✅ | ❌ |
| PATCH /api/employees/:id/password | ✅ | ❌ |

---

## Audit Trail

Every mutation creates an entry in the `audit_logs` table:

| Action | entity_type | Description |
|---|---|---|
| `create` | `employee` | Employee created with role |
| `update` | `employee` | Fields updated (old + new values in metadata) |
| `delete` | `employee` | Employee soft-deleted |
| `update-status` | `employee` | Status toggled Active/Disabled |
| `reset-password` | `employee` | Password reset by admin |

---

## Example cURL Commands

```bash
# List employees (as admin)
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/employees

# List sales employees with search
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/employees?role=sales&search=Jane"

# Get employee by ID
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/employees/a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Create employee
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Jane Smith","email":"jane@nexfra.in","password":"secure123","role":"sales"}' \
  http://localhost:4000/api/employees

# Update employee
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Jane Updated","role":"manager"}' \
  http://localhost:4000/api/employees/a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Toggle status
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/employees/a1b2c3d4-e5f6-7890-abcd-ef1234567890/status

# Reset password
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password":"newSecurePass789"}' \
  http://localhost:4000/api/employees/a1b2c3d4-e5f6-7890-abcd-ef1234567890/password

# Delete employee
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/employees/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```
