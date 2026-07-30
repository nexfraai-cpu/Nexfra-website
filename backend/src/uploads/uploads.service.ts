import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../database/client.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { StorageService } from './storage.js';
import {
  UploadResult,
  SignedUrlResult,
  DeleteFileResult,
  BucketFile,
} from './uploads.types.js';
import { QuotationNotFoundError } from './uploads.errors.js';

export class UploadsService {
  constructor(private storage: StorageService) {}

  async uploadQuotationPdf(
    quotationId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    actorId: string,
  ): Promise<UploadResult> {
    const { data: quotation } = await supabase
      .from('quotations')
      .select('id')
      .eq('id', quotationId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!quotation) throw new QuotationNotFoundError(quotationId);

    const ext = file.originalname.split('.').pop() || 'pdf';
    const path = `quotations/${quotationId}.${ext}`;
    const bucket = config.storageBucketQuotations;

    const result = await this.storage.upload(bucket, path, file);

    await this._logAudit(actorId, 'create', 'quotation-pdf', path, null, {
      quotationId, bucket, path, size: file.size,
    });

    logger.info({ actorId, quotationId, path }, 'Quotation PDF uploaded');
    return result;
  }

  async uploadAttachment(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    actorId: string,
  ): Promise<UploadResult> {
    const ext = file.originalname.split('.').pop() || 'bin';
    const uniqueName = `${uuidv4()}.${ext}`;
    const path = `attachments/${actorId}/${uniqueName}`;
    const bucket = config.storageBucketAttachments;

    const result = await this.storage.upload(bucket, path, file);

    await this._logAudit(actorId, 'create', 'attachment', path, null, {
      bucket, path, size: file.size, originalName: file.originalname,
    });

    logger.info({ actorId, path }, 'Attachment uploaded');
    return result;
  }

  async uploadAsset(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    category: string | undefined,
    actorId: string,
  ): Promise<UploadResult> {
    const ext = file.originalname.split('.').pop() || 'bin';
    const uniqueName = `${uuidv4()}.${ext}`;
    const folder = category ? `assets/${category}` : 'assets';
    const path = `${folder}/${uniqueName}`;
    const bucket = config.storageBucketAssets;

    const result = await this.storage.upload(bucket, path, file);

    await this._logAudit(actorId, 'create', 'company-asset', path, null, {
      bucket, path, size: file.size, category: category ?? null, originalName: file.originalname,
    });

    logger.info({ actorId, path, category }, 'Company asset uploaded');
    return result;
  }

  async getSignedUrl(
    bucket: string,
    path: string,
    actorId: string,
    expiresIn = 3600,
  ): Promise<SignedUrlResult> {
    const result = await this.storage.getSignedUrl(bucket, path, expiresIn);
    logger.info({ actorId, bucket, path }, 'Signed URL generated');
    return result;
  }

  async deleteFile(
    bucket: string,
    path: string,
    actorId: string,
  ): Promise<DeleteFileResult> {
    const result = await this.storage.delete(bucket, path);

    await this._logAudit(actorId, 'delete', 'file', path, { bucket, path }, { deleted: true });

    logger.info({ actorId, bucket, path }, 'File deleted');
    return result;
  }

  async listBucket(
    bucket: string,
    folder: string | undefined,
    actorId: string,
  ): Promise<BucketFile[]> {
    const files = await this.storage.list(bucket, folder);
    logger.info({ actorId, bucket, count: files.length }, 'Bucket files listed');
    return files;
  }

  async getQuotationPdfSignedUrl(
    quotationId: string,
    actorId: string,
  ): Promise<SignedUrlResult | null> {
    const path = await this.storage.getQuotationPdfPath(quotationId);
    if (!path) return null;
    return this.getSignedUrl(config.storageBucketQuotations, path, actorId);
  }

  private async _logAudit(actorId: string, action: string, entityType: string, entityId: string, oldValue: unknown, newValue: unknown) {
    const { error } = await supabase.from('audit_logs').insert({
      employee_id: actorId, action, entity_type: entityType, entity_id: entityId,
      description: `${action} ${entityType}`,
      metadata: { old: oldValue, new: newValue },
    });
    if (error) logger.error({ error, action, entityId }, 'Audit log insertion failed');
  }
}
