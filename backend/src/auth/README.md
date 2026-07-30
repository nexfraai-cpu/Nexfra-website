# Nexfra ERP — Authentication Module

## Overview

The authentication module handles all identity and access management for the Nexfra ERP system. It uses **Supabase Auth** as the underlying identity provider and syncs with the `employees` table for application-level roles and permissions.

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Client App │────▶│  POST /api/auth  │────▶│  AuthController  │
│  (erp.js)   │     │  /login          │     │                  │
└─────────────┘     └──────────────────┘     └────────┬─────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │  AuthService     │
                                              │                  │
                                              │  1. Sign in via  │
                                              │     Supabase     │
                                              │  2. Look up      │
                                              │     employee     │
                                              │  3. Update       │
                                              │     last_login   │
                                              │  4. Return JWT   │
                                              └────────┬─────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │  Supabase Auth   │
                                              │  + employees     │
                                              │  table           │
                                              └──────────────────┘
```

---

## Module Structure

```
src/auth/
├── index.ts              # Barrel exports
├── auth.routes.ts        # 6 endpoint definitions with validation + rate limiting
├── auth.controller.ts    # Request parsing, response formatting
├── auth.service.ts       # Business logic — login, logout, refresh, password reset
├── auth.queries.ts       # Supabase database + auth client calls
├── auth.validator.ts     # Zod schemas for request validation
├── auth.errors.ts        # Domain-specific error classes
└── auth.types.ts         # TypeScript interfaces (UserProfile, AuthTokens, etc.)
```

---

## API Endpoints

### POST /api/auth/login

Authenticate with email and password. Returns JWT access token + refresh token.

**Request:**
```json
{ "email": "admin@nexfra.in", "password": "secure-password" }
```

**Response (success):**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "authId": "uuid",
      "email": "admin@nexfra.in",
      "name": "Admin User",
      "role": "admin",
      "employeeNumber": "EMP-000001",
      "lastLoginAt": "2026-07-31T10:00:00Z"
    },
    "session": {
      "token": "eyJhbGci...",
      "refreshToken": "eyJhbGci...",
      "expiresAt": 1722412800000
    }
  }
}
```

**Response (MFA required):**
```json
{
  "requiresMfa": true,
  "mfaType": "totp",
  "mfaToken": "mfa_token_string"
}
```

**Errors:** `401 Invalid email or password`, `403 Account is disabled`

**Rate limit:** 10 attempts per 15 minutes per IP

---

### GET /api/auth/me

Get the currently authenticated user's profile. Requires valid JWT.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "authId": "uuid",
    "email": "admin@nexfra.in",
    "name": "Admin User",
    "role": "admin",
    "employeeNumber": "EMP-000001",
    "lastLoginAt": "2026-07-31T10:00:00Z"
  }
}
```

---

### POST /api/auth/logout

Invalidate the current session. Requires valid JWT.

**Headers:** `Authorization: Bearer <token>`

**Response:** `{ "data": { "message": "Logged out successfully" } }`

---

### POST /api/auth/refresh

Exchange a refresh token for a new JWT access token.

**Request:**
```json
{ "refreshToken": "eyJhbGci..." }
```

**Response:**
```json
{
  "data": {
    "token": "new-access-token",
    "refreshToken": "new-refresh-token",
    "expiresAt": 1722416400000
  }
}
```

**Note:** Supabase refresh tokens are single-use. Each refresh returns a new refresh token.

---

### POST /api/auth/forgot-password

Send a password reset email to the given address.

**Request:**
```json
{ "email": "user@nexfra.in" }
```

**Response:** `{ "data": { "message": "If the email exists, a password reset link has been sent." } }`

**Note:** Always returns success to prevent email enumeration. Supabase handles the email delivery.

---

### POST /api/auth/update-password

Update the current user's password. Requires valid JWT (from reset flow).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{ "password": "new-secure-password" }
```

**Response:** `{ "data": { "message": "Password updated successfully" } }`

**Validation:** Password must be at least 8 characters.

---

## Authentication Flow (Detailed)

### Login

```
1. Client sends POST /api/auth/login { email, password }
2. loginLimiter (rate-limit: 10/15min) checks IP
3. validate(loginSchema) validates email format + password presence
4. AuthController.login():
   a. Calls AuthService.login(email, password)
5. AuthService.login():
   a. AuthQueries.signIn(email, password)
        → supabase.auth.signInWithPassword()
   b. If MFA required → return { requiresMfa: true }
   c. If error → throw InvalidCredentialsError
   d. AuthQueries.getEmployeeByAuthId(supabaseUser.id)
        → supabase.from('employees').select('*').eq('auth_id', authId)
   e. If no employee → throw InvalidCredentialsError
   f. If employee.status !== 'Active' → throw AccountDisabledError
   g. AuthQueries.updateLastLogin(employee.id)
        → supabase.from('employees').update({ last_login_at: now() })
   h. Return { user: UserProfile, session: AuthTokens }
6. AuthController returns { data: { user, session } }
```

### Session Validation (Auth Middleware)

```
1. Client sends request with Authorization: Bearer <token>
2. auth middleware:
   a. Extract token from header (strip 'Bearer ')
   b. supabase.auth.getUser(token)
   c. If invalid/expired → 401 AuthError
   d. supabase.from('employees').select('*').eq('auth_id', user.id)
   e. If no employee → 401 AuthError
   f. If employee.status === 'Disabled' → 401 AuthError
   g. Attach employee info to req.user
3. Downstream middleware/controller uses req.user for authorization
```

