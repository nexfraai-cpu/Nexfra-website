import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { AdminController } from './admin.controller.js';

export const adminRouter = Router();
const controller = new AdminController();

adminRouter.use(auth);
adminRouter.use(authorize('admin'));

// POST /api/admin/reset & /api/admin/reset-dev-data — Development-only reset endpoint
adminRouter.post('/reset', (req, res) => controller.resetDevData(req, res));
adminRouter.post('/reset-dev-data', (req, res) => controller.resetDevData(req, res));
