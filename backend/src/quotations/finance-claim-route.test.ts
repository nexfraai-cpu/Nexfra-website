import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { QuotationsService } from './quotations.service.js';
import { QuotationQueries } from './quotations.queries.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import { claimQuotationSchema } from './quotations.validator.js';

jest.mock('../database/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ error: null })),
    })),
  },
}));

describe('Finance Claim Route & UUID Validation Integration', () => {
  let quoteQueries: any;
  let quoteService: QuotationsService;

  const uuidId = '493d5160-008f-4bac-9ff2-a56976efce35';
  const displayId = 'JP/2026/000010';

  const financeUser: AuthenticatedUser = {
    id: 'finance-uuid-1',
    authId: 'auth-finance-1',
    role: 'finance',
    email: 'finance@nexfra.in',
    name: 'Finance Officer',
    employeeNumber: 'FIN-001',
  };

  beforeEach(() => {
    quoteQueries = {
      findById: jest.fn<any>(),
      update: jest.fn<any>(),
      findSpecValues: jest.fn<any>().mockResolvedValue([]),
      findCustomItems: jest.fn<any>().mockResolvedValue([]),
    };
    quoteService = new QuotationsService(quoteQueries as unknown as QuotationQueries);
  });

  it('validates that route parameter with database UUID succeeds validation', () => {
    const validReq = {
      params: { id: uuidId },
      body: { paymentDueDate: '2026-08-15' },
    };

    const parsed = claimQuotationSchema.safeParse(validReq);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.params.id).toBe(uuidId);
    }
  });

  it('rejects route parameter with quotation_number (JP/2026/000010) with HTTP 400 validation error', () => {
    const invalidReq = {
      params: { id: displayId },
      body: { paymentDueDate: '2026-08-15' },
    };

    const parsed = claimQuotationSchema.safeParse(invalidReq);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      expect(issue.path).toEqual(['params', 'id']);
      expect(issue.message).toBe('Invalid quotation ID format');
    }
  });

  it('executes finance claim API call using database UUID and preserves UI display number', async () => {
    const mockQuotation = {
      id: uuidId,
      quotation_number: displayId,
      status: 'Approved',
      finance_owner: null,
      payment_due_date: null,
    };

    quoteQueries.findById.mockResolvedValue(mockQuotation);
    quoteQueries.update.mockResolvedValue({
      ...mockQuotation,
      finance_owner: financeUser.id,
      payment_due_date: '2026-08-15',
    });

    // 1. API Call uses UUID
    const result = await quoteService.claim(uuidId, '2026-08-15', financeUser);

    // 2. Verified API receives UUID parameter
    expect(quoteQueries.findById).toHaveBeenCalledWith(uuidId, financeUser);
    expect(quoteQueries.update).toHaveBeenCalledWith(
      uuidId,
      expect.objectContaining({ finance_owner: financeUser.id, payment_due_date: '2026-08-15' }),
      financeUser,
    );

    // 3. UI Display string preserved in quotationNumber
    expect(result.id).toBe(uuidId);
    expect(result.quotationNumber).toBe(displayId);
    expect(result.financeOwner).toBe(financeUser.id);
    expect(result.paymentDueDate).toBe('2026-08-15');
  });

  it('completes full Finance Claim flow: select payment date -> click Claim -> send paymentDueDate -> backend receives and claims', async () => {
    const selectedDate = '2026-08-13';

    // 1. Simulate frontend input selection & extraction
    const extractedPayload = {
      quotationId: uuidId,
      paymentDueDate: selectedDate,
    };

    // Log before validation as required by frontend contract
    console.log({ quotationId: extractedPayload.quotationId, paymentDueDate: extractedPayload.paymentDueDate });
    expect(extractedPayload.paymentDueDate).toBe('2026-08-13');
    expect(extractedPayload.paymentDueDate).not.toBe('');
    expect(extractedPayload.paymentDueDate).not.toBeNull();

    // 2. Validate request payload against backend Zod schema
    const reqValidation = claimQuotationSchema.safeParse({
      params: { id: extractedPayload.quotationId },
      body: { paymentDueDate: extractedPayload.paymentDueDate },
    });
    expect(reqValidation.success).toBe(true);

    // 3. Simulate backend DB update
    const mockQuotation = {
      id: uuidId,
      quotation_number: displayId,
      status: 'Approved',
      finance_owner: null,
      payment_due_date: null,
    };

    quoteQueries.findById.mockResolvedValue(mockQuotation);
    quoteQueries.update.mockResolvedValue({
      ...mockQuotation,
      finance_owner: financeUser.id,
      payment_due_date: selectedDate,
    });

    const claimedResponse = await quoteService.claim(extractedPayload.quotationId, extractedPayload.paymentDueDate, financeUser);

    // 4. Assert backend received exact paymentDueDate payload and updated quotation
    expect(quoteQueries.update).toHaveBeenCalledWith(
      uuidId,
      expect.objectContaining({
        finance_owner: financeUser.id,
        payment_due_date: '2026-08-13',
      }),
      financeUser,
    );
    expect(claimedResponse.financeOwner).toBe('finance-uuid-1');
    expect(claimedResponse.paymentDueDate).toBe('2026-08-13');
  });
});
