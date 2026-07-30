import { supabase } from '../database/client.js';

type RowData = Record<string, unknown>;

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
  async findAll(params: FindAllParams): Promise<FindAllResult> {
    const { stage, workOrderId, search, sortBy = 'created_at', sortOrder = 'desc', page, perPage } = params;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let countQuery = supabase
      .from('production_items')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null);

    let dataQuery = supabase
      .from('production_items')
      .select('*, work_orders!inner(customer_name, product_name, work_order_number)')
      .is('deleted_at', null)
      .order(sortBy as any, { ascending: sortOrder === 'asc' })
      .range(from, to);

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
      countQuery = countQuery.or(`work_orders.customer_name.ilike.${term},work_orders.product_name.ilike.${term}`);
      dataQuery = dataQuery.or(`work_orders.customer_name.ilike.${term},work_orders.product_name.ilike.${term}`);
    }

    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([countQuery, dataQuery]);
    if (countError) throw countError;
    if (dataError) throw dataError;
    return { data: data ?? [], total: count ?? 0 };
  }

  async findById(id: string): Promise<RowData | null> {
    const { data, error } = await supabase
      .from('production_items')
      .select('*, work_orders!inner(customer_name, product_name, work_order_number)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async update(id: string, updates: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('production_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findStageRecords(productionItemId: string): Promise<RowData[]> {
    const { data, error } = await supabase
      .from('production_stage_records')
      .select('*')
      .eq('production_item_id', productionItemId)
      .order('created_at', { ascending: true });

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

  async findChassisRecords(workOrderId?: string, customerId?: string): Promise<RowData[]> {
    let query = supabase
      .from('chassis_records')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (workOrderId) query = query.eq('work_order_id', workOrderId);
    if (customerId) query = query.eq('customer_id', customerId);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async findChassisRecordsByItem(productionItemId: string): Promise<RowData[]> {
    const item = await this.findById(productionItemId);
    if (!item) return [];
    const woId = (item as any).work_order_id;
    if (!woId) return [];
    return this.findChassisRecords(woId as string);
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

  async findChassisRecordById(id: string): Promise<RowData | null> {
    const { data, error } = await supabase
      .from('chassis_records')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async updateChassisRecord(id: string, updates: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('chassis_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findWorkOrderById(id: string): Promise<RowData | null> {
    const { data, error } = await supabase
      .from('work_orders')
      .select('customer_name, product_name')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async findCustomerById(id: string): Promise<RowData | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, company')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }
}
