import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

export const employeesRouter = Router();

employeesRouter.use(auth);
employeesRouter.use(authorize('admin', 'manager'));

// GET    /api/employees                 — List employees
// GET    /api/employees/:id             — Get employee by ID
// POST   /api/employees                 — Create employee
// PUT    /api/employees/:id             — Update employee
// DELETE /api/employees/:id             — Soft-delete employee
// PATCH  /api/employees/:id/status      — Toggle active/disabled
// PATCH  /api/employees/:id/password    — Change password
