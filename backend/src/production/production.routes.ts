import { Router } from 'express';
import { auth } from '../middleware/auth.js';

export const productionRouter = Router();

productionRouter.use(auth);

// GET    /api/production                 — List production items
// PATCH  /api/production/:id/stage       — Update production stage
// POST   /api/production/:id/chassis     — Add chassis record
// GET    /api/production/:id/chassis     — Get chassis records for item
