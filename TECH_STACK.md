# Nexfra ERP — Technology Stack

## Frontend

### Choice Summary

| Technology | Version | Purpose | Justification |
|---|---|---|---|
| **Vanilla JavaScript** | ES2022 | Application logic | No framework dependency; full control over performance; team proficiency |
| **Vite** | 5.x | Bundler + dev server | Fastest build tool; native ESM in dev; terser plugin; multi-page app support |
| **Terser** | ^5.31 | Minification | Drops console/debugger in production; tree-shaking; small bundle |
| **CSS Custom Properties** | — | Design system tokens | Runtime themeability; no preprocessor needed; native browser support |
| **html2pdf.js** | ^0.10.1 | PDF generation | Wraps html2canvas + jspdf; single dependency for quotation PDFs |
| **GSAP** | ^3.12 | Animations | Scroll-triggered reveals; lightweight; no jQuery dependency |

### Why No Framework?

- **Zero churn**: Avoid breaking changes from framework upgrades
- **Minimal bundle**: No React/Vue runtime overhead (~40 KB vs ~200 KB+)
- **Full control**: Direct DOM access for PDF rendering (html2pdf requires real DOM elements)
- **Team capability**: The codebase is accessible to any JavaScript developer without framework training
- **ERP-specific**: Quotation wizard and production tracking have unique state patterns that don't benefit from virtual DOM diffing

### Why Vite?

- **Native ESM**: No bundling needed in development — instant hot module replacement
- **Terser integration**: Built-in minification plugin
- **Multi-page**: Supports `index.html` + `erp.html` as separate entry points
- **Fast builds**: Sub-second HMR, <5 second production builds
- **Zero config**: Works out of the box for vanilla JS projects

### Why html2pdf.js?

- **All-in-one**: Wraps html2canvas (DOM→canvas) + jspdf (canvas→PDF) in a single library
- **Style support**: Respects CSS styles, including flexbox and grid
- **Image embedding**: Handles logo and product images in PDF output
- **Browser maturity**: Works in Chrome, Firefox, Safari (all modern browsers)

---

## Backend (Planned)

### Choice Summary

| Technology | Version | Purpose | Justification |
|---|---|---|---|
| **Node.js** | 20 LTS | Runtime | Same language as frontend; excellent async I/O for API |
| **Express.js** | 4.x | Web framework | Most popular Node.js framework; vast middleware ecosystem; team familiarity |
| **@supabase/supabase-js** | ^2.x | Database + Auth client | Official Supabase SDK; integrates PostgreSQL, Auth, and Storage |
| **jsonwebtoken** | ^9.x | JWT handling | Standard for Supabase Auth token validation |
| **helmet** | ^7.x | Security headers | CSP, HSTS, X-Frame-Options, and other security headers |
| **cors** | ^2.x | Cross-origin requests | Allows frontend on different domain to access API |
| **express-rate-limit** | ^7.x | Rate limiting | Prevents brute force and DoS attacks |
| **morgan** | ^1.x | HTTP request logging | Standard request logger for Express |

### Why Express?

- **Ecosystem**: Largest middleware collection of any Node.js framework
- **Simplicity**: Minimal abstraction over HTTP; easy to understand and debug
- **Documentation**: Extensive community resources and examples
- **Supabase integration**: Well-documented patterns for Express + Supabase

### Why Supabase?

- **PostgreSQL**: Full relational database with all the features needed (RLS, views, triggers, enums, sequences)
- **Built-in Auth**: Email/password, magic links, OAuth providers — no custom auth server needed
- **Row-Level Security**: Database-level authorization that works even if API layer is bypassed
- **Storage**: S3-compatible file storage with RLS policies
- **Realtime**: Built-in WebSocket support for future real-time features
- **Cost**: Generous free tier; predictable Pro pricing at $25/month
- **Self-hostable**: Can migrate to self-hosted Supabase if needed

---

## Database

| Technology | Version | Justification |
|---|---|---|
| **PostgreSQL** | 15+ | Mature relational database; JSON support; array types; full-text search |
| **Supabase** | — | Managed PostgreSQL with Auth, Storage, Realtime, and Dashboard |

### Why PostgreSQL?

- **Mature**: 30+ years of development; battle-tested for ERP workloads
- **Features**: Enums, sequences, views, triggers, RLS, full-text search, JSON/JSONB
- **ACID**: Transactional integrity for financial data
- **Extensions**: pgcrypto, uuid-ossp, postgis (if needed later)
- **Ecosystem**: Supabase, pgAdmin, DBeaver, Prisma, Knex

---

## Deployment

| Platform | Purpose | Justification | Cost |
|---|---|---|---|
| **Vercel** | Frontend hosting | Free for small projects; automatic deploys from GitHub; global CDN | Free tier |
| **Supabase** | Database + Auth | Managed PostgreSQL; built-in auth; backup/restore | $25/mo (Pro) |
| **Render / Railway** | API server (planned) | Simple deploy from GitHub; auto-scaling; SSL | $5-10/mo |

### Why Vercel?

- **Zero configuration**: Works with Vite out of the box
- **Global CDN**: Fast page loads worldwide
- **Automatic deploys**: Every GitHub push → deployment
- **Preview URLs**: Every branch gets a unique preview URL
- **Custom domains**: Supports multiple domains on one project
- **Free tier**: 100 GB bandwidth, 6000 build minutes/month (ample for this project)

### Why Not a Monolith?

The frontend, API, and database are separate layers deployed independently. This enables:
- **Independent scaling**: Frontend scales via CDN, API scales horizontally
- **Independent development**: Frontend and API can be developed and tested separately
- **Independent deployment**: Frontend updates don't require API restarts
- **Cost optimization**: Frontend on free Vercel tier, API on small instance

---

## Development Tools

| Tool | Purpose | Justification |
|---|---|---|
| **npm** | Package management | Standard for Node.js projects; lockfile for reproducible builds |
| **Git + GitHub** | Version control | Industry standard; Vercel integration |
| **VSCode** | Editor | Lightweight; excellent JavaScript support |
| **Postman / Bruno** | API testing | For testing planned backend endpoints |
| **DBeaver** | Database GUI | Free PostgreSQL client for schema inspection |
| **Supabase CLI** | Local database | Run Supabase locally for migration development |

## Version Compatibility

| Layer | Tech | Version |
|---|---|---|
| Runtime | Node.js | 20 LTS (min 18) |
| Frontend build | Vite | 5.x |
| Frontend bundling | Terser | ^5.31 |
| Database | PostgreSQL | 15+ |
| Backend (planned) | Express | 4.x |
| Supabase SDK (planned) | @supabase/supabase-js | ^2.x |

## Bundle Size Analysis

```
app.js (public site):
  - Total (minified): ~25 KB
  - Third-party: GSAP (~15 KB)
  - Application code: ~10 KB

erp.js (ERP control panel):
  - Total (minified + gzipped): ~100 KB
  - Third-party: html2pdf.js bundle (~30 KB), GSAP (~15 KB)
  - Application code: ~55 KB
  - Minification: terser drops console.log + debugger statements
```
