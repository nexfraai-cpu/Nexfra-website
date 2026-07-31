import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { QuotationsService } from './quotations.service.js';
import { QuotationQueries } from './quotations.queries.js';
import { AuthenticatedUser } from '../middleware/auth.js';

describe('Quotation Single Source of Truth & Fail-Fast Save Audit', () => {
  const actor: AuthenticatedUser = {
    id: 'user-uuid-1',
    authId: 'auth-uuid-1',
    role: 'sales',
    email: 'sales@nexfra.in',
    name: 'Sales Rep',
    employeeNumber: 'EMP-001',
  };

  let mockQueries: any;
  let service: QuotationsService;

  beforeEach(() => {
    mockQueries = {
      create: jest.fn<any>(),
      replaceSpecValues: jest.fn<any>().mockResolvedValue([]),
      replaceCustomItems: jest.fn<any>().mockResolvedValue([]),
      findSpecValues: jest.fn<any>().mockResolvedValue([]),
      findCustomItems: jest.fn<any>().mockResolvedValue([]),
      findTemplateBasePrice: jest.fn<any>().mockResolvedValue(500000),
      findSpecPriceDiffs: jest.fn<any>().mockResolvedValue({}),
      findAppSettings: jest.fn<any>().mockResolvedValue({}),
      getNextSequenceForYear: jest.fn<any>().mockResolvedValue(1),
    };
    service = new QuotationsService(mockQueries as unknown as QuotationQueries);
  });

  it('1. Execution trace: POST /api/quotations receives payload, inserts into Supabase, and returns created quotation with UUID and quotation_number', async () => {
    const mockDbRow = {
      id: '0003bb84-495c-4f95-b248-4882f2b48121',
      quotation_number: 'JP/2026/000001',
      customer_name: 'John Pork',
      total: 500000,
      status: 'Draft',
    };
    mockQueries.create.mockResolvedValue(mockDbRow);

    const result = await service.create({ customerName: 'John Pork' }, actor);

    expect(mockQueries.create).toHaveBeenCalled();
    expect(result.quotationNumber).toBe('JP/2026/000001');
    expect(result.id).toBe('0003bb84-495c-4f95-b248-4882f2b48121');
  });

  it('2. If POST fails: Service throws error immediately without returning a quote object', async () => {
    mockQueries.create.mockRejectedValue(new Error('Postgres insert failed: duplicate key constraint'));

    await expect(service.create({ customerName: 'John Pork' }, actor)).rejects.toThrow('Postgres insert failed');
  });
});
