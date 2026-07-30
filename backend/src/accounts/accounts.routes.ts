import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

export const accountsRouter = Router();

accountsRouter.use(auth);
accountsRouter.use(authorize('admin', 'finance', 'manager'));

// GET    /api/accounts/sales        — List sales records
// GET    /api/accounts/payments     — List payments
// POST   /api/accounts/sales        — Record a sale
// POST   /api/accounts/payments     — Record a payment
// GET    /api/accounts/stats        — Monthly statistics
