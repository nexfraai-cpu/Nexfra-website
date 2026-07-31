import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ProductionService } from './production.service.js';
import { ProductionQueries } from './production.queries.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import {
  ProductionItemNotFoundError,
  InvalidStageTransitionError,
  ProductionItemAlreadyCompletedError,
  ChassisRecordNotFoundError,
} from './production.errors.js';

jest.mock('../database/client', () => ({
  supabase: { from: jest.fn(() => ({ insert: jest.fn(() => ({ error: null })),
    upsert: jest.fn(() => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) })) })) },
}));

function createMockItem(overrides: Record<string, any> = {}) {
  return {
    id: 'pi-1111-1111-1111-1111',
    work_order_id: 'wo-1111-1111-1111-1111',
    quotation_id: 'q-1111-1111-1111-1111',
    current_stage: 'Pending',
    stage_progress: {},
    dispatch_fields: {},
    started_at: null,
    completed_at: null,
    created_at: '2026-07-30T10:00:00Z',
    updated_at: '2026-07-30T10:00:00Z',
    deleted_at: null,
    work_orders: { customer_name: 'Sharma Fabricators', product_name: 'trailer flatbed', work_order_number: 'WO-000001' },
    ...overrides,
  };
}

function createMockStageRecord(overrides: Record<string, any> = {}) {
  return {
    id: 'sr-1111-1111-1111-1111',
    production_item_id: 'pi-1111-1111-1111-1111',
    stage_key: 'Pending',
    stage_name: 'Pending',
    is_completed: false,
    completed_by: null,
    completed_at: null,
    remark: null,
    created_at: '2026-07-30T10:00:00Z',
    ...overrides,
  };
}

