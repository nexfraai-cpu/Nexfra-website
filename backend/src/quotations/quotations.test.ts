import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { QuotationsService } from './quotations.service.js';
import { QuotationQueries } from './quotations.queries.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import {
  QuotationNotFoundError,
  QuotationNotDraftError,
  InvalidStatusTransitionError,
  QuotationAlreadyApprovedError,
  QuotationAlreadyDeniedError,
  QuotationNotPendingError,
  QuotationNotApprovedError,
  QuotationAlreadyClaimedError,
  DenyReasonRequiredError,
  TemplatePricingNotFoundError,
} from './quotations.errors.js';

jest.mock('../database/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ error: null })),
    })),
  },
}));

function createMockQuotation(overrides: Record<string, any> = {}) {
  return {
    id: 'q1111111-1111-1111-1111-111111111111',
    quotation_number: 'JP/2026/000001',
    version: 1,
    customer_id: 'c1111111-1111-1111-1111-111111111111',
    customer_name: 'Sharma Fabricators',
    customer_details: { gst: '27AABCU1234D1Z1' },
    product_key: 'trailer',
    template_key: 'flatbed',
    capacity: '40 Ton',
    dimensions: { length: '40 Feet', width: '98 Inches' },
    total: 850000,
    manual_total: null,
    gst_rate: 18,
    order_qty: 1,
    status: 'Draft',
    terms: ['Term 1'],
    scope_of_work: 'Fabrication of flat bed trailer',
    bank_details: { bankName: 'ICICI' },
    notes: null,
    approved_by: null,
    approved_at: null,
    denied_by: null,
    denied_at: null,
    denied_reason: null,
    created_by: 'actor-uuid-1',
    created_at: '2026-07-30T10:00:00Z',
    updated_at: '2026-07-30T10:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

function createMockSpecValue(overrides: Record<string, any> = {}) {
  return {
    id: 'sv1111111-1111-1111-1111-111111111111',
    quotation_id: 'q1111111-1111-1111-1111-111111111111',
    spec_key: 'deck_length',
    spec_name: 'Deck Length',
    section: 'Body',
    selected_value: '32 Feet',
    custom_description: null,
    custom_price: null,
    is_not_required: false,
    effective_price_diff: 0,
    ...overrides,
  };
}

function createMockCustomItem(overrides: Record<string, any> = {}) {
  return {
    id: 'ci1111111-1111-1111-1111-111111111111',
    quotation_id: 'q1111111-1111-1111-1111-111111111111',
    name: 'Extra LED Lighting',
    description: 'Additional LED strip lighting',
    quantity: 2,
    price: 5000,
    sort_order: 0,
    created_at: '2026-07-30T10:00:00Z',
    ...overrides,
  };
}

function createMockQueries() {
  return {
    findAll: jest.fn<any>(),
    findById: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
    softDelete: jest.fn<any>(),
    findSpecValues: jest.fn<any>(),
    replaceSpecValues: jest.fn<any>(),
    findCustomItems: jest.fn<any>(),
    replaceCustomItems: jest.fn<any>(),
    findTemplateBasePrice: jest.fn<any>(),
    findSpecPriceDiffs: jest.fn<any>(),
    findAppSettings: jest.fn<any>(),
  };
}

describe('QuotationsService', () => {
  let queries: ReturnType<typeof createMockQueries>;
  let service: QuotationsService;
  const actorId = 'actor-uuid-1';
  const actor: AuthenticatedUser = {
    id: actorId,
    authId: 'auth-uuid-1',
    role: 'admin',
    email: 'admin@nexfra.in',
    name: 'Test Admin',
    employeeNumber: 'EMP-001',
  };

  beforeEach(() => {
    queries = createMockQueries();
    service = new QuotationsService(queries as unknown as QuotationQueries);
  });

  describe('list', () => {
    const defaultOptions = { page: 1, perPage: 20 };

    it('returns paginated quotations', async () => {
      const rows = [
        createMockQuotation(),
        createMockQuotation({ id: 'id-2', quotation_number: 'JP/2026/000002' }),
      ];
      queries.findAll.mockResolvedValue({ data: rows, total: 2 });

      const result = await service.list(defaultOptions, actor);

      expect(queries.findAll).toHaveBeenCalledWith(defaultOptions, actor);
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.data[0].quotationNumber).toBe('JP/2026/000001');
      expect(result.data[0].customerName).toBe('Sharma Fabricators');
    });

    it('passes filter params to queries', async () => {
      queries.findAll.mockResolvedValue({ data: [], total: 0 });
      await service.list({ ...defaultOptions, status: 'Draft', search: 'Sharma' }, actor);
      expect(queries.findAll).toHaveBeenCalledWith({
        page: 1, perPage: 20, status: 'Draft', search: 'Sharma',
      }, actor);
    });
  });

  describe('getById', () => {
    it('returns quotation with spec values and custom items', async () => {
      const q = createMockQuotation();
      const sv = createMockSpecValue();
      const ci = createMockCustomItem();
      queries.findById.mockResolvedValue(q);
      queries.findSpecValues.mockResolvedValue([sv]);
      queries.findCustomItems.mockResolvedValue([ci]);

      const result = await service.getById(q.id, actor);

      expect(result.id).toBe(q.id);
      expect(result.quotationNumber).toBe('JP/2026/000001');
      expect(result.specValues).toHaveLength(1);
      expect(result.specValues[0].specKey).toBe('deck_length');
      expect(result.customItems).toHaveLength(1);
      expect(result.customItems[0].name).toBe('Extra LED Lighting');
      expect(result.total).toBe(850000);
    });

    it('throws QuotationNotFoundError when missing', async () => {
      queries.findById.mockResolvedValue(null);
      await expect(service.getById('bad-id', actor)).rejects.toThrow(QuotationNotFoundError);
    });

    it('throws QuotationNotFoundError when deleted', async () => {
      queries.findById.mockResolvedValue(createMockQuotation({ deleted_at: '2026-07-31T00:00:00Z' }));
      await expect(service.getById('any-id', actor)).rejects.toThrow(QuotationNotFoundError);
    });
  });

  describe('create', () => {
    const createInput = {
      customerName: 'New Customer',
      productKey: 'trailer',
      templateKey: 'flatbed',
      specValues: [{ specKey: 'deck_length', selectedValue: '32 Feet' }],
      customItems: [{ name: 'Extra Item', price: 10000 }],
    };

    it('creates quotation with pricing', async () => {
      queries.findTemplateBasePrice.mockResolvedValue(850000);
      queries.create.mockImplementation(async (input: any) =>
        createMockQuotation({ id: 'new-id', total: input.total ?? 850000 }),
      );
      queries.replaceSpecValues.mockResolvedValue([createMockSpecValue()]);
      queries.replaceCustomItems.mockResolvedValue([createMockCustomItem()]);

      const result = await service.create(createInput, actor);

      expect(queries.findTemplateBasePrice).toHaveBeenCalledWith('flatbed');
      expect(queries.create).toHaveBeenCalled();
      expect(queries.replaceSpecValues).toHaveBeenCalled();
      expect(queries.replaceCustomItems).toHaveBeenCalled();
      expect(result.total).toBe(1014800); // (850000 base + 10000 custom) * 1.18 GST = 1014800
    });

    it('creates quotation with manualTotal override', async () => {
      queries.create.mockResolvedValue(createMockQuotation({ id: 'new-id', total: 900000 }));
      queries.replaceSpecValues.mockResolvedValue([]);
      queries.replaceCustomItems.mockResolvedValue([]);

      const result = await service.create({ ...createInput, manualTotal: 900000 }, actor);

      expect(queries.findTemplateBasePrice).not.toHaveBeenCalled();
      expect(result.total).toBe(900000);
    });

    it('persists the previewed total verbatim and does NOT recompute when total is provided', async () => {
      queries.create.mockImplementation(async (input: any) =>
        createMockQuotation({ id: 'new-id', total: input.total }),
      );
      queries.replaceSpecValues.mockResolvedValue([createMockSpecValue()]);
      queries.replaceCustomItems.mockResolvedValue([createMockCustomItem()]);

      const result = await service.create(
        { ...createInput, total: 830000, orderQty: 1, gstRate: 18 },
        actor,
      );

      expect(queries.findTemplateBasePrice).not.toHaveBeenCalled();
      expect(result.total).toBe(830000);
      expect(result.orderQty).toBe(1);
    });

    it('throws TemplatePricingNotFoundError when template missing', async () => {
      queries.findTemplateBasePrice.mockResolvedValue(null);
      await expect(service.create(createInput, actor)).rejects.toThrow(TemplatePricingNotFoundError);
    });
  });

  describe('update', () => {
    it('updates draft quotation with version increment', async () => {
      const q = createMockQuotation();
      queries.findById.mockResolvedValue(q);
      queries.findTemplateBasePrice.mockResolvedValue(850000);
      queries.update.mockResolvedValue({ ...q, total: 900000, version: 2 });
      queries.replaceSpecValues.mockResolvedValue([]);
      queries.replaceCustomItems.mockResolvedValue([]);

      const result = await service.update(q.id, { notes: 'Updated notes' }, actor);

      expect(queries.update).toHaveBeenCalled();
      expect(result.version).toBe(2);
    });

    it('updates a pending quotation', async () => {
      const q = createMockQuotation({ status: 'Pending' });
      queries.findById.mockResolvedValue(q);
      queries.findTemplateBasePrice.mockResolvedValue(850000);
      queries.update.mockResolvedValue({ ...q, total: 900000, version: 2 });
      queries.replaceSpecValues.mockResolvedValue([]);
      queries.replaceCustomItems.mockResolvedValue([]);

      const result = await service.update(q.id, { notes: 'Updated notes' }, actor);

      expect(queries.update).toHaveBeenCalled();
      expect(result.version).toBe(2);
      expect(result.status).toBe('Pending');
    });

    it('updates a rigid load body quotation (rigid30)', async () => {
      const q = createMockQuotation({ template_key: 'rigid30', product_key: 'rigid', manual_total: null });
      queries.findById.mockResolvedValue(q);
      queries.findTemplateBasePrice.mockResolvedValue(420000);
      queries.update.mockResolvedValue({ ...q, total: 420000, version: 2 });
      queries.replaceSpecValues.mockResolvedValue([]);
      queries.replaceCustomItems.mockResolvedValue([]);

      const result = await service.update(q.id, {
        notes: 'Updated rigid quotation',
        manualTotal: null,
        specValues: [{ specKey: 'floor', selectedValue: '5mm (St52)' }],
      }, actor);

      expect(queries.findTemplateBasePrice).toHaveBeenCalledWith('rigid30');
      expect(result.version).toBe(2);
    });

    it('re-saves an unchanged quotation verbatim without recomputing the total', async () => {
      const q = createMockQuotation({ total: 830000 });
      queries.findById.mockResolvedValue(q);
      queries.update.mockImplementation(async (_id: any, updates: any) => ({
        ...q,
        ...updates,
        version: (q as any).version + 1,
      }));
      queries.replaceSpecValues.mockResolvedValue([]);
      queries.replaceCustomItems.mockResolvedValue([]);

      // Background sync re-PUTs the exact same payload that produced the saved quote.
      const result = await service.update(q.id, {
        total: 830000,
        orderQty: 1,
        gstRate: 18,
        specValues: [],
      }, actor);

      expect(queries.findTemplateBasePrice).not.toHaveBeenCalled();
      expect(result.total).toBe(830000);
      expect((queries.update.mock.calls[0][1] as any).total).toBe(830000);
    });

    it('throws QuotationNotDraftError when approved', async () => {
      queries.findById.mockResolvedValue(createMockQuotation({ status: 'Approved' }));
      await expect(service.update('id', { notes: 'x' }, actor)).rejects.toThrow(QuotationNotDraftError);
    });

    it('throws QuotationNotDraftError when denied', async () => {
      queries.findById.mockResolvedValue(createMockQuotation({ status: 'Denied' }));
      await expect(service.update('id', { notes: 'x' }, actor)).rejects.toThrow(QuotationNotDraftError);
    });

    it('preserves unit price on a quantity change by storing the supplied total verbatim', async () => {
      // Existing qty 3, grand total 2006000, manual override absent.
      const q = createMockQuotation({ total: 2006000, order_qty: 3, manual_total: null });
      queries.findById.mockResolvedValue(q);
      queries.findSpecValues.mockResolvedValue([]);
      queries.findCustomItems.mockResolvedValue([]);
      // Editor scales qty 3 -> 1: total = unit(668667) * 1.
      queries.update.mockImplementation(async (_id: any, updates: any) => ({
        ...q, ...updates, order_qty: 1, total: 668667, version: 2,
      }));
      queries.replaceSpecValues.mockResolvedValue([]);
      queries.replaceCustomItems.mockResolvedValue([]);

      const result = await service.update(q.id, {
        manualTotal: null,
        total: 668667,
        orderQty: 1,
      }, actor);

      // Quantity must only multiply the existing unit price; the total must
      // never be re-derived from the template base spec prices.
      expect(queries.findTemplateBasePrice).not.toHaveBeenCalled();
      expect(result.total).toBe(668667);
      expect((queries.update.mock.calls[0][1] as any).total).toBe(668667);
    });

    it('preserves an explicit manual override regardless of quantity', async () => {
      const q = createMockQuotation({ total: 900000, order_qty: 1, manual_total: 900000 });
      queries.findById.mockResolvedValue(q);
      queries.findSpecValues.mockResolvedValue([]);
      queries.findCustomItems.mockResolvedValue([]);
      queries.update.mockImplementation(async (_id: any, updates: any) => ({
        ...q, ...updates, order_qty: 5, total: 900000, version: 2,
      }));
      queries.replaceSpecValues.mockResolvedValue([]);
      queries.replaceCustomItems.mockResolvedValue([]);

      const result = await service.update(q.id, {
        manualTotal: 900000,
        total: 45000000,
        orderQty: 5,
      }, actor);

      expect(result.total).toBe(900000);
      expect((queries.update.mock.calls[0][1] as any).total).toBe(900000);
      expect((queries.update.mock.calls[0][1] as any).manual_total).toBe(900000);
    });
  });

  describe('softDelete', () => {
    it('deletes draft quotation', async () => {
      const q = createMockQuotation();
      queries.findById.mockResolvedValue(q);
      queries.softDelete.mockResolvedValue(undefined);

      await service.softDelete(q.id, actor);

      expect(queries.softDelete).toHaveBeenCalledWith(q.id, actor);
    });

    it('throws QuotationNotDraftError when not draft', async () => {
      queries.findById.mockResolvedValue(createMockQuotation({ status: 'Approved' }));
      await expect(service.softDelete('id', actor)).rejects.toThrow(QuotationNotDraftError);
    });
  });

  describe('submit', () => {
    it('transitions from Draft to Pending', async () => {
      const q = createMockQuotation();
      queries.findById.mockResolvedValue(q);
      queries.update.mockResolvedValue({ ...q, status: 'Pending' });
      queries.findSpecValues.mockResolvedValue([]);
      queries.findCustomItems.mockResolvedValue([]);

      const result = await service.submit(q.id, actor);

      expect(queries.update).toHaveBeenCalledWith(q.id, { status: 'Pending', updated_by: actor.id }, actor);
      expect(result.status).toBe('Pending');
    });

    it('throws InvalidStatusTransitionError when not Draft', async () => {
      queries.findById.mockResolvedValue(createMockQuotation({ status: 'Approved' }));
      await expect(service.submit('id', actor)).rejects.toThrow(InvalidStatusTransitionError);
    });
  });

  describe('approve', () => {
    it('approves a pending quotation', async () => {
      const q = createMockQuotation({ status: 'Pending' });
      queries.findById.mockResolvedValue(q);
      queries.update.mockResolvedValue({ ...q, status: 'Approved', approved_by: actorId });
      queries.findSpecValues.mockResolvedValue([]);
      queries.findCustomItems.mockResolvedValue([]);

      const result = await service.approve(q.id, 'Looks good', actor);

      expect(result.status).toBe('Approved');
    });

    it('throws QuotationAlreadyApprovedError', async () => {
      queries.findById.mockResolvedValue(createMockQuotation({ status: 'Approved' }));
      await expect(service.approve('id', undefined, actor)).rejects.toThrow(QuotationAlreadyApprovedError);
    });

    it('throws QuotationAlreadyDeniedError', async () => {
      queries.findById.mockResolvedValue(createMockQuotation({ status: 'Denied' }));
      await expect(service.approve('id', undefined, actor)).rejects.toThrow(QuotationAlreadyDeniedError);
    });

    it('throws QuotationNotPendingError for Draft', async () => {
      queries.findById.mockResolvedValue(createMockQuotation({ status: 'Draft' }));
      await expect(service.approve('id', undefined, actor)).rejects.toThrow(QuotationNotPendingError);
    });
  });

  describe('deny', () => {
    it('denies a pending quotation', async () => {
      const q = createMockQuotation({ status: 'Pending' });
      queries.findById.mockResolvedValue(q);
      queries.update.mockResolvedValue({
        ...q, status: 'Denied', denied_by: actorId, denied_reason: 'Wrong specs',
      });
      queries.findSpecValues.mockResolvedValue([]);
      queries.findCustomItems.mockResolvedValue([]);

      const result = await service.deny(q.id, 'Wrong specs', actor);

      expect(result.status).toBe('Denied');
    });

    it('throws DenyReasonRequiredError without reason', async () => {
      await expect(service.deny('id', '', actor)).rejects.toThrow(DenyReasonRequiredError);
    });
  });

  describe('claim', () => {
    const financeActor: AuthenticatedUser = {
      id: 'finance-uuid-1',
      authId: 'auth-finance-1',
      role: 'finance',
      email: 'finance@nexfra.in',
      name: 'Finance A',
      employeeNumber: 'FIN-001',
    };

    it('claims an approved, unclaimed quotation and sets payment due date', async () => {
      const q = createMockQuotation({ status: 'Approved', finance_owner: null, payment_due_date: null });
      queries.findById.mockResolvedValue(q);
      queries.update.mockResolvedValue({
        ...q,
        finance_owner: 'finance-uuid-1',
        payment_due_date: '2026-08-15',
      });
      queries.findSpecValues.mockResolvedValue([]);
      queries.findCustomItems.mockResolvedValue([]);

      const result = await service.claim(q.id, '2026-08-15', financeActor);

      expect(result.financeOwner).toBe('finance-uuid-1');
      expect(result.paymentDueDate).toBe('2026-08-15');
      expect(queries.update).toHaveBeenCalledWith(
        q.id,
        expect.objectContaining({ finance_owner: 'finance-uuid-1', payment_due_date: '2026-08-15' }),
        financeActor,
      );
    });

    it('throws QuotationNotApprovedError for non-approved quotation', async () => {
      queries.findById.mockResolvedValue(createMockQuotation({ status: 'Pending' }));
      await expect(service.claim('id', '2026-08-15', financeActor)).rejects.toThrow(QuotationNotApprovedError);
    });

    it('throws QuotationAlreadyClaimedError when claimed by another finance employee', async () => {
      queries.findById.mockResolvedValue(
        createMockQuotation({ status: 'Approved', finance_owner: 'finance-uuid-2' }),
      );
      await expect(service.claim('id', '2026-08-15', financeActor)).rejects.toThrow(QuotationAlreadyClaimedError);
    });

    it('throws QuotationNotFoundError when update returns null (race or unauthorised row)', async () => {
      queries.findById.mockResolvedValue(createMockQuotation({ status: 'Approved', finance_owner: null }));
      queries.update.mockResolvedValue(null);
      await expect(service.claim('id', '2026-08-15', financeActor)).rejects.toThrow(QuotationNotFoundError);
    });

    it('allows admin to reassign an already-claimed quotation', async () => {
      const q = createMockQuotation({ status: 'Approved', finance_owner: 'finance-uuid-2' });
      queries.findById.mockResolvedValue(q);
      queries.update.mockResolvedValue({ ...q, finance_owner: actorId, payment_due_date: '2026-09-01' });
      queries.findSpecValues.mockResolvedValue([]);
      queries.findCustomItems.mockResolvedValue([]);

      const result = await service.claim(q.id, '2026-09-01', actor);

      expect(result.financeOwner).toBe(actorId);
    });
  });
});
