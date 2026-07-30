import { supabase } from '../database/client.js';

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

export class WorkOrderQueries {
  async findAll(params: FindAllParams): Promise<FindAllResult> {
    const { status, search, urgent, sortBy = 'created_at', sortOrder = 'desc', page, perPage } = params;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let countQuery = supabase
      .from('work_orders')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null);

    let dataQuery = supabase
      .from('work_orders')
      .select('*')
      .is('deleted_at', null)
      .order(sortBy as any, { ascending: sortOrder === 'asc' })
      .range(from, to);

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

  async findById(id: string): Promise<RowData | null> {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', id)
      .single();

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

  async update(id: string, updates: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('work_orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async findQuotationById(id: string): Promise<RowData | null> {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async findExistingByQuotation(quotationId: string): Promise<RowData | null> {
    const { data, error } = await supabase
      .from('work_orders')
      .select('id')
      .eq('quotation_id', quotationId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data ?? null;
  }

  async findProductionItems(workOrderId: string): Promise<RowData[]> {
    const { data, error } = await supabase
      .from('production_items')
      .select('id, current_stage, started_at, completed_at')
      .eq('work_order_id', workOrderId)
      .is('deleted_at', null);

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
