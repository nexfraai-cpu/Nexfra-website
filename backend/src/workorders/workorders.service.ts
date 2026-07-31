import { WorkOrderQueries } from './workorders.queries.js';
import {
  WorkOrderNotFoundError,
  WorkOrderNotOpenError,
  QuotationNotApprovedError,
  WorkOrderAlreadyExistsError,
} from './workorders.errors.js';
import {
  WorkOrderResponse,
  WorkOrderSummaryResponse,
  PaginatedResult,
} from './workorders.types.js';
import { logger } from '../config/logger.js';
import { supabase } from '../database/client.js';
import { AuthenticatedUser } from '../middleware/auth.js';

export class WorkordersService {
  constructor(private queries: WorkOrderQueries) {}

  async list(
    options: {
      status?: string; search?: string; urgent?: boolean;
      sortBy?: string; sortOrder?: string; page: number; perPage: number;
    },
    user: AuthenticatedUser,
  ): Promise<PaginatedResult<WorkOrderSummaryResponse>> {
    const { data, total } = await this.queries.findAll(options as any, user);
    logger.info({ actorId: user.id, page: options.page, total }, 'Work orders listed');
    return {
      data: data.map(this._toSummaryResponse),
      meta: { total, page: options.page, perPage: options.perPage, totalPages: Math.ceil(total / options.perPage) || 1 },
    };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<WorkOrderResponse> {
    const wo = await this.queries.findById(id, user);
    if (!wo || (wo as any).deleted_at) throw new WorkOrderNotFoundError(id);

    const productionItems = await this.queries.findProductionItems(id, user);
    logger.info({ actorId: user.id, workOrderId: id }, 'Work order retrieved');
    return this._toDetailResponse(wo, productionItems);
  }

  async create(input: { quotationId: string; factoryNotes?: string | null; dueDate?: string | null; isUrgent?: boolean }, user: AuthenticatedUser): Promise<WorkOrderResponse> {
    console.log(`[WORKORDER CREATE] Payload passed to WorkordersService:`, JSON.stringify({ input, actorRole: user.role, actorId: user.id }));
    const quotation = await this.queries.findQuotationById(input.quotationId, user);
    console.log(`[WORKORDER CREATE] Quotation status from DB for quotationId=${input.quotationId}:`, quotation ? (quotation as any).status : 'NOT_FOUND');
    if (!quotation) throw new WorkOrderNotFoundError(input.quotationId);
    if ((quotation as any).status !== 'Approved') {
      throw new QuotationNotApprovedError(input.quotationId);
    }

    const existing = await this.queries.findExistingByQuotation(input.quotationId, user);
    if (existing) throw new WorkOrderAlreadyExistsError(input.quotationId);

    const q = quotation as any;
    const productName = q.template_key
      ? `${q.product_key ?? ''} ${q.template_key}`
      : q.product_key ?? 'Custom Product';

    const wo = await this.queries.create({
      quotation_id: q.id,
      customer_name: q.customer_name,
      product_name: productName.trim(),
      specifications: q.specValues ?? {},
      dimensions: q.dimensions ?? {},
      colour: null,
      quantity: q.order_qty ?? 1,
      factory_notes: input.factoryNotes ?? q.scope_of_work ?? null,
      due_date: input.dueDate ?? null,
      is_urgent: input.isUrgent ?? false,
      status: 'Open',
      version: 1,
      booked_by: user.id,
      created_by: user.id,
      updated_by: user.id,
    } as any);

    for (let i = 0; i < (q.order_qty ?? 1); i++) {
      await this.queries.createProductionItem({
        work_order_id: wo.id as string,
        quotation_id: q.id,
        current_stage: 'Pending',
        stage_progress: {},
        dispatch_fields: {},
      } as any);

      await this.queries.createStageRecord({
        production_item_id: wo.id as string,
        stage_key: 'Pending',
        stage_name: 'Pending',
        is_completed: false,
        completed_by: user.id,
        completed_at: new Date().toISOString(),
        remark: null,
        created_by: user.id,
      } as any);
    }

    await this._logAudit(user.id, 'create', 'work_order', wo.id as string, null, {
      workOrderNumber: (wo as any).work_order_number,
      quotationId: q.id,
    });

    const productionItems = await this.queries.findProductionItems(wo.id as string, user);
    logger.info({ actorId: user.id, workOrderId: wo.id, items: productionItems.length }, 'Work order created');
    return this._toDetailResponse(wo, productionItems);
  }

  async update(id: string, input: Record<string, unknown>, user: AuthenticatedUser): Promise<WorkOrderResponse> {
    const wo = await this.queries.findById(id, user);
    if (!wo || (wo as any).deleted_at) throw new WorkOrderNotFoundError(id);
    if ((wo as any).status !== 'Open') throw new WorkOrderNotOpenError((wo as any).status);

    const oldData = { ...wo };
    const updates: Record<string, unknown> = { version: ((wo as any).version || 0) + 1, updated_by: user.id };

    const fieldMap: Record<string, string> = {
      factoryNotes: 'factory_notes', dueDate: 'due_date', isUrgent: 'is_urgent', status: 'status',
    };
    for (const [ik, dbk] of Object.entries(fieldMap)) {
      if (input[ik] !== undefined) updates[dbk] = input[ik];
    }

    const updated = await this.queries.update(id, updates as any, user);
    const productionItems = await this.queries.findProductionItems(id, user);

    await this._logAudit(user.id, 'update', 'work_order', id, oldData, updated);
    logger.info({ actorId: user.id, workOrderId: id }, 'Work order updated');
    return this._toDetailResponse(updated, productionItems);
  }

  async setDueDate(id: string, dueDate: string | null, user: AuthenticatedUser): Promise<WorkOrderResponse> {
    const wo = await this.queries.findById(id, user);
    if (!wo || (wo as any).deleted_at) throw new WorkOrderNotFoundError(id);

    const updated = await this.queries.update(id, { due_date: dueDate, updated_by: user.id } as any, user);
    const productionItems = await this.queries.findProductionItems(id, user);

    await this._logAudit(user.id, 'set-due-date', 'work_order', id, { due_date: (wo as any).due_date }, { due_date: dueDate });
    logger.info({ actorId: user.id, workOrderId: id, dueDate }, 'Work order due date set');
    return this._toDetailResponse(updated, productionItems);
  }

  async toggleUrgent(id: string, user: AuthenticatedUser): Promise<WorkOrderResponse> {
    const wo = await this.queries.findById(id, user);
    if (!wo || (wo as any).deleted_at) throw new WorkOrderNotFoundError(id);

    const newUrgent = !(wo as any).is_urgent;
    const updated = await this.queries.update(id, { is_urgent: newUrgent, updated_by: user.id } as any, user);
    const productionItems = await this.queries.findProductionItems(id, user);

    await this._logAudit(user.id, 'toggle-urgent', 'work_order', id, { is_urgent: (wo as any).is_urgent }, { is_urgent: newUrgent });
    logger.info({ actorId: user.id, workOrderId: id, isUrgent: newUrgent }, 'Work order urgent toggled');
    return this._toDetailResponse(updated, productionItems);
  }

  async softDelete(id: string, user: AuthenticatedUser): Promise<void> {
    const wo = await this.queries.findById(id, user);
    if (!wo || (wo as any).deleted_at) throw new WorkOrderNotFoundError(id);
    if ((wo as any).status !== 'Open') throw new WorkOrderNotOpenError((wo as any).status);

    await this.queries.softDelete(id, user);
    await this._logAudit(user.id, 'delete', 'work_order', id, wo, { deleted: true });
    logger.info({ actorId: user.id, workOrderId: id }, 'Work order soft-deleted');
  }

  private async _logAudit(actorId: string, action: string, entityType: string, entityId: string, oldValue: unknown, newValue: unknown) {
    const { error } = await supabase.from('audit_logs').insert({
      employee_id: actorId, action, entity_type: entityType, entity_id: entityId,
      description: `${action} work order`, metadata: { old: oldValue, new: newValue },
    });
    if (error) logger.error({ error, action, entityId }, 'Audit log insertion failed');
  }

  private _toSummaryResponse(row: any): WorkOrderSummaryResponse {
    return {
      id: row.id, workOrderNumber: row.work_order_number, customerName: row.customer_name,
      productName: row.product_name, quantity: row.quantity, status: row.status,
      dueDate: row.due_date ?? null, isUrgent: row.is_urgent,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }

  private _toDetailResponse(wo: any, productionItems: any[]): WorkOrderResponse {
    return {
      id: wo.id, workOrderNumber: wo.work_order_number, version: wo.version ?? 1,
      quotationId: wo.quotation_id ?? null, customerName: wo.customer_name,
      productName: wo.product_name, specifications: wo.specifications ?? {},
      dimensions: wo.dimensions ?? {}, colour: wo.colour ?? null,
      quantity: wo.quantity, factoryNotes: wo.factory_notes ?? null,
      dueDate: wo.due_date ?? null, isUrgent: wo.is_urgent, status: wo.status,
      bookedBy: wo.booked_by ?? null, approvedBy: wo.approved_by ?? null,
      createdAt: wo.created_at, updatedAt: wo.updated_at,
      productionItems: (productionItems ?? []).map((pi: any) => ({
        id: pi.id, currentStage: pi.current_stage,
        startedAt: pi.started_at ?? null, completedAt: pi.completed_at ?? null,
      })),
    };
  }
}
