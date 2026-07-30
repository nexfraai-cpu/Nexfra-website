import { z } from 'zod';
import multer from 'multer';
import { config } from '../config/index.js';
import { InvalidMimeTypeError } from './uploads.errors.js';

const BUCKET_MIME_TYPES: Record<string, string[]> = {
  'quotation-pdfs': ['application/pdf'],
  attachments: [
    'image/png', 'image/jpeg', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  'company-assets': [
    'image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'application/pdf',
  ],
};

const BUCKET_SIZE_LIMITS: Record<string, number> = {
  'quotation-pdfs': 10 * 1024 * 1024,
  attachments: 50 * 1024 * 1024,
  'company-assets': 20 * 1024 * 1024,
};

function createMulterUpload(bucket: string) {
  const allowedMimes = BUCKET_MIME_TYPES[bucket] ?? config.allowedMimeTypes;
  const maxSize = BUCKET_SIZE_LIMITS[bucket] ?? config.uploadMaxSize;

  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSize },
    fileFilter: (_req, file, cb) => {
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new InvalidMimeTypeError(file.mimetype, allowedMimes));
      }
    },
  });
}

export const quotationPdfUpload = createMulterUpload('quotation-pdfs');
export const attachmentUpload = createMulterUpload('attachments');
export const assetUpload = createMulterUpload('company-assets');

export const signedUrlSchema = z.object({
  params: z.object({
    bucket: z.enum(['quotation-pdfs', 'attachments', 'company-assets']),
    path: z.string().min(1),
  }),
  query: z.object({
    expiresIn: z.coerce.number().int().min(60).max(86400).optional().default(3600),
  }),
});

export const deleteFileSchema = z.object({
  params: z.object({
    bucket: z.enum(['quotation-pdfs', 'attachments', 'company-assets']),
    path: z.string().min(1),
  }),
});

export const quotationIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const listBucketSchema = z.object({
  query: z.object({
    folder: z.string().optional(),
  }),
  params: z.object({
    bucket: z.enum(['quotation-pdfs', 'attachments', 'company-assets']),
  }),
});

export function validateFile(req: any, _bucket: string): { buffer: Buffer; originalname: string; mimetype: string; size: number } {
  if (!req.file) {
    throw Object.assign(new Error('No file provided'), { statusCode: 400 });
  }
  return {
    buffer: req.file.buffer,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  };
}
