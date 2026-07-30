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
import { EmployeeResponse, CreateEmployeeInput, UpdateEmployeeInput, EmployeeListOptions } from './employees.types.js';
import { logger } from '../config/logger.js';
import { supabase } from '../database/client.js';

export class EmployeesService {
  constructor(private queries: EmployeeQueries) {}

  async list(options: EmployeeListOptions, actorId: string): Promise<EmployeeResponse[]> {
    const employees = await this.queries.findAll(options);
    logger.info({ actorId, count: employees.length }, 'Employees listed');
    return employees.map(this._toResponse);
  }

  async getById(id: string, actorId: string): Promise<EmployeeResponse> {
    const employee = await this.queries.findById(id);
    if (!employee || employee.deleted_at) {
      throw new EmployeeNotFoundError(id);
    }
    logger.info({ actorId, targetId: id }, 'Employee retrieved');
    return this._toResponse(employee);
  }

  async create(input: CreateEmployeeInput, actorId: string): Promise<EmployeeResponse> {
    const existing = await this.queries.findByEmail(input.email);
    if (existing) {
      throw new EmployeeEmailConflictError(input.email);
    }

    const { data: authResult, error: authError } = await this.queries.createAuthUser(
      input.email,
      input.password,
      input.fullName,
      input.role,
    );

    if (authError) {
      logger.error({ code: authError.code, email: input.email }, 'Failed to create auth user');
      if (authError.message?.includes('already registered')) {
        throw new EmployeeEmailConflictError(input.email);
      }
      throw authError;
    }

    const authId = authResult.user!.id;

    const updates: Record<string, any> = {
      phone: input.phone ?? null,
      employee_code: input.employeeCode ?? null,
      created_by: actorId,
    };

    const employee = await this.queries.updateByAuthId(authId, updates as any);

    await this._logAudit(actorId, 'create', 'employee', employee.id, null, {
      fullName: input.fullName,
      email: input.email,
      role: input.role,
    });

    logger.info({ actorId, employeeId: employee.id, role: input.role }, 'Employee created');
    return this._toResponse(employee);
  }

  async update(id: string, input: UpdateEmployeeInput, actorId: string): Promise<EmployeeResponse> {
    const employee = await this.queries.findById(id);
    if (!employee || employee.deleted_at) {
      throw new EmployeeNotFoundError(id);
    }

    if (input.role && id === actorId) {
      throw new CannotChangeOwnRoleError();
    }

    if (input.role && employee.role !== input.role) {
      const adminCount = await this.queries.countByRole('admin', id);
      if (employee.role === 'admin' && adminCount <= 1) {
        throw new LastAdminCannotChangeRoleError();
      }
    }

    const oldData = { ...employee };

    const updates: Record<string, any> = {};
    if (input.fullName !== undefined) updates.full_name = input.fullName;
    if (input.phone !== undefined) updates.phone = input.phone;
    if (input.employeeCode !== undefined) updates.employee_code = input.employeeCode;
    if (input.role !== undefined) updates.role = input.role;

    if (Object.keys(updates).length === 0) {
      return this._toResponse(employee);
    }

    const updated = await this.queries.update(id, updates as any);

    await this._logAudit(actorId, 'update', 'employee', id, oldData, updated);

    logger.info({ actorId, employeeId: id }, 'Employee updated');
    return this._toResponse(updated);
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    if (id === actorId) {
      throw new CannotDeleteSelfError();
    }

    const employee = await this.queries.findById(id);
    if (!employee || employee.deleted_at) {
      throw new EmployeeNotFoundError(id);
    }

    if (employee.role === 'admin') {
      const adminCount = await this.queries.countByRole('admin', id);
      if (adminCount <= 1) {
        throw new LastAdminCannotDeleteError();
      }
    }

    await this.queries.softDelete(id);

    if (employee.auth_id) {
      await this.queries.deleteAuthUser(employee.auth_id);
    }

    await this._logAudit(actorId, 'delete', 'employee', id, employee, { deleted: true });

    logger.info({ actorId, employeeId: id }, 'Employee soft-deleted');
  }

  async toggleStatus(id: string, actorId: string): Promise<EmployeeResponse> {
    if (id === actorId) {
      throw new CannotDisableSelfError();
    }

    const employee = await this.queries.findById(id);
    if (!employee || employee.deleted_at) {
      throw new EmployeeNotFoundError(id);
    }

    const newStatus = employee.status === 'Active' ? 'Disabled' : 'Active';

    if (newStatus === 'Disabled' && employee.role === 'admin') {
      const adminCount = await this.queries.countByRole('admin', id);
      if (adminCount <= 1) {
        throw new LastAdminCannotDisableError();
      }
    }

    const updated = await this.queries.update(id, { status: newStatus } as any);

    await this._logAudit(actorId, 'update-status', 'employee', id, { status: employee.status }, { status: newStatus });

    logger.info({ actorId, employeeId: id, newStatus }, 'Employee status changed');
    return this._toResponse(updated);
  }

  async resetPassword(id: string, newPassword: string, actorId: string): Promise<void> {
    const employee = await this.queries.findById(id);
    if (!employee || employee.deleted_at) {
      throw new EmployeeNotFoundError(id);
    }

    if (employee.auth_id) {
      await this.queries.resetAuthUserPassword(employee.auth_id, newPassword);
    } else {
      const { error } = await this.queries.generatePasswordResetLink(employee.email);
      if (error) throw error;
    }

    await this._logAudit(actorId, 'reset-password', 'employee', id, null, {});

    logger.info({ actorId, employeeId: id }, 'Employee password reset');
  }

  private async _logAudit(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string | null,
    oldValue: unknown,
    newValue: unknown,
  ) {
    const { error } = await supabase.from('audit_logs').insert({
      employee_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      description: `${action} ${entityType}`,
      metadata: {
        old: oldValue,
        new: newValue,
      },
    });
    if (error) {
      logger.error({ error, action, entityType, entityId }, 'Audit log insertion failed');
    }
  }

  private _toResponse(employee: any): EmployeeResponse {
    return {
      id: employee.id,
      authId: employee.auth_id ?? null,
      employeeNumber: employee.employee_number,
      fullName: employee.full_name,
      email: employee.email,
      phone: employee.phone ?? null,
      employeeCode: employee.employee_code ?? null,
      role: employee.role,
      status: employee.status,
      lastLoginAt: employee.last_login_at ?? null,
      createdAt: employee.created_at,
      createdBy: employee.created_by ?? null,
      updatedAt: employee.updated_at,
    };
  }
}
