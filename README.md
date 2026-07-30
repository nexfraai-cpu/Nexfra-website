# Nexfra Manufacturing — Website & Internal ERP System

Corporate website and internal ERP for Nexfra Manufacturing India Pvt. Ltd., built with vanilla JavaScript and Vite.

## Quick Start

```bash
npm install
npm run dev        # Dev server at localhost:3000
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

## Architecture

```
src/
  config.js              # Central config (env vars, feature flags)
  dev-data.js            # Default demo data (seeds empty state)
  storage/
    StorageProvider.js   # Abstract storage interface
    LocalStorageProvider.js  # localStorage implementation
    ApiProvider.js       # API backend stub
    index.js             # Factory: getStorageProvider()
  services/
    BaseService.js       # Shared state loading + activity logging
    AuthenticationService.js  # Login/logout/session (singleton)
    EmployeeService.js
    CustomerService.js
    ProductService.js
    QuotationService.js
    WorkOrderService.js
    FinanceService.js
    AdminService.js
  utils/
    Logger.js            # Console logging with feature flag
    ErrorHandler.js      # AppError, ValidationError, etc.

app.js                   # Public landing page (ES module)
erp.js                   # Internal ERP control panel (ES module)
```

## Key Design Decisions

- **No framework** — vanilla JS + Vite for simplicity and fast iteration
- **Storage abstraction** — `StorageProvider` interface; swap `localStorage` → API without UI changes
- **Service layer** — all data access through async service classes; UI never touches localStorage directly
- **Feature flags** — dev features (quick login, reset data, console logs) gated by `VITE_APP_ENV`
- **Production safety** — terser drops `console.*` in production builds

## Environment Variables

See `.env.example` for available variables.

## Deployment

See `deployment.md` for Vercel and other hosting instructions.
