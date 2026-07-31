import { supabase } from '../database/client.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import { applyOwnershipScope, OwnershipRule } from '../middleware/ownership.js';

type RowData = Record<string, unknown>;

const PRODUCTION_ITEM_RULE: OwnershipRule = {
  table: 'production_items',
  fullAccessRoles: ['admin', 'manager'],
  allowSales: true,
};

const STAGE_RECORD_RULE: OwnershipRule = {
  table: 'production_stage_records',
  column: 'created_by',
  fullAccessRoles: ['admin', 'manager'],
  allowSales: true,
};

const CHASSIS_RULE: OwnershipRule = {
  table: 'chassis_records',
  fullAccessRoles: ['admin', 'manager'],
  allowSales: true,
};

const WORK_ORDER_RULE: OwnershipRule = {
  table: 'work_orders',
  fullAccessRoles: ['admin', 'manager'],
  allowSales: true,
};

export interface FindAllParams {
  stage?: string;
  workOrderId?: string;
  search?: string;
  sortBy: string;
  sortOrder: string;
  page: number;
  perPage: number;
}

export interface FindAllResult {
  data: RowData[];
  total: number;
}

export class ProductionQueries {
  async findAll(params: FindAllParams, user: AuthenticatedUser): Promise<FindAllResult> {
    const { stage, workOrderId, search, sortBy = 'created_at', sortOrder = 'desc', page, perPage } = params;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let countQuery = applyOwnershipScope(
      supabase
        .from('production_items')
        .select('id, work_orders!inner(customer_name, product_name, work_order_number, quotations(quotation_number))', { count: 'exact', head: true })
        .is('deleted_at', null),
      user,
      PRODUCTION_ITEM_RULE,
    );

    let dataQuery = applyOwnershipScope(
      supabase
        .from('production_items')
        .select('*, work_orders!inner(customer_name, product_name, work_order_number, quotations(quotation_number))')
        .is('deleted_at', null)
        .order(sortBy as any, { ascending: sortOrder === 'asc' })
        .range(from, to),
      user,
      PRODUCTION_ITEM_RULE,
    );

    if (stage) {
      countQuery = countQuery.eq('current_stage', stage);
      dataQuery = dataQuery.eq('current_stage', stage);
    }

    if (workOrderId) {
      countQuery = countQuery.eq('work_order_id', workOrderId);
      dataQuery = dataQuery.eq('work_order_id', workOrderId);
    }

    if (search) {
      const term = `%${search}%`;
      countQuery = countQuery.or(`work_orders.customer_name.ilike.${term},work_orders.product_name.ilike.${term},work_orders.work_order_number.ilike.${term},work_orders.quotations.quotation_number.ilike.${term}`);
      dataQuery = dataQuery.or(`work_orders.customer_name.ilike.${term},work_orders.product_name.ilike.${term},work_orders.work_order_number.ilike.${term},work_orders.quotations.quotation_number.ilike.${term}`);
    }

    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([countQuery, dataQuery]);
    if (countError) throw countError;
    if (dataError) throw dataError;
    return { data: data ?? [], total: count ?? 0 };
  }

  async findById(id: string, user: AuthenticatedUser): Promise<RowData | null> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('production_items')
        .select('*, work_orders!inner(customer_name, product_name, work_order_number, quotations(quotation_number))')
        .eq('id', id)
        .single(),
      user,
      PRODUCTION_ITEM_RULE,
    );

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async update(id: string, updates: RowData, user: AuthenticatedUser): Promise<RowData> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('production_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
      user,
      PRODUCTION_ITEM_RULE,
    );

    if (error) throw error;
    return data;
  }

  async findStageRecords(productionItemId: string, user: AuthenticatedUser): Promise<RowData[]> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('production_stage_records')
        .select('*')
        .eq('production_item_id', productionItemId)
        .order('created_at', { ascending: true }),
      user,
      STAGE_RECORD_RULE,
    );

    if (error) throw error;
    return data ?? [];
  }

  async upsertStageRecord(input: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('production_stage_records')
      .upsert(input, { onConflict: 'production_item_id, stage_key', ignoreDuplicates: false })
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

  async findChassisRecords(user: AuthenticatedUser, workOrderId?: string, customerId?: string): Promise<RowData[]> {
    let query = applyOwnershipScope(
      supabase
        .from('chassis_records')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      user,
      CHASSIS_RULE,
    );

    if (workOrderId) query = query.eq('work_order_id', workOrderId);
    if (customerId) query = query.eq('customer_id', customerId);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async findChassisRecordsByItem(productionItemId: string, user: AuthenticatedUser): Promise<RowData[]> {
    const item = await this.findById(productionItemId, user);
    if (!item) return [];
    const woId = (item as any).work_order_id;
    if (!woId) return [];
    return this.findChassisRecords(user, woId as string);
  }

  async createChassisRecord(input: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('chassis_records')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findChassisRecordById(id: string, user: AuthenticatedUser): Promise<RowData | null> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('chassis_records')
        .select('*')
        .eq('id', id)
        .single(),
      user,
      CHASSIS_RULE,
    );

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async updateChassisRecord(id: string, updates: RowData, user: AuthenticatedUser): Promise<RowData> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('chassis_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
      user,
      CHASSIS_RULE,
    );

    if (error) throw error;
    return data;
  }

  async findWorkOrderById(id: string, user: AuthenticatedUser): Promise<RowData | null> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('work_orders')
        .select('customer_name, product_name')
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

  async findCustomerById(id: string, user: AuthenticatedUser): Promise<RowData | null> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('customers')
        .select('id, name, company')
        .eq('id', id)
        .single(),
      user,
      { table: 'customers', fullAccessRoles: ['admin'], allowSales: true },
    );

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }
}
