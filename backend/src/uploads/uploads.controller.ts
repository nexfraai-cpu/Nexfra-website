import { Request, Response } from 'express';
import { UploadsService } from './uploads.service.js';
import { asyncWrap } from '../middleware/async-wrap.js';
import { validateFile } from './uploads.validator.js';

export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  uploadQuotationPdf = asyncWrap(async (req: Request, res: Response) => {
    const file = validateFile(req, 'quotation-pdfs');
    const result = await this.uploadsService.uploadQuotationPdf(
      req.params.id, file, req.user!,
    );
    res.status(201).json({ data: result });
  });

  uploadAttachment = asyncWrap(async (req: Request, res: Response) => {
    const file = validateFile(req, 'attachments');
    const result = await this.uploadsService.uploadAttachment(file, req.user!.id);
    res.status(201).json({ data: result });
  });

  uploadAsset = asyncWrap(async (req: Request, res: Response) => {
    const file = validateFile(req, 'company-assets');
    const category = req.body.category as string | undefined;
    const result = await this.uploadsService.uploadAsset(file, category, req.user!.id);
    res.status(201).json({ data: result });
  });

  getSignedUrl = asyncWrap(async (req: Request, res: Response) => {
    const result = await this.uploadsService.getSignedUrl(
      req.params.bucket, req.params.path, req.user!.id,
      Number(req.query.expiresIn) || 3600,
    );
    res.status(200).json({ data: result });
  });

  deleteFile = asyncWrap(async (req: Request, res: Response) => {
    const result = await this.uploadsService.deleteFile(
      req.params.bucket, req.params.path, req.user!.id,
    );
    res.status(200).json({ data: result });
  });

  getQuotationPdf = asyncWrap(async (req: Request, res: Response) => {
    const result = await this.uploadsService.getQuotationPdfSignedUrl(
      req.params.id, req.user!,
    );
    if (!result) {
      res.status(404).json({ error: 'FileNotFound', message: 'No PDF found for this quotation' });
      return;
    }
    res.status(200).json({ data: result });
  });

  listBucket = asyncWrap(async (req: Request, res: Response) => {
    const files = await this.uploadsService.listBucket(
      req.params.bucket,
      req.query.folder as string | undefined,
      req.user!.id,
    );
    res.status(200).json({ data: files });
  });
}
