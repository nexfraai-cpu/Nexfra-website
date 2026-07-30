import { Router } from 'express';
import { auth } from '../middleware/auth.js';

export const workordersRouter = Router();

workordersRouter.use(auth);

// GET    /api/work-orders               — List work orders
// GET    /api/work-orders/:id           — Get work order details
// POST   /api/work-orders               — Create from approved quotation
// PUT    /api/work-orders/:id           — Update work order
// PATCH  /api/work-orders/:id/due-date  — Set due date
// PATCH  /api/work-orders/:id/urgent    — Toggle urgent flag
