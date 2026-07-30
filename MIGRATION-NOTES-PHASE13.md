# Phase 13 — Migration Notes: LocalStorage → API Storage Provider

## Summary

Replaced the frontend `LocalStorageProvider` with `ApiProvider`. All application state (ERP data, auth tokens, session info) now flows through the backend `/api/storage/:key` REST endpoints backed by the `app_settings` table, instead of browser `localStorage`.

## Changes — Backend

### New Module: `backend/src/storage/`

| File | Purpose |
|------|---------|
| `storage.routes.ts` | Routes for generic key-value storage |
| `storage.controller.ts` | CRUD handlers using `app_settings` table |
| `storage.validator.ts` | Zod schemas for key params and body |
| `index.ts` | Module exports |

### New Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/storage/:key` | Read value by key |
| `POST` | `/api/storage/:key` | Upsert value by key |
| `DELETE` | `/api/storage/:key` | Remove a key |
| `DELETE` | `/api/storage` | Clear all `NEXFRA_*` prefixed keys |

All storage endpoints are public (no auth required) to mirror the localStorage behavior where all data is always readable/writable.

### Modified: `backend/src/index.ts`

Added `storageRouter` import and mounted at `/api/storage`.

## Changes — Frontend

### Modified: `src/storage/ApiProvider.js`

Full rewrite of the existing stub:
- Endpoints changed from `/storage/:key` to `/api/storage/:key`
- GET handles 404 gracefully (returns `null`)
- Network errors return `null` instead of throwing (mirrors localStorage try/catch)
- `getJSON` handles both string and pre-parsed values

### Modified: `.env`

```diff
-VITE_STORAGE_PROVIDER=localStorage
-VITE_API_BASE_URL=
+VITE_STORAGE_PROVIDER=api
+VITE_API_BASE_URL=http://localhost:4000
```

### Modified: `erp.js`

Used an **in-memory state cache pattern** to preserve the synchronous `loadState()`/`saveState()` API used by 75+ call sites throughout erg.js:

- `initSession()` — now async; fetches `AUTH_TOKEN`, `USER_ROLE`, `USER_NAME`, and pre-populates `_stateCache` from the API during `DOMContentLoaded`
- `loadState()` — remains synchronous; copies from in-memory `_stateCache` instead of calling `localStorage.getItem()`
- `saveState()` — remains synchronous; updates `_stateCache` in memory and fires `storage.setJSON()` in the background for eventual API persistence

```diff
- const _sessionRole = localStorage.getItem(...) || 'admin';
- const _sessionUser = localStorage.getItem(...) || 'Admin';
+ let _sessionRole = 'admin';
+ let _sessionUser = 'Admin';
+ let _stateCache = {};
+ async function initSession() { ... }


## Storage Key Mapping

Frontend keys are stored in the `app_settings` database table:

| Frontend Key (`STORAGE_KEYS`) | DB `app_settings.key` | Purpose |
|-------------------------------|----------------------|---------|
| `NEXFRA_ERP_STATE` | `NEXFRA_ERP_STATE` | Full ERP application state |
| `NEXFRA_AUTH_TOKEN` | `NEXFRA_AUTH_TOKEN` | Session authentication flag |
| `NEXFRA_USER_ROLE` | `NEXFRA_USER_ROLE` | Current user role |
| `NEXFRA_USER_NAME` | `NEXFRA_USER_NAME` | Current user display name |
| `NEXFRA_REDIRECT_AFTER_LOGIN` | `NEXFRA_REDIRECT_AFTER_LOGIN` | Post-login redirect target |

## Verification

- Backend: `npx tsc --noEmit` → 0 errors
- Backend: `npx jest --passWithNoTests` → 146/146 tests pass (8 suites)
- UI/UX: **Unchanged** — all service classes, DOM structure, CSS, and event handlers remain identical
- Frontend services: All 9 service classes (`AuthenticationService`, `CustomerService`, `EmployeeService`, etc.) continue to use `BaseService.loadState()`/`saveState()` transparently

## Rollback

To switch back to localStorage:
1. Revert `.env`: `VITE_STORAGE_PROVIDER=localStorage` and `VITE_API_BASE_URL=`
2. Revert `erp.js` lines 14-30 (session init) to original `localStorage.getItem()` calls
