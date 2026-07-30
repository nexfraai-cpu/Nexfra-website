import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UploadsService } from './uploads.service.js';
import { StorageService } from './storage.js';
import { QuotationNotFoundError } from './uploads.errors.js';

function mockAuditLogInsert() {
  return { error: null };
}

function mockFrom(table: string) {
  if (table === 'audit_logs') {
    return { insert: jest.fn<any>().mockReturnValue(mockAuditLogInsert()) };
  }
  return {
    select: jest.fn<any>().mockReturnValue({
      eq: jest.fn<any>().mockReturnValue({
        is: jest.fn<any>().mockReturnValue({
          maybeSingle: jest.fn<any>().mockReturnValue({ data: { id: 'q-1111' }, error: null }),
        }),
      }),
    }),
  };
}

jest.mock('../database/client', () => ({
  supabase: {
    from: jest.fn<any>((table: string) => mockFrom(table)),
  },
}));

function createMockStorage() {
  return {
    upload: jest.fn<any>(),
    getSignedUrl: jest.fn<any>(),
    getPublicUrl: jest.fn<any>(),
    delete: jest.fn<any>(),
    list: jest.fn<any>(),
    getQuotationPdfPath: jest.fn<any>(),
  };
}

function createMockFile(overrides: Record<string, any> = {}) {
  return {
    buffer: Buffer.from('fake-pdf-content'),
    originalname: 'document.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    ...overrides,
  };
}

describe('UploadsService', () => {
  let storage: ReturnType<typeof createMockStorage>;
  let service: UploadsService;
  const actorId = 'actor-uuid-1';

  beforeEach(() => {
    storage = createMockStorage();
    service = new UploadsService(storage as unknown as StorageService);
  });

  describe('uploadQuotationPdf', () => {
    it('uploads a PDF for a valid quotation', async () => {
      storage.upload.mockResolvedValue({
        path: 'quotations/q-1111.pdf',
        url: 'https://example.com/quotation-pdfs/quotations/q-1111.pdf',
        bucket: 'quotation-pdfs',
        size: 1024,
        mimeType: 'application/pdf',
      });

      const result = await service.uploadQuotationPdf('q-1111', createMockFile(), actorId);

      expect(storage.upload).toHaveBeenCalled();
      expect(result.path).toBe('quotations/q-1111.pdf');
      expect(result.bucket).toBe('quotation-pdfs');
    });

    it('throws QuotationNotFoundError for invalid quotation', async () => {
      const { supabase } = require('../database/client');
      supabase.from.mockReturnValueOnce({
        select: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockReturnValue({
            is: jest.fn<any>().mockReturnValue({
              maybeSingle: jest.fn<any>().mockReturnValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      await expect(
        service.uploadQuotationPdf('bad-id', createMockFile(), actorId),
      ).rejects.toThrow(QuotationNotFoundError);
    });
  });

  describe('uploadAttachment', () => {
    it('uploads an attachment with UUID path', async () => {
      storage.upload.mockResolvedValue({
        path: `attachments/${actorId}/some-uuid.pdf`,
        url: 'https://example.com/attachments/...',
        bucket: 'attachments',
        size: 2048,
        mimeType: 'image/png',
      });

      const file = createMockFile({ mimetype: 'image/png', size: 2048 });
      const result = await service.uploadAttachment(file, actorId);

      expect(storage.upload).toHaveBeenCalled();
      expect(result.bucket).toBe('attachments');
      expect(result.path).toContain(`attachments/${actorId}/`);
    });
  });

  describe('uploadAsset', () => {
    it('uploads a company asset with category', async () => {
      storage.upload.mockResolvedValue({
        path: 'assets/logos/some-uuid.png',
        url: 'https://example.com/company-assets/assets/logos/...',
        bucket: 'company-assets',
        size: 5120,
        mimeType: 'image/png',
      });

      const file = createMockFile({ mimetype: 'image/png', originalname: 'logo.png' });
      const result = await service.uploadAsset(file, 'logos', actorId);

      expect(storage.upload).toHaveBeenCalled();
      expect(result.bucket).toBe('company-assets');
      expect(result.path).toContain('assets/logos/');
    });

    it('uploads a company asset without category', async () => {
      storage.upload.mockResolvedValue({
        path: 'assets/some-uuid.svg',
        url: 'https://example.com/company-assets/assets/...',
        bucket: 'company-assets',
        size: 3000,
        mimeType: 'image/svg+xml',
      });

      const file = createMockFile({ mimetype: 'image/svg+xml', originalname: 'icon.svg' });
      const result = await service.uploadAsset(file, undefined, actorId);

      expect(result.path).toContain('assets/');
      expect(result.path).not.toContain('assets/assets/');
    });
  });

  describe('getSignedUrl', () => {
    it('returns a signed URL for private files', async () => {
      storage.getSignedUrl.mockResolvedValue({
        signedUrl: 'https://example.com/signed/...',
        path: 'attachments/actor/file.pdf',
        bucket: 'attachments',
        expiresIn: 3600,
      });

      const result = await service.getSignedUrl('attachments', 'attachments/actor/file.pdf', actorId);

      expect(storage.getSignedUrl).toHaveBeenCalledWith('attachments', 'attachments/actor/file.pdf', 3600);
      expect(result.signedUrl).toContain('signed');
    });
  });

  describe('deleteFile', () => {
    it('deletes a file from storage', async () => {
      storage.delete.mockResolvedValue({
        path: 'quotations/q-1111.pdf',
        bucket: 'quotation-pdfs',
        deleted: true,
      });

      const result = await service.deleteFile('quotation-pdfs', 'quotations/q-1111.pdf', actorId);

      expect(storage.delete).toHaveBeenCalledWith('quotation-pdfs', 'quotations/q-1111.pdf');
      expect(result.deleted).toBe(true);
    });
  });

  describe('listBucket', () => {
    it('lists files in a bucket', async () => {
      storage.list.mockResolvedValue([
        { name: 'file1.pdf', id: 'id-1', updatedAt: '2026-07-30T10:00:00Z', createdAt: '2026-07-30T10:00:00Z', lastAccessedAt: '', size: 1024, metadata: {} },
        { name: 'file2.pdf', id: 'id-2', updatedAt: '2026-07-30T11:00:00Z', createdAt: '2026-07-30T11:00:00Z', lastAccessedAt: '', size: 2048, metadata: {} },
      ]);

      const result = await service.listBucket('quotation-pdfs', undefined, actorId);

      expect(storage.list).toHaveBeenCalledWith('quotation-pdfs', undefined);
      expect(result).toHaveLength(2);
    });
  });

  describe('getQuotationPdfSignedUrl', () => {
    it('returns signed URL when PDF exists', async () => {
      storage.getQuotationPdfPath.mockResolvedValue('quotations/q-1111.pdf');
      storage.getSignedUrl.mockResolvedValue({
        signedUrl: 'https://example.com/signed/...',
        path: 'quotations/q-1111.pdf',
        bucket: 'quotation-pdfs',
        expiresIn: 3600,
      });

      const result = await service.getQuotationPdfSignedUrl('q-1111', actorId);

      expect(result).not.toBeNull();
      expect(result!.path).toBe('quotations/q-1111.pdf');
    });

    it('returns null when no PDF exists', async () => {
      storage.getQuotationPdfPath.mockResolvedValue(null);

      const result = await service.getQuotationPdfSignedUrl('q-1111', actorId);

      expect(result).toBeNull();
    });
  });
});
