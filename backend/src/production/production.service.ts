import { ProductionQueries } from './production.queries.js';
import {
  ProductionItemNotFoundError,
  InvalidStageTransitionError,
  ChassisRecordNotFoundError,
  ProductionItemAlreadyCompletedError,
} from './production.errors.js';
import {
  ProductionItemResponse,
  ProductionItemDetailResponse,
  StageRecordResponse,
  ChassisRecordResponse,
  PaginatedResult,
} from './production.types.js';
import { logger } from '../config/logger.js';
import { supabase } from '../database/client.js';
import { AuthenticatedUser } from '../middleware/auth.js';

const PRODUCTION_STAGES = [
  'Pending', 'Material Ordered', 'Cutting', 'Fabrication', 'Welding',
  'Painting', 'Assembly', 'QC', 'Ready', 'Delivered',
];

export class ProductionService {
  constructor(private queries: ProductionQueries) {}

  async list(
    options: {
      stage?: string; workOrderId?: string; search?: string;
      sortBy?: string; sortOrder?: string; page: number; perPage: number;
    },
    user: AuthenticatedUser,
  ): Promise<PaginatedResult<ProductionItemResponse>> {
    const { data, total } = await this.queries.findAll(options as any, user);
    logger.info({ actorId: user.id, page: options.page, total }, 'Production items listed');
    return {
      data: data.map(this._toResponse),
      meta: { total, page: options.page, perPage: options.perPage, totalPages: Math.ceil(total / options.perPage) || 1 },
    };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<ProductionItemDetailResponse> {
    const item = await this.queries.findById(id, user);
    if (!item || (item as any).deleted_at) throw new ProductionItemNotFoundError(id);

    const stageRecords = await this.queries.findStageRecords(id, user);
    const chassisRecords = await this.queries.findChassisRecordsByItem(id, user);

    logger.info({ actorId: user.id, productionItemId: id }, 'Production item retrieved');
    return {
      ...this._toResponse(item),
      stageRecords: stageRecords.map(this._toStageRecordResponse),
      chassisRecords: chassisRecords.map(this._toChassisResponse),
    };
  }

  async update(id: string, input: { dispatchFields?: Record<string, unknown>; stageProgress?: Record<string, unknown> }, user: AuthenticatedUser): Promise<ProductionItemResponse> {
    const item = await this.queries.findById(id, user);
    if (!item || (item as any).deleted_at) throw new ProductionItemNotFoundError(id);

    const oldData = { ...item };
    const updates: Record<string, unknown> = { updated_by: user.id };

    if (input.dispatchFields !== undefined) updates.dispatch_fields = input.dispatchFields;
    if (input.stageProgress !== undefined) updates.stage_progress = input.stageProgress;

    if (Object.keys(updates).length === 1) return this._toResponse(item);

    const updated = await this.queries.update(id, updates as any, user);

    await this._logAudit(user.id, 'update', 'production_item', id, oldData, updated);
    logger.info({ actorId: user.id, productionItemId: id }, 'Production item updated');
    return this._toResponse(updated);
  }

  async advanceStage(id: string, input: { stageKey?: string; remark?: string | null }, user: AuthenticatedUser): Promise<ProductionItemDetailResponse> {
    const item = await this.queries.findById(id, user);
    if (!item || (item as any).deleted_at) throw new ProductionItemNotFoundError(id);

    const currentStage = (item as any).current_stage;
    if (currentStage === 'Delivered') throw new ProductionItemAlreadyCompletedError();

    let nextStage: string;

    if (input.stageKey) {
      const idx = PRODUCTION_STAGES.indexOf(input.stageKey);
      if (idx === -1) throw new InvalidStageTransitionError(currentStage, input.stageKey);
      nextStage = input.stageKey;
    } else {
      const currentIdx = PRODUCTION_STAGES.indexOf(currentStage);
      if (currentIdx === -1 || currentIdx >= PRODUCTION_STAGES.length - 1) {
        throw new InvalidStageTransitionError(currentStage, 'next');
      }
      nextStage = PRODUCTION_STAGES[currentIdx + 1];
    }

    if (currentStage !== nextStage) {
      const currentIdx = PRODUCTION_STAGES.indexOf(currentStage);
      const nextIdx = PRODUCTION_STAGES.indexOf(nextStage);
      if (nextIdx <= currentIdx) {
        throw new InvalidStageTransitionError(currentStage, nextStage);
      }
    }

    await this.queries.upsertStageRecord({
      production_item_id: id,
      stage_key: nextStage,
      stage_name: nextStage,
      is_completed: nextStage === 'Delivered',
      completed_by: nextStage === 'Delivered' ? user.id : null,
      completed_at: nextStage === 'Delivered' ? new Date().toISOString() : null,
      remark: input.remark ?? null,
      created_by: user.id,
    });

    const timeNow = new Date().toISOString();
    const updates: Record<string, unknown> = {
      current_stage: nextStage,
      stage_progress: { ...((item as any).stage_progress as Record<string, unknown> ?? {}), [nextStage]: timeNow },
      updated_by: user.id,
    };

    if (nextStage !== 'Pending' && !(item as any).started_at) {
      updates.started_at = timeNow;
    }
    if (nextStage === 'Delivered') {
      updates.completed_at = timeNow;
    }

    const updated = await this.queries.update(id, updates as any, user);
    const stageRecords = await this.queries.findStageRecords(id, user);
    const chassisRecords = await this.queries.findChassisRecordsByItem(id, user);

    await this._logAudit(user.id, 'advance-stage', 'production_item', id,
      { current_stage: currentStage }, { current_stage: nextStage, remark: input.remark });

    logger.info({ actorId: user.id, productionItemId: id, from: currentStage, to: nextStage }, 'Stage advanced');
    return {
      ...this._toResponse(updated),
      stageRecords: stageRecords.map(this._toStageRecordResponse),
      chassisRecords: chassisRecords.map(this._toChassisResponse),
    };
  }

  async addChassis(id: string, input: Record<string, unknown>, user: AuthenticatedUser): Promise<ChassisRecordResponse> {
    const item = await this.queries.findById(id, user);
    if (!item || (item as any).deleted_at) throw new ProductionItemNotFoundError(id);

    const woId = (item as any).work_order_id;
    const wo = woId ? await this.queries.findWorkOrderById(woId as string, user) : null;

    const record = await this.queries.createChassisRecord({
      work_order_id: woId ?? null,
      customer_id: null,
      field: input.field ?? null,
      brand: input.brand ?? null,
      model: input.model ?? null,
      chassis_number: input.chassisNumber ?? null,
      arrival_date: input.arrivalDate ?? null,
      customer_name: input.customerName ?? (wo ? (wo as any).customer_name : null),
      product_name: input.productName ?? (wo ? (wo as any).product_name : null),
      notes: input.notes ?? null,
      created_by: user.id,
      updated_by: user.id,
    } as any);

    await this._logAudit(user.id, 'add-chassis', 'chassis_record', record.id as string, null, {
      chassis_number: input.chassisNumber,
      production_item_id: id,
    });

    logger.info({ actorId: user.id, productionItemId: id, chassisId: record.id }, 'Chassis record added');
    return this._toChassisResponse(record);
  }

  async updateChassis(_id: string, chassisId: string, input: Record<string, unknown>, user: AuthenticatedUser): Promise<ChassisRecordResponse> {
    const record = await this.queries.findChassisRecordById(chassisId, user);
    if (!record || (record as any).deleted_at) throw new ChassisRecordNotFoundError(chassisId);

    const oldData = { ...record };
    const updates: Record<string, unknown> = { updated_by: user.id };
    const fieldMap: Record<string, string> = {
      field: 'field', brand: 'brand', model: 'model',
      chassisNumber: 'chassis_number', arrivalDate: 'arrival_date', notes: 'notes',
    };

    for (const [ik, dbk] of Object.entries(fieldMap)) {
      if (input[ik] !== undefined) updates[dbk] = input[ik];
    }

    if (Object.keys(updates).length === 1) return this._toChassisResponse(record);

    const updated = await this.queries.updateChassisRecord(chassisId, updates as any, user);

    await this._logAudit(user.id, 'update-chassis', 'chassis_record', chassisId, oldData, updated);
    logger.info({ actorId: user.id, chassisId }, 'Chassis record updated');
    return this._toChassisResponse(updated);
  }

  async getChassisRecords(id: string, user: AuthenticatedUser): Promise<ChassisRecordResponse[]> {
    const item = await this.queries.findById(id, user);
    if (!item || (item as any).deleted_at) throw new ProductionItemNotFoundError(id);

    const records = await this.queries.findChassisRecordsByItem(id, user);
    logger.info({ actorId: user.id, productionItemId: id, count: records.length }, 'Chassis records listed');
    return records.map(this._toChassisResponse);
  }

  private async _logAudit(actorId: string, action: string, entityType: string, entityId: string, oldValue: unknown, newValue: unknown) {
    const { error } = await supabase.from('audit_logs').insert({
      employee_id: actorId, action, entity_type: entityType, entity_id: entityId,
      description: `${action} ${entityType}`, metadata: { old: oldValue, new: newValue },
    });
    if (error) logger.error({ error, action, entityId }, 'Audit log insertion failed');
  }

  private _toResponse(row: any): ProductionItemResponse {
    const wo = row.work_orders ?? {};
    return {
      id: row.id, workOrderId: row.work_order_id, quotationId: row.quotation_id ?? null,
      quotationNumber: row.quotation_number ?? row.quotationNumber ?? wo.quotations?.quotation_number ?? null,
      currentStage: row.current_stage, stageProgress: row.stage_progress ?? {},
      dispatchFields: row.dispatch_fields ?? {},
      startedAt: row.started_at ?? null, completedAt: row.completed_at ?? null,
      workOrderNumber: wo.work_order_number, customerName: wo.customer_name,
      productName: wo.product_name, createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }

  private _toStageRecordResponse(sr: any): StageRecordResponse {
    return {
      id: sr.id, productionItemId: sr.production_item_id, stageKey: sr.stage_key,
      stageName: sr.stage_name, isCompleted: sr.is_completed,
      completedBy: sr.completed_by ?? null, completedAt: sr.completed_at ?? null,
      remark: sr.remark ?? null, createdAt: sr.created_at,
    };
  }

  private _toChassisResponse(cr: any): ChassisRecordResponse {
    return {
      id: cr.id, workOrderId: cr.work_order_id ?? null, customerId: cr.customer_id ?? null,
      field: cr.field ?? null, brand: cr.brand ?? null, model: cr.model ?? null,
      chassisNumber: cr.chassis_number ?? null, arrivalDate: cr.arrival_date ?? null,
      customerName: cr.customer_name ?? null, productName: cr.product_name ?? null,
      notes: cr.notes ?? null, createdBy: cr.created_by ?? null,
      createdAt: cr.created_at, updatedAt: cr.updated_at,
    };
  }
}
