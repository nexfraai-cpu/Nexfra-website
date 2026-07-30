import { Router } from 'express';
import { auth } from '../middleware/auth.js';

export const customersRouter = Router();

customersRouter.use(auth);

// GET    /api/customers           — List customers
// GET    /api/customers/:id       — Get customer with details
// POST   /api/customers           — Create customer
// PUT    /api/customers/:id       — Update customer
// DELETE /api/customers/:id       — Soft-delete customer
