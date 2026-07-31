import { supabase } from '../database/client.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import { applyOwnershipScope, OwnershipRule } from '../middleware/ownership.js';

type RowData = Record<string, unknown>;

export interface FindAllParams {
  status?: string;
  search?: string;
  urgent?: boolean;
  sortBy: string;
  sortOrder: string;
  page: number;
  perPage: number;
}

export interface FindAllResult {
  data: RowData[];
  total: number;
}

const WORK_ORDER_RULE: OwnershipRule = {
  table: 'work_orders',
  fullAccessRoles: ['admin', 'manager'],
  allowSales: true,
};

const PRODUCTION_ITEM_RULE: OwnershipRule = {
  table: 'production_items',
  fullAccessRoles: ['admin', 'manager'],
  allowSales: true,
};

export class WorkOrderQueries {
  async findAll(params: FindAllParams, user: AuthenticatedUser): Promise<FindAllResult> {
    const { status, search, urgent, sortBy = 'created_at', sortOrder = 'desc', page, perPage } = params;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let countQuery = applyOwnershipScope(
      supabase
        .from('work_orders')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null),
      user,
      WORK_ORDER_RULE,
    );

    let dataQuery = applyOwnershipScope(
      supabase
        .from('work_orders')
        .select('*')
        .is('deleted_at', null)
        .order(sortBy as any, { ascending: sortOrder === 'asc' })
        .range(from, to),
      user,
      WORK_ORDER_RULE,
    );

    if (status) {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }

    if (urgent !== undefined) {
      countQuery = countQuery.eq('is_urgent', urgent);
      dataQuery = dataQuery.eq('is_urgent', urgent);
    }

    if (search) {
      const term = `%${search}%`;
      const filter = `customer_name.ilike.${term},product_name.ilike.${term},work_order_number.ilike.${term}`;
      countQuery = countQuery.or(filter);
      dataQuery = dataQuery.or(filter);
    }

    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([countQuery, dataQuery]);
    if (countError) throw countError;
    if (dataError) throw dataError;
    return { data: data ?? [], total: count ?? 0 };
  }

  async findById(id: string, user: AuthenticatedUser): Promise<RowData | null> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('work_orders')
        .select('*')
        .eq('id', id)
        .single(),
      user,
      WORK_ORDER_RULE,
    );

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async create(input: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('work_orders')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: RowData, user: AuthenticatedUser): Promise<RowData> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('work_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
      user,
      WORK_ORDER_RULE,
    );

    if (error) throw error;
    return data;
  }

  async softDelete(id: string, user: AuthenticatedUser): Promise<void> {
    const { error } = await applyOwnershipScope(
      supabase
        .from('work_orders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id),
      user,
      WORK_ORDER_RULE,
    );

    if (error) throw error;
  }

  async findQuotationById(id: string, user: AuthenticatedUser): Promise<RowData | null> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .single(),
      user,
      { table: 'quotations', fullAccessRoles: ['admin', 'manager'], allowSales: true, includeAssignedTo: true },
    );

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async findExistingByQuotation(quotationId: string, user: AuthenticatedUser): Promise<RowData | null> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('work_orders')
        .select('id')
        .eq('quotation_id', quotationId)
        .is('deleted_at', null)
        .maybeSingle(),
      user,
      WORK_ORDER_RULE,
    );

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data ?? null;
  }

  async findProductionItems(workOrderId: string, user: AuthenticatedUser): Promise<RowData[]> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('production_items')
        .select('id, current_stage, started_at, completed_at')
        .eq('work_order_id', workOrderId)
        .is('deleted_at', null),
      user,
      PRODUCTION_ITEM_RULE,
    );

    if (error) throw error;
    return data ?? [];
  }

  async createProductionItem(input: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('production_items')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createStageRecord(input: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('production_stage_records')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
