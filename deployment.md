# Nexfra ERP — Deployment Guide

## Build

```bash
npm run build
```

Output is in `dist/`:
- `dist/index.html` — Public landing page
- `dist/erp.html` — Internal ERP control panel
- `dist/assets/` — Bundled JS, CSS, images

## Vercel Deployment (Recommended)

### Quick Deploy

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel --prod`

The `vercel.json` at project root configures:
- Framework detection: disabled (static SPA)
- Rewrites all routes to `index.html` for SPA support
- Sets `Content-Type` headers for JavaScript modules

### Environment Variables

Set in Vercel dashboard → Project → Settings → Environment Variables:

| Variable | Production Value | Purpose |
|---|---|---|
| `VITE_APP_ENV` | `production` | Disables dev features, console logs |
| `VITE_STORAGE_PROVIDER` | `localStorage` | Keep `localStorage` until backend is built |
| `VITE_ENABLE_QUICK_LOGIN` | `false` | Hides dev quick-login buttons |
| `VITE_ENABLE_RESET_DATA` | `false` | Hides reset test data buttons |
| `VITE_ENABLE_DEMO_ACCOUNTS` | `false` | Hides demo account features |

## Other Hosting

Deploy the `dist/` directory to any static host (Netlify, Cloudflare Pages, GitHub Pages, Nginx, Apache).

## Feature Flags

Development-only features are gated by `CONFIG.FEATURE_FLAGS` in `src/config.js`:

| Flag | Dev Behavior | Production Behavior |
|---|---|---|
| `DEVELOPMENT` | `true` | `false` |
| `ENABLE_QUICK_LOGIN` | Role selector visible | Hidden |
| `ENABLE_RESET_DATA` | Reset button visible | Hidden/disabled |
| `ENABLE_CONSOLE_LOGS` | console.log preserved | Dropped by terser |
| `ENABLE_DEMO_ACCOUNTS` | Demo accounts available | Hidden |

## Switching to API Backend

1. Set `VITE_STORAGE_PROVIDER=api` and `VITE_API_BASE_URL=<your-backend-url>`
2. Implement the `ApiProvider` methods in `src/storage/ApiProvider.js`
3. Each service (`src/services/`) is already async — no UI changes needed
