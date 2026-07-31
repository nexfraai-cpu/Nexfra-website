import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CustomersService } from './customers.service.js';
import { CustomerQueries } from './customers.queries.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import {
  CustomerNotFoundError,
  CustomerGstConflictError,
  InvalidPaginationError,
} from './customers.errors.js';

jest.mock('../database/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ error: null })),
    })),
  },
}));

function createMockCustomer(overrides: Record<string, any> = {}) {
  return {
    id: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
    customer_number: 'CUS-000001',
    name: 'Ravi Sharma',
    company: 'Sharma Fabricators',
    gst: '27AABCU1234D1Z1',
    phone: '+91-9876543210',
    email: 'ravi@sharmafab.in',
    address: '123 Industrial Area, Mumbai',
    vehicles: [{ registration: 'MH-01-AB-1234', type: 'Truck' }],
    outstanding: 150000,
    created_at: '2026-01-15T08:00:00Z',
    created_by: 'actor-uuid-1',
    updated_at: '2026-07-30T10:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

function createMockQueries() {
  return {
    findAll: jest.fn<any>(),
    findById: jest.fn<any>(),
    findByGst: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
    softDelete: jest.fn<any>(),
  };
}

describe('CustomersService', () => {
  let queries: ReturnType<typeof createMockQueries>;
  let service: CustomersService;
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
    service = new CustomersService(queries as unknown as CustomerQueries);
  });

  describe('list', () => {
    const defaultOptions = { page: 1, perPage: 20 };

    it('returns paginated customers', async () => {
      const customers = [createMockCustomer(), createMockCustomer({ id: 'id-2', email: 'info@test.in' })];
      queries.findAll.mockResolvedValue({ data: customers, total: 2 });

      const result = await service.list(defaultOptions, actor);

      expect(queries.findAll).toHaveBeenCalledWith(defaultOptions, actor);
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.perPage).toBe(20);
      expect(result.meta.totalPages).toBe(1);
      expect(result.data[0].customerNumber).toBe('CUS-000001');
      expect(result.data[0].name).toBe('Ravi Sharma');
    });

    it('passes search and filter params to queries', async () => {
      queries.findAll.mockResolvedValue({ data: [], total: 0 });
      await service.list({ ...defaultOptions, search: 'Sharma', company: 'Fabricators' }, actor);
      expect(queries.findAll).toHaveBeenCalledWith({
        page: 1, perPage: 20, search: 'Sharma', company: 'Fabricators',
      }, actor);
    });

    it('throws InvalidPaginationError for invalid page', async () => {
      await expect(service.list({ page: 0, perPage: 20 }, actor)).rejects.toThrow(InvalidPaginationError);
    });

    it('throws InvalidPaginationError for invalid perPage', async () => {
      await expect(service.list({ page: 1, perPage: 101 }, actor)).rejects.toThrow(InvalidPaginationError);
    });
  });

  describe('getById', () => {
    it('returns customer when found', async () => {
      const c = createMockCustomer();
      queries.findById.mockResolvedValue(c);

      const result = await service.getById(c.id, actor);

      expect(result.id).toBe(c.id);
      expect(result.name).toBe(c.name);
      expect(result.company).toBe(c.company);
    });

    it('throws CustomerNotFoundError when soft-deleted', async () => {
      queries.findById.mockResolvedValue(createMockCustomer({ deleted_at: '2026-07-31T00:00:00Z' }));
      await expect(service.getById('any-id', actor)).rejects.toThrow(CustomerNotFoundError);
    });

    it('throws CustomerNotFoundError when missing', async () => {
      queries.findById.mockResolvedValue(null);
      await expect(service.getById('bad-id', actor)).rejects.toThrow(CustomerNotFoundError);
    });
  });

  describe('create', () => {
    const createInput = {
      name: 'New Customer',
      company: 'New Company Pvt Ltd',
      phone: '+91-1111111111',
    };

    it('creates customer successfully', async () => {
      queries.findByGst.mockResolvedValue(null);
      queries.create.mockResolvedValue(
        createMockCustomer({ name: 'New Customer', company: 'New Company Pvt Ltd' }),
      );

      const result = await service.create(createInput, actor);

      expect(queries.findByGst).not.toHaveBeenCalled(); // no GST in input
      expect(queries.create).toHaveBeenCalledWith({
        name: 'New Customer',
        company: 'New Company Pvt Ltd',
        gst: null,
        phone: '+91-1111111111',
        email: null,
        address: null,
        vehicles: [],
        created_by: actor.id,
        updated_by: actor.id,
      });
      expect(result.name).toBe('New Customer');
    });

    it('checks GST uniqueness when gst provided', async () => {
      queries.findByGst.mockResolvedValue(createMockCustomer());

      await expect(
        service.create({ ...createInput, gst: '27AABCU1234D1Z1' }, actor),
      ).rejects.toThrow(CustomerGstConflictError);
      expect(queries.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates customer fields', async () => {
      const c = createMockCustomer();
      queries.findById.mockResolvedValue(c);
      queries.update.mockResolvedValue({ ...c, name: 'Updated Name', phone: '+91-9999999999' });

      const result = await service.update(c.id, { name: 'Updated Name', phone: '+91-9999999999' }, actor);

      expect(queries.update).toHaveBeenCalledWith(c.id, {
        name: 'Updated Name',
        phone: '+91-9999999999',
        updated_by: actor.id,
      }, actor);
      expect(result.name).toBe('Updated Name');
    });

    it('checks GST uniqueness on update when gst changes', async () => {
      const c = createMockCustomer({ gst: null });
      queries.findById.mockResolvedValue(c);
      queries.findByGst.mockResolvedValue(createMockCustomer());

      await expect(
        service.update(c.id, { gst: '27AABCU1234D1Z1' }, actor),
      ).rejects.toThrow(CustomerGstConflictError);
    });

    it('returns existing when no updates (empty input)', async () => {
      const c = createMockCustomer();
      queries.findById.mockResolvedValue(c);

      const result = await service.update(c.id, {}, actor);

      expect(result.id).toBe(c.id);
      expect(queries.update).not.toHaveBeenCalled();
    });

    it('throws CustomerNotFoundError when missing', async () => {
      queries.findById.mockResolvedValue(null);
      await expect(service.update('bad-id', { name: 'X' }, actor)).rejects.toThrow(CustomerNotFoundError);
    });
  });

  describe('softDelete', () => {
    it('soft-deletes customer', async () => {
      const c = createMockCustomer();
      queries.findById.mockResolvedValue(c);
      queries.softDelete.mockResolvedValue(undefined);

      await service.softDelete(c.id, actor);

      expect(queries.softDelete).toHaveBeenCalledWith(c.id, actor);
    });

    it('throws CustomerNotFoundError when already deleted', async () => {
      queries.findById.mockResolvedValue(null);
      await expect(service.softDelete('bad-id', actor)).rejects.toThrow(CustomerNotFoundError);
    });

    it('throws CustomerNotFoundError when already soft-deleted', async () => {
      queries.findById.mockResolvedValue(createMockCustomer({ deleted_at: '2026-07-31T00:00:00Z' }));
      await expect(service.softDelete('any-id', actor)).rejects.toThrow(CustomerNotFoundError);
    });
  });
});
