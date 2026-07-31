import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { WorkordersService } from './workorders.service.js';
import { WorkOrderQueries } from './workorders.queries.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import {
  WorkOrderNotFoundError,
  WorkOrderNotOpenError,
  QuotationNotApprovedError,
  WorkOrderAlreadyExistsError,
} from './workorders.errors.js';

jest.mock('../database/client', () => ({
  supabase: { from: jest.fn(() => ({ insert: jest.fn(() => ({ error: null })) })) },
}));

function createMockWO(overrides: Record<string, any> = {}) {
  return {
    id: 'wo-1111-1111-1111-1111',
    work_order_number: 'WO-000001',
    version: 1,
    quotation_id: 'q-1111-1111-1111-1111',
    customer_name: 'Sharma Fabricators',
    product_name: 'trailer flatbed',
    specifications: {},
    dimensions: { length: '40 Feet' },
    colour: null,
    quantity: 2,
    factory_notes: null,
    due_date: null,
    is_urgent: false,
    status: 'Open',
    booked_by: 'actor-uuid-1',
    approved_by: null,
    created_at: '2026-07-30T10:00:00Z',
    updated_at: '2026-07-30T10:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

function createMockQuotation(overrides: Record<string, any> = {}) {
  return {
    id: 'q-1111-1111-1111-1111',
    quotation_number: 'JP/2026/000001',
    customer_name: 'Sharma Fabricators',
    product_key: 'trailer',
    template_key: 'flatbed',
    order_qty: 2,
    scope_of_work: 'Fabrication',
    dimensions: { length: '40 Feet' },
    status: 'Approved',
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
    findQuotationById: jest.fn<any>(),
    findExistingByQuotation: jest.fn<any>(),
    findProductionItems: jest.fn<any>(),
    createProductionItem: jest.fn<any>(),
    createStageRecord: jest.fn<any>(),
  };
}

describe('WorkordersService', () => {
  let queries: ReturnType<typeof createMockQueries>;
  let service: WorkordersService;
  const actor: AuthenticatedUser = {
    id: 'actor-uuid-1',
    authId: 'auth-uuid-1',
    role: 'admin',
    email: 'admin@nexfra.in',
    name: 'Test Admin',
    employeeNumber: 'EMP-001',
  };
  const otherActor: AuthenticatedUser = { ...actor, id: 'other-actor' };

  beforeEach(() => {
    queries = createMockQueries();
    service = new WorkordersService(queries as unknown as WorkOrderQueries);
  });

  describe('list', () => {
    it('returns paginated work orders', async () => {
      const rows = [createMockWO(), createMockWO({ id: 'id-2', work_order_number: 'WO-000002' })];
      queries.findAll.mockResolvedValue({ data: rows, total: 2 });

      const result = await service.list({ page: 1, perPage: 20 }, actor);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.data[0].workOrderNumber).toBe('WO-000001');
    });
  });

  describe('getById', () => {
    it('returns work order with production items', async () => {
      const wo = createMockWO();
      queries.findById.mockResolvedValue(wo);
      queries.findProductionItems.mockResolvedValue([
        { id: 'pi-1', current_stage: 'Pending', started_at: null, completed_at: null },
      ]);

      const result = await service.getById(wo.id, actor);

      expect(result.workOrderNumber).toBe('WO-000001');
      expect(result.productionItems).toHaveLength(1);
      expect(result.productionItems[0].currentStage).toBe('Pending');
    });

    it('throws WorkOrderNotFoundError when missing', async () => {
      queries.findById.mockResolvedValue(null);
      await expect(service.getById('bad', actor)).rejects.toThrow(WorkOrderNotFoundError);
    });
  });

  describe('create', () => {
    const input = { quotationId: 'q-1111-1111-1111-1111' };

    it('creates work order from approved quotation', async () => {
      queries.findQuotationById.mockResolvedValue(createMockQuotation());
      queries.findExistingByQuotation.mockResolvedValue(null);
      queries.create.mockResolvedValue(createMockWO());
      queries.createProductionItem.mockResolvedValue({ id: 'pi-1' });
      queries.createStageRecord.mockResolvedValue({ id: 'sr-1' });
      queries.findProductionItems.mockResolvedValue([
        { id: 'pi-1', current_stage: 'Pending', started_at: null, completed_at: null },
      ]);

      const result = await service.create(input, actor);

      expect(queries.create).toHaveBeenCalled();
      expect(queries.createProductionItem).toHaveBeenCalledTimes(2); // order_qty = 2
      expect(result.workOrderNumber).toBe('WO-000001');
    });

    it('throws QuotationNotApprovedError', async () => {
      queries.findQuotationById.mockResolvedValue(createMockQuotation({ status: 'Draft' }));
      await expect(service.create(input, actor)).rejects.toThrow(QuotationNotApprovedError);
    });

    it('throws WorkOrderAlreadyExistsError', async () => {
      queries.findQuotationById.mockResolvedValue(createMockQuotation());
      queries.findExistingByQuotation.mockResolvedValue({ id: 'existing-wo' });
      await expect(service.create(input, actor)).rejects.toThrow(WorkOrderAlreadyExistsError);
    });
  });

  describe('update', () => {
    it('updates an open work order', async () => {
      const wo = createMockWO();
      queries.findById.mockResolvedValue(wo);
      queries.update.mockResolvedValue({ ...wo, factory_notes: 'Updated notes' });
      queries.findProductionItems.mockResolvedValue([]);

      const result = await service.update(wo.id, { factoryNotes: 'Updated notes' }, actor);
      expect(result.factoryNotes).toBe('Updated notes');
    });

    it('throws WorkOrderNotOpenError', async () => {
      queries.findById.mockResolvedValue(createMockWO({ status: 'Completed' }));
      await expect(service.update('id', {}, actor)).rejects.toThrow(WorkOrderNotOpenError);
    });
  });

  describe('setDueDate', () => {
    it('sets due date on work order', async () => {
      const wo = createMockWO();
      queries.findById.mockResolvedValue(wo);
      queries.update.mockResolvedValue({ ...wo, due_date: '2026-09-01' });
      queries.findProductionItems.mockResolvedValue([]);

      const result = await service.setDueDate(wo.id, '2026-09-01', actor);
      expect(result.dueDate).toBe('2026-09-01');
    });
  });

  describe('toggleUrgent', () => {
    it('toggles urgent flag', async () => {
      const wo = createMockWO();
      queries.findById.mockResolvedValue(wo);
      queries.update.mockResolvedValue({ ...wo, is_urgent: true });
      queries.findProductionItems.mockResolvedValue([]);

      const result = await service.toggleUrgent(wo.id, actor);
      expect(result.isUrgent).toBe(true);
    });
  });

  describe('softDelete', () => {
    it('deletes an open work order', async () => {
      const wo = createMockWO();
      queries.findById.mockResolvedValue(wo);
      queries.softDelete.mockResolvedValue(undefined);

      await service.softDelete(wo.id, otherActor);
      expect(queries.softDelete).toHaveBeenCalledWith(wo.id, otherActor);
    });

    it('throws WorkOrderNotOpenError', async () => {
      queries.findById.mockResolvedValue(createMockWO({ status: 'Completed' }));
      await expect(service.softDelete('id', actor)).rejects.toThrow(WorkOrderNotOpenError);
    });
  });
});
