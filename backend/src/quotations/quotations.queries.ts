import { supabase } from '../database/client.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import { applyOwnershipScope, OwnershipRule } from '../middleware/ownership.js';

type RowData = Record<string, unknown>;

const QUOTATION_RULE: OwnershipRule = {
  table: 'quotations',
  fullAccessRoles: ['admin', 'manager'],
  allowSales: true,
  includeAssignedTo: true,
};

const SPEC_VALUE_RULE: OwnershipRule = {
  table: 'quotation_spec_values',
  fullAccessRoles: ['admin', 'manager'],
  allowSales: true,
};

const CUSTOM_ITEM_RULE: OwnershipRule = {
  table: 'quotation_custom_items',
  fullAccessRoles: ['admin', 'manager'],
  allowSales: true,
};

export interface FindAllParams {
  status?: string;
  search?: string;
  customerName?: string;
  sortBy: string;
  sortOrder: string;
  page: number;
  perPage: number;
}

export interface FindAllResult {
  data: RowData[];
  total: number;
}

export class QuotationQueries {
  /*** Quotations ***/

  async findAll(params: FindAllParams, user: AuthenticatedUser): Promise<FindAllResult> {
    const { status, search, customerName, sortBy = 'created_at', sortOrder = 'desc', page, perPage } = params;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let countQuery = applyOwnershipScope(
      supabase
        .from('quotations')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null),
      user,
      QUOTATION_RULE,
    );

    let dataQuery = applyOwnershipScope(
      supabase
        .from('quotations')
        .select('id, quotation_number, version, customer_name, product_key, template_key, total, status, order_qty, created_by, created_at, updated_at')
        .is('deleted_at', null)
        .order(sortBy as any, { ascending: sortOrder === 'asc' })
        .range(from, to),
      user,
      QUOTATION_RULE,
    );

    if (status) {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }

    if (customerName) {
      const term = `%${customerName}%`;
      countQuery = countQuery.ilike('customer_name', term);
      dataQuery = dataQuery.ilike('customer_name', term);
    }

    if (search) {
      const term = `%${search}%`;
      const filter = `customer_name.ilike.${term},quotation_number.ilike.${term}`;
      countQuery = countQuery.or(filter);
      dataQuery = dataQuery.or(filter);
    }

    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (countError) throw countError;
    if (dataError) throw dataError;

    return { data: data ?? [], total: count ?? 0 };
  }

  async findById(id: string, user: AuthenticatedUser): Promise<RowData | null> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .single(),
      user,
      QUOTATION_RULE,
    );

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async create(input: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('quotations')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: RowData, user: AuthenticatedUser): Promise<RowData> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('quotations')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
      user,
      QUOTATION_RULE,
    );

    if (error) throw error;
    return data;
  }

  async softDelete(id: string, user: AuthenticatedUser): Promise<void> {
    const { error } = await applyOwnershipScope(
      supabase
        .from('quotations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id),
      user,
      QUOTATION_RULE,
    );

    if (error) throw error;
  }

  /*** Spec Values ***/

  async findSpecValues(quotationId: string, user: AuthenticatedUser): Promise<RowData[]> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('quotation_spec_values')
        .select('*')
        .eq('quotation_id', quotationId),
      user,
      SPEC_VALUE_RULE,
    );

    if (error) throw error;
    return data ?? [];
  }

  async replaceSpecValues(quotationId: string, values: RowData[]): Promise<RowData[]> {
    await supabase
      .from('quotation_spec_values')
      .delete()
      .eq('quotation_id', quotationId);

    if (values.length === 0) return [];

    const withQuotationId = values.map(v => ({ ...v, quotation_id: quotationId }));
    const { data, error } = await supabase
      .from('quotation_spec_values')
      .insert(withQuotationId)
      .select();

    if (error) throw error;
    return data ?? [];
  }

  /*** Custom Items ***/

  async findCustomItems(quotationId: string, user: AuthenticatedUser): Promise<RowData[]> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('quotation_custom_items')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('sort_order', { ascending: true }),
      user,
      CUSTOM_ITEM_RULE,
    );

    if (error) throw error;
    return data ?? [];
  }

  async replaceCustomItems(quotationId: string, items: RowData[]): Promise<RowData[]> {
    await supabase
      .from('quotation_custom_items')
      .delete()
      .eq('quotation_id', quotationId);

    if (items.length === 0) return [];

    const withQuotationId = items.map((v, i) => ({ ...v, quotation_id: quotationId, sort_order: v.sort_order ?? i }));
    const { data, error } = await supabase
      .from('quotation_custom_items')
      .insert(withQuotationId)
      .select();

    if (error) throw error;
    return data ?? [];
  }

  /*** Pricing Lookups ***/

  async findTemplateBasePrice(templateKey: string): Promise<number | null> {
    const { data, error } = await supabase
      .from('product_templates')
      .select('base_price')
      .eq('key', templateKey)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data ? Number(data.base_price) : null;
  }

  async findSpecPriceDiffs(_specKey: string, selectedValues: string[]): Promise<RowData[]> {
    if (selectedValues.length === 0) return [];

    const { data, error } = await supabase
      .from('product_spec_options')
      .select('spec_id, option_name, price_diff')
      .in('option_name', selectedValues);

    if (error) throw error;
    return data ?? [];
  }

  async findAppSettings(key: string): Promise<RowData | null> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  }
}
