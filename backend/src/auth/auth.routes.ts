import { Router } from 'express';
import { auth } from '../middleware/auth.js';

export const authRouter = Router();

// POST /api/auth/login    — Authenticate, return JWT
// POST /api/auth/logout   — Invalidate session
// GET  /api/auth/me       — Get current user profile
