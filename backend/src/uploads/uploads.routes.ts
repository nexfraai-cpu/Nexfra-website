import { Router } from 'express';
import { UploadsController } from './uploads.controller.js';
import { UploadsService } from './uploads.service.js';
import { StorageService } from './storage.js';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  quotationPdfUpload, attachmentUpload, assetUpload,
  quotationIdSchema,
} from './uploads.validator.js';

const storage = new StorageService();
const service = new UploadsService(storage);
const controller = new UploadsController(service);

export const uploadsRouter = Router();

uploadsRouter.use(auth);

// Quotation PDFs — admin and sales can upload
uploadsRouter.post(
  '/quotations/:id/pdf',
  authorize('admin', 'sales'),
  validate(quotationIdSchema),
  quotationPdfUpload.single('file'),
  controller.uploadQuotationPdf,
);

// Get signed URL for quotation PDF
uploadsRouter.get(
  '/quotations/:id/pdf',
  authorize('admin', 'finance', 'manager', 'sales'),
  validate(quotationIdSchema),
  controller.getQuotationPdf,
);

// Attachments — all authenticated roles
uploadsRouter.post(
  '/attachments',
  attachmentUpload.single('file'),
  controller.uploadAttachment,
);

// Company Assets — admin only
uploadsRouter.post(
  '/assets',
  authorize('admin'),
  assetUpload.single('file'),
  controller.uploadAsset,
);

// Signed URL for private files
uploadsRouter.get(
  '/signed/:bucket/*',
  authorize('admin', 'finance', 'manager', 'sales'),
  controller.getSignedUrl,
);

// Delete file — admin only
uploadsRouter.delete(
  '/:bucket/*',
  authorize('admin'),
  controller.deleteFile,
);

// List bucket contents
uploadsRouter.get(
  '/list/:bucket',
  authorize('admin'),
  controller.listBucket,
);
