import { Router } from 'express';
import { auth } from '../middleware/auth.js';

export const quotationsRouter = Router();

quotationsRouter.use(auth);

// GET    /api/quotations                   — List quotations (role-filtered)
// GET    /api/quotations/:id               — Get quotation with specs + custom items
// POST   /api/quotations                   — Create quotation
// PUT    /api/quotations/:id               — Update quotation
// DELETE /api/quotations/:id               — Delete draft quotation
// PATCH  /api/quotations/:id/approve       — Approve quotation
// PATCH  /api/quotations/:id/deny          — Deny quotation
