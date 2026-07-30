import { AppError } from '../middleware/error-handler.js';

export class FileTooLargeError extends AppError {
  constructor(size: number, maxSize: number) {
    super(413, `File size ${size} bytes exceeds maximum of ${maxSize} bytes`);
  }
}

export class InvalidMimeTypeError extends AppError {
  constructor(mimeType: string, allowed: string[]) {
    super(400, `File type '${mimeType}' is not allowed. Allowed types: ${allowed.join(', ')}`);
  }
}

export class FileNotFoundError extends AppError {
  constructor(path: string, bucket: string) {
    super(404, `File '${path}' not found in bucket '${bucket}'`);
  }
}

export class BucketNotFoundError extends AppError {
  constructor(bucket: string) {
    super(404, `Storage bucket '${bucket}' not found`);
  }
}

export class StorageUploadError extends AppError {
  constructor(message: string) {
    super(500, `Storage upload failed: ${message}`);
  }
}

export class StorageDeleteError extends AppError {
  constructor(message: string) {
    super(500, `Storage delete failed: ${message}`);
  }
}

export class QuotationNotFoundError extends AppError {
  constructor(id: string) {
    super(404, `Quotation '${id}' not found`);
  }
}
