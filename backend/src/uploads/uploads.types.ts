export interface UploadResult {
  path: string;
  url: string;
  bucket: string;
  size: number;
  mimeType: string;
}

export interface SignedUrlResult {
  signedUrl: string;
  path: string;
  bucket: string;
  expiresIn: number;
}

export interface UploadFileInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface DeleteFileResult {
  path: string;
  bucket: string;
  deleted: boolean;
}

export interface BucketFile {
  name: string;
  id: string;
  updatedAt: string;
  createdAt: string;
  lastAccessedAt: string;
  size: number;
  metadata: Record<string, unknown>;
}

export type UploadBucket = 'quotation-pdfs' | 'attachments' | 'company-assets';