function createMockChassis(overrides: Record<string, any> = {}) {
  return {
    id: 'ch-1111-1111-1111-1111',
    work_order_id: 'wo-1111-1111-1111-1111',
    customer_id: null,
    field: 'Truck',
    brand: 'Tata',
    model: 'LPT 3118',
    chassis_number: 'TATA12345',
    arrival_date: '2026-08-01',
    customer_name: 'Sharma Fabricators',
    product_name: 'trailer flatbed',
    notes: null,
    created_by: 'actor-uuid-1',
    created_at: '2026-07-30T10:00:00Z',
    updated_at: '2026-07-30T10:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

function createMockQueries() {
  return {
    findAll: jest.fn<any>(),
    findById: jest.fn<any>(),
    update: jest.fn<any>(),
    findStageRecords: jest.fn<any>(),
    upsertStageRecord: jest.fn<any>(),
    createStageRecord: jest.fn<any>(),
    findChassisRecordsByItem: jest.fn<any>(),
    createChassisRecord: jest.fn<any>(),
    findChassisRecordById: jest.fn<any>(),
    updateChassisRecord: jest.fn<any>(),
    findWorkOrderById: jest.fn<any>(),
    findCustomerById: jest.fn<any>(),
  };
}

describe('ProductionService', () => {
  let queries: ReturnType<typeof createMockQueries>;
  let service: ProductionService;
  const actor: AuthenticatedUser = {
    id: 'actor-uuid-1',
    authId: 'auth-uuid-1',
    role: 'admin',
    email: 'admin@nexfra.in',
    name: 'Test Admin',
    employeeNumber: 'EMP-001',
  };

  beforeEach(() => {
    queries = createMockQueries();
    service = new ProductionService(queries as unknown as ProductionQueries);
  });

  describe('list', () => {
    it('returns paginated production items', async () => {
      const rows = [createMockItem(), createMockItem({ id: 'pi-2' })];
      queries.findAll.mockResolvedValue({ data: rows, total: 2 });

      const result = await service.list({ page: 1, perPage: 20 }, actor);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.data[0].currentStage).toBe('Pending');
      expect(result.data[0].customerName).toBe('Sharma Fabricators');
    });
  });

  describe('getById', () => {
    it('returns item with stage and chassis records', async () => {
      const item = createMockItem();
      queries.findById.mockResolvedValue(item);
      queries.findStageRecords.mockResolvedValue([createMockStageRecord()]);
      queries.findChassisRecordsByItem.mockResolvedValue([createMockChassis()]);

      const result = await service.getById(item.id, actor);

      expect(result.currentStage).toBe('Pending');
      expect(result.stageRecords).toHaveLength(1);
      expect(result.chassisRecords).toHaveLength(1);
      expect(result.chassisRecords[0].chassisNumber).toBe('TATA12345');
    });

    it('throws ProductionItemNotFoundError', async () => {
      queries.findById.mockResolvedValue(null);
      await expect(service.getById('bad', actor)).rejects.toThrow(ProductionItemNotFoundError);
    });
  });

  describe('advanceStage', () => {
    it('advances to the next stage automatically', async () => {
      const item = createMockItem();
      queries.findById.mockResolvedValue(item);
      queries.upsertStageRecord.mockResolvedValue(createMockStageRecord({ stage_key: 'Material Ordered' }));
      queries.update.mockResolvedValue({ ...item, current_stage: 'Material Ordered', stage_progress: { 'Material Ordered': expect.any(String) } });
      queries.findStageRecords.mockResolvedValue([createMockStageRecord(), createMockStageRecord({ stage_key: 'Material Ordered' })]);
      queries.findChassisRecordsByItem.mockResolvedValue([]);

      const result = await service.advanceStage(item.id, {}, actor);

      expect(result.currentStage).toBe('Material Ordered');
    });

    it('advances to a specified stage', async () => {
      const item = createMockItem();
      queries.findById.mockResolvedValue(item);
      queries.upsertStageRecord.mockResolvedValue(createMockStageRecord({ stage_key: 'Cutting' }));
      queries.update.mockResolvedValue({ ...item, current_stage: 'Cutting' });
      queries.findStageRecords.mockResolvedValue([]);
      queries.findChassisRecordsByItem.mockResolvedValue([]);

      const result = await service.advanceStage(item.id, { stageKey: 'Cutting' }, actor);

      expect(result.currentStage).toBe('Cutting');
    });

    it('throws ProductionItemAlreadyCompletedError when Delivered', async () => {
      queries.findById.mockResolvedValue(createMockItem({ current_stage: 'Delivered' }));
      await expect(service.advanceStage('id', {}, actor)).rejects.toThrow(ProductionItemAlreadyCompletedError);
    });

    it('throws InvalidStageTransitionError for non-existent stage', async () => {
      queries.findById.mockResolvedValue(createMockItem());
      await expect(service.advanceStage('id', { stageKey: 'NonExistent' }, actor)).rejects.toThrow(InvalidStageTransitionError);
    });

    it('throws InvalidStageTransitionError for previous stage', async () => {
      const item = createMockItem({ current_stage: 'Cutting' });
      queries.findById.mockResolvedValue(item);
      await expect(service.advanceStage('id', { stageKey: 'Pending' }, actor)).rejects.toThrow(InvalidStageTransitionError);
    });
  });

  describe('addChassis', () => {
    it('adds chassis record to production item', async () => {
      const item = createMockItem();
      queries.findById.mockResolvedValue(item);
      queries.findWorkOrderById.mockResolvedValue({ customer_name: 'Sharma Fabricators', product_name: 'trailer flatbed' });
      queries.createChassisRecord.mockResolvedValue(createMockChassis());

      const result = await service.addChassis(item.id, { chassisNumber: 'TATA12345', brand: 'Tata' }, actor);

      expect(result.chassisNumber).toBe('TATA12345');
      expect(result.brand).toBe('Tata');
    });
  });

  describe('updateChassis', () => {
    it('updates chassis record fields', async () => {
      const chassis = createMockChassis();
      queries.findChassisRecordById.mockResolvedValue(chassis);
      queries.updateChassisRecord.mockResolvedValue({ ...chassis, chassis_number: 'NEW123' });

      const result = await service.updateChassis('pi-id', chassis.id, { chassisNumber: 'NEW123' }, actor);

      expect(result.chassisNumber).toBe('NEW123');
    });

    it('throws ChassisRecordNotFoundError', async () => {
      queries.findChassisRecordById.mockResolvedValue(null);
      await expect(service.updateChassis('pi-id', 'bad', {}, actor)).rejects.toThrow(ChassisRecordNotFoundError);
    });
  });

  describe('getChassisRecords', () => {
    it('returns chassis records for item', async () => {
      const item = createMockItem();
      queries.findById.mockResolvedValue(item);
      queries.findChassisRecordsByItem.mockResolvedValue([createMockChassis()]);

      const result = await service.getChassisRecords(item.id, actor);

      expect(result).toHaveLength(1);
      expect(result[0].chassisNumber).toBe('TATA12345');
    });
  });

  describe('update', () => {
    it('updates dispatch fields', async () => {
      const item = createMockItem();
      queries.findById.mockResolvedValue(item);
      queries.update.mockResolvedValue({ ...item, dispatch_fields: { driver: 'Raj' } });

      const result = await service.update(item.id, { dispatchFields: { driver: 'Raj' } }, actor);

      expect(result.dispatchFields).toEqual({ driver: 'Raj' });
    });
  });
});
