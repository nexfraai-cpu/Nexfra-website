import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EmployeesService } from './employees.service.js';
import { EmployeeQueries } from './employees.queries.js';
import {
  EmployeeNotFoundError,
  EmployeeEmailConflictError,
  CannotDeleteSelfError,
  CannotDisableSelfError,
  CannotChangeOwnRoleError,
  LastAdminCannotChangeRoleError,
  LastAdminCannotDisableError,
  LastAdminCannotDeleteError,
} from './employees.errors.js';

jest.mock('../database/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ error: null })),
    })),
  },
}));

function createMockEmployee(overrides: Record<string, any> = {}) {
  return {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    auth_id: 'auth-user-id-1',
    employee_number: 'EMP-000001',
    full_name: 'John Doe',
    email: 'john@nexfra.in',
    phone: '+91-9876543210',
    employee_code: 'EMP001',
    role: 'admin',
    status: 'Active',
    last_login_at: '2026-07-30T10:00:00Z',
    created_at: '2026-01-15T08:00:00Z',
    created_by: null,
    updated_at: '2026-07-30T10:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

function createMockQueries() {
  return {
    findAll: jest.fn<any>(),
    findById: jest.fn<any>(),
    findByEmail: jest.fn<any>(),
    countByRole: jest.fn<any>(),
    update: jest.fn<any>(),
    softDelete: jest.fn<any>(),
    createAuthUser: jest.fn<any>(),
    deleteAuthUser: jest.fn<any>(),
    resetAuthUserPassword: jest.fn<any>(),
    generatePasswordResetLink: jest.fn<any>(),
    updateByAuthId: jest.fn<any>(),
  };
}

describe('EmployeesService', () => {
  let queries: ReturnType<typeof createMockQueries>;
  let service: EmployeesService;
  const actorId = 'actor-uuid-1';

  beforeEach(() => {
    queries = createMockQueries();
    service = new EmployeesService(queries as unknown as EmployeeQueries);
  });

  describe('list', () => {
    it('returns all non-deleted employees', async () => {
      const employees = [createMockEmployee(), createMockEmployee({ id: 'id-2', email: 'jane@nexfra.in' })];
      queries.findAll.mockResolvedValue(employees);

      const result = await service.list({}, actorId);

      expect(queries.findAll).toHaveBeenCalledWith({});
      expect(result).toHaveLength(2);
      expect(result[0].fullName).toBe('John Doe');
      expect(result[0].employeeNumber).toBe('EMP-000001');
    });

    it('passes filter options to queries', async () => {
      queries.findAll.mockResolvedValue([]);
      await service.list({ role: 'sales', search: 'Jane' }, actorId);
      expect(queries.findAll).toHaveBeenCalledWith({ role: 'sales', search: 'Jane' });
    });
  });

  describe('getById', () => {
    it('returns employee when found', async () => {
      const emp = createMockEmployee();
      queries.findById.mockResolvedValue(emp);

      const result = await service.getById(emp.id, actorId);

      expect(result.id).toBe(emp.id);
      expect(result.fullName).toBe(emp.full_name);
    });

    it('throws EmployeeNotFoundError when employee is soft-deleted', async () => {
      const emp = createMockEmployee({ deleted_at: '2026-07-31T00:00:00Z' });
      queries.findById.mockResolvedValue(emp);

      await expect(service.getById(emp.id, actorId)).rejects.toThrow(EmployeeNotFoundError);
    });

    it('throws EmployeeNotFoundError when not found', async () => {
      queries.findById.mockResolvedValue(null);

      await expect(service.getById('nonexistent', actorId)).rejects.toThrow(EmployeeNotFoundError);
    });
  });

  describe('create', () => {
    const createInput = {
      fullName: 'New Employee',
      email: 'new@nexfra.in',
      password: 'securePass123',
      role: 'sales' as const,
    };

    it('creates employee successfully', async () => {
      queries.findByEmail.mockResolvedValue(null);
      queries.createAuthUser.mockResolvedValue({
        data: { user: { id: 'new-auth-id' } },
        error: null,
      });
      queries.updateByAuthId.mockResolvedValue(
        createMockEmployee({
          id: 'new-emp-id',
          email: 'new@nexfra.in',
          full_name: 'New Employee',
          role: 'sales',
          employee_number: 'EMP-000002',
          auth_id: 'new-auth-id',
        }),
      );

      const result = await service.create(createInput, actorId);

      expect(queries.findByEmail).toHaveBeenCalledWith('new@nexfra.in');
      expect(queries.createAuthUser).toHaveBeenCalledWith(
        'new@nexfra.in', 'securePass123', 'New Employee', 'sales',
      );
      expect(queries.updateByAuthId).toHaveBeenCalledWith('new-auth-id', {
        phone: null,
        employee_code: null,
        created_by: actorId,
      });
      expect(result.fullName).toBe('New Employee');
    });

    it('throws EmployeeEmailConflictError when email exists', async () => {
      queries.findByEmail.mockResolvedValue(createMockEmployee());

      await expect(service.create(createInput, actorId)).rejects.toThrow(EmployeeEmailConflictError);
      expect(queries.createAuthUser).not.toHaveBeenCalled();
    });

    it('throws on auth user creation failure with duplicate email', async () => {
      queries.findByEmail.mockResolvedValue(null);
      queries.createAuthUser.mockResolvedValue({
        data: null,
        error: { message: 'already registered', code: 'email_exists' },
      });

      await expect(service.create(createInput, actorId)).rejects.toThrow(EmployeeEmailConflictError);
    });
  });

  describe('update', () => {
    it('updates employee fields', async () => {
      const emp = createMockEmployee();
      queries.findById.mockResolvedValue(emp);
      queries.countByRole.mockResolvedValue(2);
      queries.update.mockResolvedValue({ ...emp, full_name: 'Updated Name', phone: '+91-1111111111' });

      const result = await service.update(emp.id, {
        fullName: 'Updated Name',
        phone: '+91-1111111111',
      }, actorId);

      expect(queries.update).toHaveBeenCalledWith(emp.id, {
        full_name: 'Updated Name',
        phone: '+91-1111111111',
      });
      expect(result.fullName).toBe('Updated Name');
    });

    it('throws CannotChangeOwnRoleError when changing own role', async () => {
      const emp = createMockEmployee({ id: actorId });
      queries.findById.mockResolvedValue(emp);

      await expect(service.update(actorId, { role: 'sales' }, actorId))
        .rejects.toThrow(CannotChangeOwnRoleError);
    });

    it('throws LastAdminCannotChangeRoleError when last admin', async () => {
      const emp = createMockEmployee({ role: 'admin' });
      queries.findById.mockResolvedValue(emp);
      queries.countByRole.mockResolvedValue(1);

      await expect(service.update(emp.id, { role: 'sales' }, 'other-actor'))
        .rejects.toThrow(LastAdminCannotChangeRoleError);
    });

    it('returns existing employee when no updates provided', async () => {
      const emp = createMockEmployee();
      queries.findById.mockResolvedValue(emp);

      const result = await service.update(emp.id, {}, actorId);

      expect(queries.update).not.toHaveBeenCalled();
      expect(result.id).toBe(emp.id);
    });
  });

  describe('softDelete', () => {
    it('soft-deletes employee and deletes auth user', async () => {
      const emp = createMockEmployee({ auth_id: 'auth-user-id' });
      queries.findById.mockResolvedValue(emp);
      queries.countByRole.mockResolvedValue(2);
      queries.softDelete.mockResolvedValue(undefined);
      queries.deleteAuthUser.mockResolvedValue({ error: null });

      await service.softDelete(emp.id, 'other-actor');

      expect(queries.softDelete).toHaveBeenCalledWith(emp.id);
      expect(queries.deleteAuthUser).toHaveBeenCalledWith('auth-user-id');
    });

    it('throws CannotDeleteSelfError', async () => {
      await expect(service.softDelete(actorId, actorId)).rejects.toThrow(CannotDeleteSelfError);
    });

    it('throws LastAdminCannotDeleteError when last admin', async () => {
      const emp = createMockEmployee({ role: 'admin' });
      queries.findById.mockResolvedValue(emp);
      queries.countByRole.mockResolvedValue(1);

      await expect(service.softDelete(emp.id, 'other-actor')).rejects.toThrow(LastAdminCannotDeleteError);
    });

    it('throws EmployeeNotFoundError when already deleted', async () => {
      queries.findById.mockResolvedValue(null);
      await expect(service.softDelete('nonexistent', actorId)).rejects.toThrow(EmployeeNotFoundError);
    });
  });

  describe('toggleStatus', () => {
    it('disables an active employee', async () => {
      const emp = createMockEmployee({ status: 'Active', role: 'sales' });
      queries.findById.mockResolvedValue(emp);
      queries.countByRole.mockResolvedValue(2);
      queries.update.mockResolvedValue({ ...emp, status: 'Disabled' });

      const result = await service.toggleStatus(emp.id, 'other-actor');

      expect(queries.update).toHaveBeenCalledWith(emp.id, { status: 'Disabled' });
      expect(result.status).toBe('Disabled');
    });

    it('enables a disabled employee', async () => {
      const emp = createMockEmployee({ status: 'Disabled', role: 'sales' });
      queries.findById.mockResolvedValue(emp);
      queries.update.mockResolvedValue({ ...emp, status: 'Active' });

      const result = await service.toggleStatus(emp.id, 'other-actor');

      expect(result.status).toBe('Active');
    });

    it('throws CannotDisableSelfError', async () => {
      await expect(service.toggleStatus(actorId, actorId)).rejects.toThrow(CannotDisableSelfError);
    });

    it('throws LastAdminCannotDisableError when disabling last admin', async () => {
      const emp = createMockEmployee({ role: 'admin' });
      queries.findById.mockResolvedValue(emp);
      queries.countByRole.mockResolvedValue(1);

      await expect(service.toggleStatus(emp.id, 'other-actor')).rejects.toThrow(LastAdminCannotDisableError);
    });
  });

  describe('resetPassword', () => {
    it('resets password via auth_id', async () => {
      const emp = createMockEmployee({ auth_id: 'auth-id-1' });
      queries.findById.mockResolvedValue(emp);
      queries.resetAuthUserPassword.mockResolvedValue({ error: null });

      await service.resetPassword(emp.id, 'newPass123', actorId);

      expect(queries.resetAuthUserPassword).toHaveBeenCalledWith('auth-id-1', 'newPass123');
    });

    it('generates reset link when no auth_id', async () => {
      const emp = createMockEmployee({ auth_id: null });
      queries.findById.mockResolvedValue(emp);
      queries.generatePasswordResetLink.mockResolvedValue({ error: null });

      await service.resetPassword(emp.id, 'newPass123', actorId);

      expect(queries.generatePasswordResetLink).toHaveBeenCalledWith(emp.email);
    });

    it('throws EmployeeNotFoundError for missing employee', async () => {
      queries.findById.mockResolvedValue(null);
      await expect(service.resetPassword('bad-id', 'pass', actorId)).rejects.toThrow(EmployeeNotFoundError);
    });
  });
});
