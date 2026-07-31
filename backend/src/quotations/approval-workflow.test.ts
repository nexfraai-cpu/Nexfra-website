import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { QuotationsService } from './quotations.service.js';
import { QuotationQueries } from './quotations.queries.js';
import { WorkordersService } from '../workorders/workorders.service.js';
import { WorkOrderQueries } from '../workorders/workorders.queries.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import {
  QuotationNotPendingError,
  QuotationAlreadyApprovedError,
} from './quotations.errors.js';
import { QuotationNotApprovedError } from '../workorders/workorders.errors.js';

jest.mock('../database/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ error: null })),
    })),
  },
}));

function createMockQuotation(overrides: Record<string, any> = {}) {
  return {
    id: 'q-uuid-1111-2222-3333',
    quotation_number: 'JP/2026/000001',
    version: 1,
    customer_id: 'c-uuid-1',
    customer_name: 'Test Customer',
    product_key: 'trailer',
    template_key: 'flatbed',
    total: 500000,
    order_qty: 1,
    status: 'Pending',
    created_by: 'sales-uuid-1',
    created_at: '2026-07-30T10:00:00Z',
    updated_at: '2026-07-30T10:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

function createMockWO(overrides: Record<string, any> = {}) {
  return {
    id: 'wo-uuid-1',
    work_order_number: 'WO-000001',
    version: 1,
    quotation_id: 'q-uuid-1111-2222-3333',
    customer_name: 'Test Customer',
    product_name: 'trailer flatbed',
    quantity: 1,
    status: 'Open',
    ...overrides,
  };
}

describe('Approval Workflow & Transactional Integration', () => {
  let quoteQueries: any;
  let quoteService: QuotationsService;
  let woQueries: any;
  let woService: WorkordersService;

  const adminUser: AuthenticatedUser = {
    id: 'admin-uuid-1',
    authId: 'auth-admin-1',
    role: 'admin',
    email: 'admin@nexfra.in',
    name: 'Admin User',
    employeeNumber: 'EMP-001',
  };

  beforeEach(() => {
    quoteQueries = {
      findById: jest.fn<any>(),
      update: jest.fn<any>(),
      findSpecValues: jest.fn<any>().mockResolvedValue([]),
      findCustomItems: jest.fn<any>().mockResolvedValue([]),
    };
    quoteService = new QuotationsService(quoteQueries as unknown as QuotationQueries);

    woQueries = {
      findQuotationById: jest.fn<any>(),
      findExistingByQuotation: jest.fn<any>().mockResolvedValue(null),
      create: jest.fn<any>().mockResolvedValue(createMockWO()),
      createProductionItem: jest.fn<any>().mockResolvedValue({ id: 'pi-1' }),
      createStageRecord: jest.fn<any>().mockResolvedValue({ id: 'sr-1' }),
      findProductionItems: jest.fn<any>().mockResolvedValue([]),
    };
    woService = new WorkordersService(woQueries as unknown as WorkOrderQueries);
  });

  describe('Approval Comment Formats', () => {
    it('approves with no comment (undefined)', async () => {
      const q = createMockQuotation({ status: 'Pending' });
      quoteQueries.findById.mockResolvedValue(q);
      quoteQueries.update.mockResolvedValue({ ...q, status: 'Approved', approved_by: adminUser.id });

      const result = await quoteService.approve(q.id, undefined, adminUser);

      expect(quoteQueries.update).toHaveBeenCalledWith(
        q.id,
        expect.objectContaining({ status: 'Approved', approved_by: adminUser.id }),
        adminUser,
      );
      expect(result.status).toBe('Approved');
    });

    it('approves with empty string comment', async () => {
      const q = createMockQuotation({ status: 'Pending' });
      quoteQueries.findById.mockResolvedValue(q);
      quoteQueries.update.mockResolvedValue({ ...q, status: 'Approved', approved_by: adminUser.id });

      const result = await quoteService.approve(q.id, '', adminUser);

      expect(result.status).toBe('Approved');
      expect(quoteQueries.update).toHaveBeenCalled();
    });

    it('approves with text comment', async () => {
      const q = createMockQuotation({ status: 'Pending' });
      quoteQueries.findById.mockResolvedValue(q);
      quoteQueries.update.mockResolvedValue({ ...q, status: 'Approved', approved_by: adminUser.id });

      const result = await quoteService.approve(q.id, 'Approved by Board', adminUser);

      expect(result.status).toBe('Approved');
    });
  });

  describe('Approval Transactionality & Work Order Creation', () => {
    it('fails approval when quotation is Draft (not Pending)', async () => {
      const q = createMockQuotation({ status: 'Draft' });
      quoteQueries.findById.mockResolvedValue(q);

      await expect(quoteService.approve(q.id, 'Comment', adminUser)).rejects.toThrow(QuotationNotPendingError);
      expect(quoteQueries.update).not.toHaveBeenCalled();
    });

    it('fails approval when quotation is already Approved', async () => {
      const q = createMockQuotation({ status: 'Approved' });
      quoteQueries.findById.mockResolvedValue(q);

      await expect(quoteService.approve(q.id, 'Comment', adminUser)).rejects.toThrow(QuotationAlreadyApprovedError);
      expect(quoteQueries.update).not.toHaveBeenCalled();
    });

    it('creates work order transactionally after successful approval', async () => {
      const dbRecord = createMockQuotation({ status: 'Pending' });
      quoteQueries.findById.mockResolvedValue(dbRecord);

      // Step 1: Approve quotation
      quoteQueries.update.mockImplementation(async () => {
        dbRecord.status = 'Approved';
        return dbRecord;
      });

      const approved = await quoteService.approve(dbRecord.id, 'Approved', adminUser);
      expect(approved.status).toBe('Approved');
      expect(dbRecord.status).toBe('Approved');

      // Step 2: Create work order for the newly approved quotation
      woQueries.findQuotationById.mockResolvedValue(dbRecord);
      const wo = await woService.create({ quotationId: dbRecord.id }, adminUser);

      expect(wo.workOrderNumber).toBe('WO-000001');
      expect(woQueries.create).toHaveBeenCalled();
    });

    it('never creates work order when approval fails', async () => {
      const dbRecord = createMockQuotation({ status: 'Draft' });
      quoteQueries.findById.mockResolvedValue(dbRecord);

      // Step 1: Attempt to approve quotation (fails)
      let approvalError: any = null;
      try {
        await quoteService.approve(dbRecord.id, 'Comment', adminUser);
      } catch (err) {
        approvalError = err;
      }

      expect(approvalError).toBeInstanceOf(QuotationNotPendingError);

      // Step 2: Verify work order creation is blocked because quotation remains Draft
      woQueries.findQuotationById.mockResolvedValue(dbRecord);
      await expect(woService.create({ quotationId: dbRecord.id }, adminUser)).rejects.toThrow(QuotationNotApprovedError);
      expect(woQueries.create).not.toHaveBeenCalled();
    });
  });
});
