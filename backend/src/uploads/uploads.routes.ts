import { Router } from 'express';
import { auth } from '../middleware/auth.js';

export const uploadsRouter = Router();

uploadsRouter.use(auth);

// POST /api/uploads/quotations/:id/pdf   — Upload quotation PDF
// POST /api/uploads/attachments          — Upload private attachment
// GET  /api/uploads/:bucket/:path        — Get signed URL for download
