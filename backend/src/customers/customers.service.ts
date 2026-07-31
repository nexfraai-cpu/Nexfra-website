import { CustomerQueries } from './customers.queries.js';
import {
  CustomerNotFoundError,
  CustomerGstConflictError,
  InvalidPaginationError,
} from './customers.errors.js';
import {
  CustomerResponse,
  CreateCustomerInput,
  UpdateCustomerInput,
  PaginatedResult,
} from './customers.types.js';
import { logger } from '../config/logger.js';
import { supabase } from '../database/client.js';
import { AuthenticatedUser } from '../middleware/auth.js';

export class CustomersService {
  constructor(private queries: CustomerQueries) {}

  async list(
    options: {
      search?: string;
      company?: string;
      sortBy?: string;
      sortOrder?: string;
      page: number;
      perPage: number;
    },
    user: AuthenticatedUser,
  ): Promise<PaginatedResult<CustomerResponse>> {
    if (options.page < 1 || options.perPage < 1 || options.perPage > 100) {
      throw new InvalidPaginationError();
    }

    const { data, total } = await this.queries.findAll(options, user);

    logger.info(
      { actorId: user.id, page: options.page, total },
      'Customers listed',
    );

    return {
      data: data.map(this._toResponse),
      meta: {
        total,
        page: options.page,
        perPage: options.perPage,
        totalPages: Math.ceil(total / options.perPage) || 1,
      },
    };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<CustomerResponse> {
    const customer = await this.queries.findById(id, user);
    if (!customer || customer.deleted_at) {
      throw new CustomerNotFoundError(id);
    }

    logger.info({ actorId: user.id, targetId: id }, 'Customer retrieved');
    return this._toResponse(customer);
  }

  async create(input: CreateCustomerInput, user: AuthenticatedUser): Promise<CustomerResponse> {
    if (input.gst) {
      const existing = await this.queries.findByGst(input.gst, undefined, user);
      if (existing) {
        throw new CustomerGstConflictError(input.gst);
      }
    }

    const customer = await this.queries.create({
      name: input.name,
      company: input.company,
      gst: input.gst ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      vehicles: input.vehicles ?? [],
      created_by: user.id,
      updated_by: user.id,
    } as any);

    await this._logAudit(user.id, 'create', 'customer', customer.id, null, {
      name: input.name,
      company: input.company,
      gst: input.gst,
    });

    logger.info({ actorId: user.id, customerId: customer.id }, 'Customer created');
    return this._toResponse(customer);
  }

  async update(
    id: string,
    input: UpdateCustomerInput,
    user: AuthenticatedUser,
  ): Promise<CustomerResponse> {
    const customer = await this.queries.findById(id, user);
    if (!customer || customer.deleted_at) {
      throw new CustomerNotFoundError(id);
    }

    if (input.gst) {
      const existing = await this.queries.findByGst(input.gst, id, user);
      if (existing) {
        throw new CustomerGstConflictError(input.gst);
      }
    }

    const oldData = { ...customer };

    const updates: Record<string, any> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.company !== undefined) updates.company = input.company;
    if (input.gst !== undefined) updates.gst = input.gst;
    if (input.phone !== undefined) updates.phone = input.phone;
    if (input.email !== undefined) updates.email = input.email;
    if (input.address !== undefined) updates.address = input.address;
    if (input.vehicles !== undefined) updates.vehicles = input.vehicles;
    updates.updated_by = user.id;

    if (Object.keys(updates).length === 1) {
      return this._toResponse(customer);
    }

    const updated = await this.queries.update(id, updates as any, user);

    await this._logAudit(user.id, 'update', 'customer', id, oldData, updated);

    logger.info({ actorId: user.id, customerId: id }, 'Customer updated');
    return this._toResponse(updated);
  }

  async softDelete(id: string, user: AuthenticatedUser): Promise<void> {
    const customer = await this.queries.findById(id, user);
    if (!customer || customer.deleted_at) {
      throw new CustomerNotFoundError(id);
    }

    await this.queries.softDelete(id, user);

    await this._logAudit(user.id, 'delete', 'customer', id, customer, { deleted: true });

    logger.info({ actorId: user.id, customerId: id }, 'Customer soft-deleted');
  }

  private async _logAudit(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValue: unknown,
    newValue: unknown,
  ) {
    const { error } = await supabase.from('audit_logs').insert({
      employee_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      description: `${action} customer`,
      metadata: { old: oldValue, new: newValue },
    });
    if (error) {
      logger.error({ error, action, entityId }, 'Audit log insertion failed');
    }
  }

  private _toResponse(customer: any): CustomerResponse {
    return {
      id: customer.id,
      customerNumber: customer.customer_number,
      name: customer.name,
      company: customer.company,
      gst: customer.gst ?? null,
      phone: customer.phone ?? null,
      email: customer.email ?? null,
      address: customer.address ?? null,
      vehicles: customer.vehicles ?? [],
      outstanding: Number(customer.outstanding) || 0,
      createdAt: customer.created_at,
      createdBy: customer.created_by ?? null,
      updatedAt: customer.updated_at,
    };
  }
}
