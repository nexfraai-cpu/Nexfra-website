import { supabase } from '../database/client.js';
import { config } from '../config/index.js';
import { BucketNotFoundError, StorageUploadError, StorageDeleteError } from './uploads.errors.js';
import { UploadResult, SignedUrlResult, DeleteFileResult, BucketFile, UploadFileInput } from './uploads.types.js';
import { logger } from '../config/logger.js';

export class StorageService {
  async upload(
    bucket: string,
    path: string,
    file: UploadFileInput,
    upsert = true,
  ): Promise<UploadResult> {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert,
        cacheControl: '3600',
      });

    if (error) {
      if (error.message?.includes('bucket')) throw new BucketNotFoundError(bucket);
      throw new StorageUploadError(error.message);
    }

    const url = this.getPublicUrl(bucket, path);

    logger.info({ bucket, path, size: file.size }, 'File uploaded');
    return { path, url, bucket, size: file.size, mimeType: file.mimetype };
  }

  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<SignedUrlResult> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      logger.error({ error, bucket, path }, 'Failed to create signed URL');
      throw new StorageUploadError(error.message);
    }

    return { signedUrl: data.signedUrl, path, bucket, expiresIn };
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async delete(bucket: string, path: string): Promise<DeleteFileResult> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      logger.error({ error, bucket, path }, 'Failed to delete file');
      throw new StorageDeleteError(error.message);
    }

    logger.info({ bucket, path }, 'File deleted');
    return { path, bucket, deleted: true };
  }

  async list(bucket: string, folder?: string): Promise<BucketFile[]> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder ?? '', { sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
      if (error.message?.includes('bucket')) throw new BucketNotFoundError(bucket);
      throw error;
    }

    return (data ?? []).map((f: any) => ({
      name: f.name,
      id: f.id,
      updatedAt: f.updated_at,
      createdAt: f.created_at,
      lastAccessedAt: f.last_accessed_at,
      size: f.metadata?.size ?? 0,
      metadata: f.metadata ?? {},
    }));
  }

  async getQuotationPdfPath(quotationId: string): Promise<string | null> {
    const bucket = config.storageBucketQuotations;
    const prefix = `quotations/`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, {
        search: quotationId,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) return null;
    const match = (data ?? []).find((f: any) => f.name.includes(quotationId));
    return match ? `${prefix}${match.name}` : null;
  }
}

export const storageService = new StorageService();
