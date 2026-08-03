import { QuotationQueries } from './quotations.queries.js';
import { formatQuotationNumber } from './quotation-number.service.js';
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
import {
  QuotationResponse,
  QuotationSummaryResponse,
  PaginatedResult,
} from './quotations.types.js';
import { logger } from '../config/logger.js';
import { supabase } from '../database/client.js';
import { AuthenticatedUser } from '../middleware/auth.js';

type RowData = Record<string, unknown>;

interface PricingResult {
  specTotal: number;
  customItemsTotal: number;
  total: number;
}

export class QuotationsService {
  constructor(private queries: QuotationQueries) {}

  async list(
    options: {
      status?: string;
      search?: string;
      customerName?: string;
      financeView?: 'inbox' | 'mine';
      sortBy?: string;
      sortOrder?: string;
      page: number;
      perPage: number;
    },
    user: AuthenticatedUser,
  ): Promise<PaginatedResult<QuotationSummaryResponse>> {
    const { data, total } = await this.queries.findAll(options as any, user);

    logger.info({ actorId: user.id, page: options.page, total }, 'Quotations listed');

    return {
      data: data.map(this._toSummaryResponse),
      meta: {
        total,
        page: options.page,
        perPage: options.perPage,
        totalPages: Math.ceil(total / options.perPage) || 1,
      },
    };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<QuotationResponse> {
    const quotation = await this.queries.findById(id, user);
    if (!quotation || quotation.deleted_at) {
      throw new QuotationNotFoundError(id);
    }

    const specValues = await this.queries.findSpecValues(id, user);
    const customItems = await this.queries.findCustomItems(id, user);

    logger.info({ actorId: user.id, quotationId: id }, 'Quotation retrieved');
    return this._toDetailResponse(quotation, specValues, customItems);
  }

  async create(input: Record<string, unknown>, user: AuthenticatedUser): Promise<QuotationResponse> {
    const pricing = input.manualTotal != null
      ? { specTotal: 0, customItemsTotal: 0, total: Number(input.manualTotal) }
      : await this._calculatePricing(
          input.templateKey as string | undefined,
          input.specValues as any[] | undefined,
          input.customItems as any[] | undefined,
          input.orderQty as number | undefined,
        );

    const year = new Date().getFullYear();
    const seqNum = typeof (this.queries as any).getNextSequenceForYear === 'function'
      ? await (this.queries as any).getNextSequenceForYear(year)
      : 1;
    const quotationNumber = formatQuotationNumber(String(input.customerName || ''), year, seqNum);

    const quotation = await this.queries.create({
      quotation_number: quotationNumber,
      customer_id: input.customerId ?? null,
      customer_name: input.customerName,
      customer_details: input.customerDetails ?? {},
      product_key: input.productKey ?? null,
      template_key: input.templateKey ?? null,
      capacity: input.capacity ?? null,
      dimensions: input.dimensions ?? {},
      total: pricing.total,
      manual_total: input.manualTotal ?? null,
      gst_rate: input.gstRate ?? 18,
      order_qty: input.orderQty ?? 1,
      terms: input.terms ?? [],
      scope_of_work: input.scopeOfWork ?? null,
      bank_details: input.bankDetails ?? {},
      notes: input.notes ?? null,
      status: 'Draft',
      version: 1,
      created_by: user.id,
      updated_by: user.id,
    } as any);

    const specValues = await this.queries.replaceSpecValues(
      quotation.id as string,
      this._buildSpecValueRows(quotation.id as string, input.specValues as any[] | undefined, pricing),
    );

    const customItems = await this.queries.replaceCustomItems(
      quotation.id as string,
      this._buildCustomItemRows(input.customItems as any[] | undefined),
    );

    await this._logAudit(user.id, 'create', 'quotation', quotation.id as string, null, {
      quotationNumber: (quotation as any).quotation_number,
      total: pricing.total,
    });

    logger.info({ actorId: user.id, quotationId: quotation.id, total: pricing.total }, 'Quotation created');
    return this._toDetailResponse(quotation, specValues, customItems);
  }

  async update(id: string, input: Record<string, unknown>, user: AuthenticatedUser): Promise<QuotationResponse> {
    const quotation = await this.queries.findById(id, user);
    if (!quotation || quotation.deleted_at) throw new QuotationNotFoundError(id);
    const status = (quotation as any).status;
    if (status !== 'Draft' && status !== 'Pending') {
      throw new QuotationNotDraftError(status);
    }

    const merged = { ...quotation, ...this._pickInputFields(input) };

    const pricing = input.manualTotal != null
      ? { specTotal: 0, customItemsTotal: 0, total: Number(input.manualTotal) }
      : await this._calculatePricing(
          (merged as any).template_key,
          input.specValues as any[] | undefined ?? (quotation as any).specValues,
          input.customItems as any[] | undefined ?? (quotation as any).customItems,
          (merged as any).order_qty,
        );

    const oldData = { ...quotation };

    const updates: Record<string, unknown> = {
      total: pricing.total,
      version: ((quotation as any).version || 0) + 1,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    const fieldMap: Record<string, string> = {
      customerId: 'customer_id',
      customerName: 'customer_name',
      customerDetails: 'customer_details',
      productKey: 'product_key',
      templateKey: 'template_key',
      capacity: 'capacity',
      dimensions: 'dimensions',
      manualTotal: 'manual_total',
      gstRate: 'gst_rate',
      orderQty: 'order_qty',
      terms: 'terms',
      scopeOfWork: 'scope_of_work',
      bankDetails: 'bank_details',
      notes: 'notes',
    };

    for (const [inputKey, dbKey] of Object.entries(fieldMap)) {
      if (input[inputKey] !== undefined) {
        updates[dbKey] = input[inputKey] === null ? null : input[inputKey];
      }
    }

    const updated = await this.queries.update(id, updates as any, user);

    const specRows = this._buildSpecValueRows(id, input.specValues as any[] | undefined, pricing);
    const specValues = input.specValues !== undefined
      ? await this.queries.replaceSpecValues(id, specRows)
      : await this.queries.findSpecValues(id, user);

    const customItems = input.customItems !== undefined
      ? await this.queries.replaceCustomItems(id, this._buildCustomItemRows(input.customItems as any[] | undefined))
      : await this.queries.findCustomItems(id, user);

    await this._logAudit(user.id, 'update', 'quotation', id, oldData, updated);

    logger.info({ actorId: user.id, quotationId: id, version: updates.version }, 'Quotation updated');
    return this._toDetailResponse(updated, specValues, customItems);
  }

  async softDelete(id: string, user: AuthenticatedUser): Promise<void> {
    const quotation = await this.queries.findById(id, user);
    if (!quotation || quotation.deleted_at) throw new QuotationNotFoundError(id);
    if ((quotation as any).status !== 'Draft') {
      throw new QuotationNotDraftError((quotation as any).status);
    }

    await this.queries.softDelete(id, user);

    await this._logAudit(user.id, 'delete', 'quotation', id, quotation, { deleted: true });

    logger.info({ actorId: user.id, quotationId: id }, 'Quotation soft-deleted');
  }

  async submit(id: string, user: AuthenticatedUser): Promise<QuotationResponse> {
    const quotation = await this.queries.findById(id, user);
    if (!quotation || quotation.deleted_at) throw new QuotationNotFoundError(id);
    if ((quotation as any).status !== 'Draft') {
      throw new InvalidStatusTransitionError((quotation as any).status, 'Pending');
    }

    const updated = await this.queries.update(id, { status: 'Pending', updated_by: user.id } as any, user);
    const specValues = await this.queries.findSpecValues(id, user);
    const customItems = await this.queries.findCustomItems(id, user);

    await this._logAudit(user.id, 'submit', 'quotation', id, { status: 'Draft' }, { status: 'Pending' });

    logger.info({ actorId: user.id, quotationId: id }, 'Quotation submitted for approval');
    return this._toDetailResponse(updated, specValues, customItems);
  }

  async approve(id: string, _comment: string | undefined, user: AuthenticatedUser): Promise<QuotationResponse> {
    const quotation = await this.queries.findById(id, user);
    if (!quotation || quotation.deleted_at) throw new QuotationNotFoundError(id);

    const statusBefore = (quotation as any).status;
    console.log(`[APPROVE SERVICE] id=${id} statusBeforeUpdate=${statusBefore}`);
    if (statusBefore === 'Approved') throw new QuotationAlreadyApprovedError();
    if (statusBefore === 'Denied') throw new QuotationAlreadyDeniedError();
    if (statusBefore !== 'Pending') throw new QuotationNotPendingError(statusBefore);

    const updated = await this.queries.update(id, {
      status: 'Approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_by: user.id,
    } as any, user);

    const statusAfter = (updated as any).status;
    console.log(`[APPROVE SERVICE] id=${id} statusAfterUpdate=${statusAfter}`);

    const specValues = await this.queries.findSpecValues(id, user);
    const customItems = await this.queries.findCustomItems(id, user);

    await this._logAudit(user.id, 'approve', 'quotation', id, { status: 'Pending' }, { status: 'Approved' });

    logger.info({ actorId: user.id, quotationId: id }, 'Quotation approved');
    return this._toDetailResponse(updated, specValues, customItems);
  }

  async deny(id: string, reason: string, user: AuthenticatedUser): Promise<QuotationResponse> {
    if (!reason) throw new DenyReasonRequiredError();

    const quotation = await this.queries.findById(id, user);
    if (!quotation || quotation.deleted_at) throw new QuotationNotFoundError(id);

    const status = (quotation as any).status;
    if (status === 'Approved') throw new QuotationAlreadyApprovedError();
    if (status === 'Denied') throw new QuotationAlreadyDeniedError();
    if (status !== 'Pending') throw new QuotationNotPendingError(status);

    const updated = await this.queries.update(id, {
      status: 'Denied',
      denied_by: user.id,
      denied_at: new Date().toISOString(),
      denied_reason: reason,
      updated_by: user.id,
    } as any, user);

    const specValues = await this.queries.findSpecValues(id, user);
    const customItems = await this.queries.findCustomItems(id, user);

    await this._logAudit(user.id, 'deny', 'quotation', id, { status: 'Pending' }, { status: 'Denied', reason });

    logger.info({ actorId: user.id, quotationId: id }, 'Quotation denied');
    return this._toDetailResponse(updated, specValues, customItems);
  }

  async claim(id: string, paymentDueDate: string | null | undefined, user: AuthenticatedUser): Promise<QuotationResponse> {
    const quotation = await this.queries.findById(id, user);
    if (!quotation || quotation.deleted_at) throw new QuotationNotFoundError(id);

    const status = (quotation as any).status;
    if (status !== 'Approved') throw new QuotationNotApprovedError(status);

    const currentOwner = (quotation as any).finance_owner ?? null;
    // Another finance employee may not take ownership; only admin can reassign.
    if (user.role !== 'admin' && currentOwner && currentOwner !== user.id) {
      throw new QuotationAlreadyClaimedError();
    }

    const updated = await this.queries.update(id, {
      finance_owner: user.id,
      payment_due_date: paymentDueDate || null,
      updated_by: user.id,
    } as any, user);

    if (!updated) throw new QuotationNotFoundError(id);

    const specValues = await this.queries.findSpecValues(id, user);
    const customItems = await this.queries.findCustomItems(id, user);

    await this._logAudit(user.id, 'finance-claim', 'quotation', id, { finance_owner: currentOwner }, {
      finance_owner: user.id,
      payment_due_date: paymentDueDate || null,
    });

    logger.info({ actorId: user.id, quotationId: id, paymentDueDate }, 'Quotation claimed by finance');
    return this._toDetailResponse(updated, specValues, customItems);
  }

  /*** Private ***/

  private async _calculatePricing(
    templateKey: string | undefined,
    specValues: any[] | undefined,
    customItems: any[] | undefined,
    orderQty: number | undefined,
  ): Promise<PricingResult> {
    let specTotal = 0;
    let customItemsTotal = 0;

    if (templateKey && specValues && specValues.length > 0) {
      const basePrice = await this.queries.findTemplateBasePrice(templateKey);
      if (basePrice === null) {
        throw new TemplatePricingNotFoundError(templateKey);
      }
      specTotal = basePrice;

      for (const sv of specValues) {
        if (sv.customPrice != null) {
          specTotal += Number(sv.customPrice);
        } else if (sv.effectivePriceDiff != null) {
          specTotal += Number(sv.effectivePriceDiff);
        } else if (sv.selectedValue) {
          specTotal += 0;
        }
      }
    }

    if (specValues && specValues.length > 0 && !templateKey) {
      for (const sv of specValues) {
        if (sv.customPrice != null) {
          specTotal += Number(sv.customPrice);
        } else if (sv.effectivePriceDiff != null) {
          specTotal += Number(sv.effectivePriceDiff);
        }
      }
    }

    if (customItems && customItems.length > 0) {
      for (const ci of customItems) {
        const qty = ci.quantity ?? 1;
        const price = ci.price ?? 0;
        customItemsTotal += qty * price;
      }
    }

    const qty = orderQty ?? 1;
    const total = (specTotal + customItemsTotal) * qty;

    return { specTotal, customItemsTotal, total };
  }

  private _buildSpecValueRows(_quotationId: string, specValues: any[] | undefined, _pricing: PricingResult): RowData[] {
    if (!specValues || specValues.length === 0) return [];
    return specValues.map((sv) => ({
      spec_key: sv.specKey,
      spec_name: sv.specName ?? sv.specKey,
      section: sv.section ?? 'General',
      selected_value: sv.selectedValue ?? null,
      custom_description: sv.customDescription ?? null,
      custom_price: sv.customPrice ?? null,
      is_not_required: sv.isNotRequired ?? false,
      effective_price_diff: sv.effectivePriceDiff ?? sv.customPrice ?? 0,
    }));
  }

  private _buildCustomItemRows(customItems: any[] | undefined): RowData[] {
    if (!customItems || customItems.length === 0) return [];
    return customItems.map((ci, i) => ({
      name: ci.name,
      description: ci.description ?? null,
      quantity: ci.quantity ?? 1,
      price: ci.price ?? 0,
      sort_order: ci.sortOrder ?? i,
    }));
  }

  private _pickInputFields(input: Record<string, unknown>): Record<string, unknown> {
    const picked: Record<string, unknown> = {};
    const fields = [
      'customerId', 'customerName', 'customerDetails', 'productKey', 'templateKey',
      'capacity', 'dimensions', 'manualTotal', 'gstRate', 'orderQty',
      'terms', 'scopeOfWork', 'bankDetails', 'notes',
    ];
    for (const f of fields) {
      if (input[f] !== undefined) picked[f] = input[f];
    }
    return picked;
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
      description: `${action} quotation`,
      metadata: { old: oldValue, new: newValue },
    });
    if (error) {
      logger.error({ error, action, entityId }, 'Audit log insertion failed');
    }
  }

