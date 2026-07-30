# Nexfra ERP — Security Model

## Current State (Frontend-Only)

The current application is a frontend-only SPA using `localStorage` for persistence. The security model is **minimal by design** because there is no server, no network requests, and no user data leaves the browser.

### Authentication

```
Login:
  1. User enters email + password
  2. EmployeeService.authenticate() scans localStorage
  3. Matches employee with same email + plain-text password
  4. Writes to localStorage:
     - NEXFRA_AUTH_TOKEN = 'true'
     - NEXFRA_USER_ROLE = employee.role
     - NEXFRA_USER_NAME = employee.fullName

Session Persistence:
  - Session is purely localStorage-based
  - Survives page refresh and browser restart
  - Cleared on explicit logout
  - No expiry mechanism

Logout:
  1. Remove NEXFRA_AUTH_TOKEN, NEXFRA_USER_ROLE, NEXFRA_USER_NAME
  2. Redirect to index.html
```

### Authorization

```
On erp.html load:
  localStorage.getItem(NEXFRA_AUTH_TOKEN) === 'true'
    ? render sidebar with permitted modules
    : window.location.href = '/index.html'

Module Access:
  ROLE_PERMISSIONS[moduleName].includes(currentRole)
    ? allow access (show link + render)
    : deny

Role Hierarchy:
  SuperAdmin > Admin > Manager > Sales > Production > Finance > Viewer
```

### Known Limitations

1. **Plain-text passwords** — Passwords are stored as plain text in localStorage. There is no hashing. This is acceptable only because localStorage is single-origin and not transmitted.
2. **No session expiry** — The "token" is literally the string `'true'`. Anyone with browser access is logged in.
3. **localStorage accessible via DevTools** — Any user can open DevTools and read/write all state.
4. **No CSRF/XSS protection** — The app does not render user content unsafely, but there is no explicit XSS prevention beyond `escHtml()`.
5. **No rate limiting** — Login attempts are not rate-limited.

These limitations are **intentional** for the frontend-only phase. All will be addressed when the backend is implemented.

---

## Migration Path: localStorage → Supabase Auth

### Step 1: Supabase Auth (JWT-Based)

```
Login:
  1. User enters email + password
  2. POST /api/auth/login
  3. Express validates credentials against Supabase Auth
  4. Returns JWT access token + refresh token
  5. JWT stored in localStorage (or HttpOnly cookie)
  6. Token includes: user_id, role, email

Authenticated Requests:
  Authorization: Bearer <jwt>
  Express middleware validates JWT on every request
  JWT contains role claim for authorization

Refresh:
  Access token: 15-minute expiry
  Refresh token: 7-day expiry
  Auto-refresh on 401 response
```

### Step 2: Row-Level Security (PostgreSQL)

```sql
-- Example RLS policy
CREATE POLICY "Managers can view all quotations"
  ON quotations FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('SuperAdmin', 'Admin', 'Manager')
    OR
    created_by = auth.uid()
  );
```

77 RLS policies are already defined in `supabase/migrations/20260731000001_schema.sql`.

### Step 3: Password Security

- Passwords hashed with **bcrypt** (cost factor 12)
- Supabase Auth handles password hashing natively
- Admin API for password reset with email verification
- Password strength requirements enforced at API level

---

## Security Requirements for Backend

### Authentication

- All API endpoints (except `/api/auth/login`) require JWT
- JWT must be validated on every request
- Invalid/expired JWT returns 401
- No role enumeration in error messages
- Login rate limiting: 5 attempts per IP per minute

### Authorization

- Every endpoint must check role permissions
- Row-level access enforced at database level (RLS)
- Service layer re-checks permissions (defense in depth)
- Endpoint access control:

| Endpoint | SuperAdmin | Admin | Manager | Sales | Production | Finance | Viewer |
|---|---|---|---|---|---|---|---|
| GET /api/employees | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| POST /api/employees | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PUT /api/employees/:id | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| DELETE /api/employees/:id | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /api/quotations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST /api/quotations | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| PATCH /api/quotations/:id/approve | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| GET /api/work-orders | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PATCH /api/production/:id/stage | ✅ | ✅ | ✅* | ❌ | ✅ | ❌ | ❌ |
| GET /api/finance/sales | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| GET /api/admin/pricing | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PUT /api/admin/pricing | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

\* Admin cannot approve own quotations. Manager cannot approve.

### Data Protection

- All API responses over HTTPS only
- No sensitive data in URL query parameters
- Password fields never returned in API responses (not even hashed)
- Personal identifiable information (PII) only accessible to authorized roles

### Input Validation

- All inputs validated on the server (never trust the client)
- SQL injection prevented by parameterized queries (Supabase SDK)
- XSS prevention: all user content escaped on output
- Request body size limits (1 MB default)

### Secrets Management

- No secrets in code, environment variables only
- `.env` files used for development (gitignored)
- Production secrets via platform secret store (Vercel + Supabase)
- Database connection strings never logged

### Audit Trail

- All mutations logged to `audit_logs` table
- Log includes: user_id, action, entity_type, entity_id, old_value, new_value, ip_address
- Audit logs are append-only (RLS prevents UPDATE/DELETE)
- Audit logs retained for minimum 1 year

### Infrastructure Security

- CORS: Only whitelisted origins (www.nexfra.in, erp.nexfra.in, localhost:3000)
- Helmet.js: Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Rate limiting: express-rate-limit (100 req/min per IP)
- Database: Supabase with automated backups + point-in-time recovery
- SSL/TLS: Automatic via Supabase + Vercel

---

## Incident Response (Future)

1. **Detection**: Supabase audit logs + API request logging
2. **Containment**: Revoke compromised credentials, block IP via rate limiter
3. **Eradication**: Rotate secrets, review access logs
4. **Recovery**: Restore from backup if data corrupted
5. **Post-mortem**: Document incident, update security measures
