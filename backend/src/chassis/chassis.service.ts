import { ChassisQueries } from './chassis.queries.js';
import { NotFoundError } from '../middleware/error-handler.js';
import {
  ChassisRecordResponse,
  CreateChassisInput,
  UpdateChassisInput,
} from './chassis.types.js';
import { logger } from '../config/logger.js';
import { supabase } from '../database/client.js';
import { AuthenticatedUser } from '../middleware/auth.js';

import type { CreateChassisRequestBody, UpdateChassisRequestBody } from './chassis.validator.js';

export class ChassisService {
  constructor(private queries: ChassisQueries) {}

  async list(
    user: AuthenticatedUser,
    workOrderId?: string,
    customerId?: string,
  ): Promise<ChassisRecordResponse[]> {
    const rows = await this.queries.findAll(user, workOrderId, customerId);
    return rows.map((r) => this._toResponse(r));
  }

  async create(input: CreateChassisInput, user: AuthenticatedUser): Promise<ChassisRecordResponse> {
    let customerName: string | null = null;
    let productName: string | null = null;

    if (input.workOrderId) {
      const wo = await this.queries.findWorkOrderById(input.workOrderId, user);
      if (!wo) throw new NotFoundError('Work order not found');
      customerName = (wo.customer_name as string) ?? null;
      productName = (wo.product_name as string) ?? null;
    }

    const record = await this.queries.create({
      work_order_id: input.workOrderId ?? null,
      customer_id: null,
      field: input.field ?? null,
      brand: input.brand ?? null,
      model: input.model ?? null,
      chassis_number: input.chassisNumber ?? null,
      arrival_date: (input.arrivalDate as any) ?? null,
      out_date: (input.outDate as any) ?? null,
      customer_name: customerName,
      product_name: productName,
      notes: input.notes ?? null,
      created_by: user.id,
      updated_by: user.id,
    } as any);

    await this._logAudit(user.id, 'create', 'chassis_record', record.id as string, null, {
      workOrderId: input.workOrderId,
      chassisNumber: input.chassisNumber,
    });

    logger.info({ actorId: user.id, workOrderId: input.workOrderId, chassisId: record.id }, 'Chassis record created');
    return this._toResponse(record);
  }

  async update(id: string, input: UpdateChassisInput, user: AuthenticatedUser): Promise<ChassisRecordResponse> {
    const existing = await this.queries.findById(id, user);
    if (!existing) throw new NotFoundError('Chassis record not found');

    const updates: Record<string, unknown> = { updated_by: user.id };

    let customerName: string | null = (existing.customer_name as string) ?? null;
    let productName: string | null = (existing.product_name as string) ?? null;

    if (input.workOrderId !== undefined) {
      if (input.workOrderId) {
        const wo = await this.queries.findWorkOrderById(input.workOrderId, user);
        if (!wo) throw new NotFoundError('Work order not found');
        customerName = (wo.customer_name as string) ?? null;
        productName = (wo.product_name as string) ?? null;
      }
      updates.work_order_id = input.workOrderId;
      updates.customer_name = customerName;
      updates.product_name = productName;
    }
    if (input.field !== undefined) updates.field = input.field;
    if (input.brand !== undefined) updates.brand = input.brand;
    if (input.model !== undefined) updates.model = input.model;
    if (input.chassisNumber !== undefined) updates.chassis_number = input.chassisNumber;
    if (input.arrivalDate !== undefined) updates.arrival_date = input.arrivalDate;
    if (input.outDate !== undefined) updates.out_date = input.outDate;
    if (input.notes !== undefined) updates.notes = input.notes;

    const updated = await this.queries.update(id, updates as any, user);

    await this._logAudit(user.id, 'update', 'chassis_record', id, existing, updated);
    logger.info({ actorId: user.id, chassisId: id }, 'Chassis record updated');
    return this._toResponse(updated);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const existing = await this.queries.findById(id, user);
    if (!existing) throw new NotFoundError('Chassis record not found');

    await this.queries.softDelete(id, user);
    await this._logAudit(user.id, 'delete', 'chassis_record', id, existing, { deleted: true });
    logger.info({ actorId: user.id, chassisId: id }, 'Chassis record deleted');
  }

  createInput(body: CreateChassisRequestBody): CreateChassisInput {
    return {
      workOrderId: body.workOrderId ?? null,
      field: body.field ?? null,
      brand: body.brand ?? null,
      model: body.model ?? null,
      chassisNumber: body.chassisNumber ?? null,
      arrivalDate: body.arrivalDate ?? null,
      outDate: body.outDate ?? null,
      notes: body.notes ?? null,
    };
  }

  updateInput(body: UpdateChassisRequestBody): UpdateChassisInput {
    const out: UpdateChassisInput = {};
    if (body.workOrderId !== undefined) out.workOrderId = body.workOrderId;
    if (body.field !== undefined) out.field = body.field;
    if (body.brand !== undefined) out.brand = body.brand;
    if (body.model !== undefined) out.model = body.model;
    if (body.chassisNumber !== undefined) out.chassisNumber = body.chassisNumber;
    if (body.arrivalDate !== undefined) out.arrivalDate = body.arrivalDate;
    if (body.outDate !== undefined) out.outDate = body.outDate;
    if (body.notes !== undefined) out.notes = body.notes;
    return out;
  }

  private _toResponse(row: any): ChassisRecordResponse {
    const wo = row.work_orders ?? {};
    return {
      id: row.id,
      workOrderId: (row.work_order_id as string) ?? null,
      workOrderNumber: (wo.work_order_number as string) ?? null,
      customerId: (row.customer_id as string) ?? null,
      field: (row.field as string) ?? null,
      brand: (row.brand as string) ?? null,
      model: (row.model as string) ?? null,
      chassisNumber: (row.chassis_number as string) ?? null,
      arrivalDate: (row.arrival_date as string) ?? null,
      outDate: (row.out_date as string) ?? null,
      customerName: (row.customer_name as string) ?? null,
      productName: (row.product_name as string) ?? null,
      notes: (row.notes as string) ?? null,
      createdBy: (row.created_by as string) ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async _logAudit(actorId: string, action: string, entityType: string, entityId: string, oldValue: unknown, newValue: unknown) {
    const { error } = await supabase.from('audit_logs').insert({
      employee_id: actorId, action, entity_type: entityType, entity_id: entityId,
      description: `${action} ${entityType}`, metadata: { old: oldValue, new: newValue },
    });
    if (error) logger.error({ error, action, entityId }, 'Audit log insertion failed');
  }
}