  private _toSummaryResponse(row: any): QuotationSummaryResponse {
    return {
      id: row.id,
      quotationNumber: row.quotation_number,
      version: row.version ?? 1,
      customerName: row.customer_name,
      productKey: row.product_key ?? null,
      templateKey: row.template_key ?? null,
      total: Number(row.total),
      status: row.status,
      orderQty: row.order_qty,
      financeOwner: row.finance_owner ?? null,
      paymentDueDate: row.payment_due_date ?? null,
      createdBy: row.created_by ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private _toDetailResponse(quotation: any, specValues: any[], customItems: any[]): QuotationResponse {
    return {
      id: quotation.id,
      quotationNumber: quotation.quotation_number,
      version: quotation.version ?? 1,
      customerId: quotation.customer_id ?? null,
      customerName: quotation.customer_name,
      customerDetails: quotation.customer_details ?? {},
      productKey: quotation.product_key ?? null,
      templateKey: quotation.template_key ?? null,
      capacity: quotation.capacity ?? null,
      dimensions: quotation.dimensions ?? {},
      total: Number(quotation.total),
      manualTotal: quotation.manual_total != null ? Number(quotation.manual_total) : null,
      gstRate: Number(quotation.gst_rate),
      orderQty: quotation.order_qty,
      status: quotation.status,
      terms: quotation.terms ?? [],
      scopeOfWork: quotation.scope_of_work ?? null,
      bankDetails: quotation.bank_details ?? {},
      notes: quotation.notes ?? null,
      approvedBy: quotation.approved_by ?? null,
      approvedAt: quotation.approved_at ?? null,
      deniedBy: quotation.denied_by ?? null,
      deniedAt: quotation.denied_at ?? null,
      deniedReason: quotation.denied_reason ?? null,
      financeOwner: quotation.finance_owner ?? null,
      paymentDueDate: quotation.payment_due_date ?? null,
      createdBy: quotation.created_by ?? null,
      createdAt: quotation.created_at,
      updatedAt: quotation.updated_at,
      specValues: (specValues ?? []).map((sv: any) => ({
        id: sv.id,
        quotationId: sv.quotation_id,
        specKey: sv.spec_key,
        specName: sv.spec_name,
        section: sv.section,
        selectedValue: sv.selected_value ?? null,
        customDescription: sv.custom_description ?? null,
        customPrice: sv.custom_price != null ? Number(sv.custom_price) : null,
        isNotRequired: sv.is_not_required ?? false,
        effectivePriceDiff: Number(sv.effective_price_diff),
      })),
      customItems: (customItems ?? []).map((ci: any) => ({
        id: ci.id,
        quotationId: ci.quotation_id,
        name: ci.name,
        description: ci.description ?? null,
        quantity: ci.quantity,
        price: Number(ci.price),
        sortOrder: ci.sort_order,
        createdAt: ci.created_at,
      })),
    };
  }
}
