import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

export const adminRouter = Router();

adminRouter.use(auth);
adminRouter.use(authorize('admin'));

// GET    /api/admin/pricing       — Get pricing coefficients
// PUT    /api/admin/pricing       — Update pricing coefficients
// GET    /api/admin/products      — Get custom product definitions
// PUT    /api/admin/products      — Update product definitions
// GET    /api/admin/logs          — Get audit logs
// POST   /api/admin/reset         — Reset system data (dev only)