### Session Refresh

```
1. Client detects token expiring (or gets 401)
2. Client sends POST /api/auth/refresh { refreshToken }
3. AuthService:
   a. AuthQueries.refreshSession(refreshToken)
        → supabase.auth.refreshSession({ refresh_token })
   b. If invalid → throw RefreshTokenInvalidError
   c. Return { session: { token, refreshToken, expiresAt } }
4. Client updates stored tokens
```

### Password Reset

```
1. Client sends POST /api/auth/forgot-password { email }
2. AuthService.forgotPassword(email):
   a. AuthQueries.sendPasswordResetEmail(email)
        → supabase.auth.resetPasswordForEmail(email, { redirectTo })
   b. Always returns success message (anti-enumeration)
3. Supabase sends email with link to reset-password page
4. User clicks link → Supabase redirects to app with access_token in URL
5. App extracts token from URL hash
6. User enters new password
7. Client sends POST /api/auth/update-password { password }
   Headers: Authorization: Bearer <token-from-url>
8. AuthQueries.updatePassword(password)
   → supabase.auth.updateUser({ password })
```

---

## Roles & Permissions

| Role | Description | Permissions |
|---|---|---|
| `admin` | Full system access | All CRUD on all entities, system settings, audit logs, pricing |
| `manager` | Operational management | Read employees, CRUD customers, CRUD + approve quotations, manage work orders, update production, read accounts |
| `sales` | Customer-facing sales | CRUD customers, CRUD quotations (no approve), read work orders, read production |
| `finance` | Financial operations | Read customers/quotations, manage sales ledger and payments |

Granular permission mapping is defined in `src/middleware/permission.ts`.

---

## Middleware Chain

### Role-Based Authorization

```typescript
// Only admin and manager can access
router.get('/', auth, authorize('admin', 'manager'), controller.list);

// Only admin
router.delete('/:id', auth, authorize('admin'), controller.delete);
```

### Permission-Based Authorization

```typescript
import { requirePermission } from '../middleware/permission.js';

// Granular check
router.patch('/:id/approve', auth, requirePermission('quotation:approve'), controller.approve);
```

### Validation

```typescript
router.post('/', auth, validate(createEmployeeSchema), controller.create);
```

### Full Middleware Chain Order

```
1. express.json()              — Parse body
2. helmet()                    — Security headers
3. cors()                      — Cross-origin
4. rateLimit()                 — Global rate limit
5. morgan()                    — HTTP logging
6. auth()                      — JWT validation + user attachment
7. authorize() / requirePermission() — Role/permission check
8. validate()                  — Zod schema validation
9. controller                  — Business logic
10. errorHandler()             — Catch all errors
```

---

## Error Handling

Auth-specific errors (from `auth.errors.ts`):

| Error | Status | Trigger |
|---|---|---|
| `InvalidCredentialsError` | 401 | Wrong email/password |
| `AccountDisabledError` | 403 | Employee.status === 'Disabled' |
| `SessionExpiredError` | 401 | No employee for auth_id |
| `RefreshTokenInvalidError` | 401 | Invalid/expired refresh token |
| `EmailNotVerifiedError` | 403 | User hasn't confirmed email |

Standard auth middleware errors:

| Error | Status | Trigger |
|---|---|---|
| `AuthError` | 401 | Missing/malformed token, invalid token, no employee record |
| `ForbiddenError` | 403 | Insufficient role/permissions |

All errors follow the format:
```json
{
  "error": "InvalidCredentialsError",
  "message": "Invalid email or password"
}
```

---

## Security Measures

| Measure | Implementation |
|---|---|
| Password hashing | Handled by Supabase Auth (bcrypt, cost factor 12) |
| Token format | Supabase JWT with RS256 signing |
| Token expiry | Access: 1 hour, Refresh: 7 days |
| Brute force protection | Rate limit: 10 login attempts / 15 min per IP |
| Email enumeration | Forgot password always returns success |
| Token refresh | Single-use refresh tokens (rotated on each refresh) |
| Session invalidation | Server-side signOut via Supabase |
| MFA support | Supabase TOTP MFA (detected, not implemented at app layer) |
| No password in logs | Pino redaction config excludes req.body.password |
| No token in logs | Pino redaction config excludes req.headers.authorization |

---

## Frontend Integration

The ERP frontend (`erp.js`) communicates with the auth module via the **ApiProvider** (`src/storage/ApiProvider.js`).

### Token Storage

On the frontend, tokens are stored in memory (variable) rather than localStorage for security:

```typescript
// Frontend token management (pattern)
let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiresAt: number | null = null;

async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  accessToken = data.session.token;
  refreshToken = data.session.refreshToken;
  tokenExpiresAt = data.session.expiresAt;
}

async function refresh() {
  const { data } = await api.post('/auth/refresh', { refreshToken });
  accessToken = data.token;
  refreshToken = data.refreshToken;
  tokenExpiresAt = data.expiresAt;
}
```

### Auto-Refresh Flow

```typescript
// Interceptor pattern
async function authenticatedRequest(url: string, options: RequestInit) {
  if (Date.now() >= tokenExpiresAt! - 60_000) {
    await refresh(); // Refresh before expiry
  }
  return fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
  });
}
```
