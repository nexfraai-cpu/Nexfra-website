import { Router } from 'express';
import { auth } from '../middleware/auth.js';

export const productsRouter = Router();

productsRouter.use(auth);

// GET /api/products                   — List custom product definitions
// GET /api/products/:key/templates    — Get templates for a product
// GET /api/templates/:key/specs       — Get spec definitions with options
