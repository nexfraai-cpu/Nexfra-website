import { supabase } from '../database/client.js';
import { CustomerRow } from '../database/types.js';

export interface FindAllParams {
  search?: string;
  company?: string;
  sortBy?: string;
  sortOrder?: string;
  page: number;
  perPage: number;
}

export interface FindAllResult {
  data: CustomerRow[];
  total: number;
}

export class CustomerQueries {
  async findAll(params: FindAllParams): Promise<FindAllResult> {
    const { search, company, sortBy = 'created_at', sortOrder = 'desc', page, perPage } = params;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let countQuery = supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null);

    let dataQuery = supabase
      .from('customers')
      .select('*')
      .is('deleted_at', null)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    if (company) {
      const companyFilter = `%${company}%`;
      countQuery = countQuery.ilike('company', companyFilter);
      dataQuery = dataQuery.ilike('company', companyFilter);
    }

    if (search) {
      const term = `%${search}%`;
      const searchFilter =
        `name.ilike.${term},company.ilike.${term},email.ilike.${term},` +
        `phone.ilike.${term},gst.ilike.${term},customer_number.ilike.${term}`;
      countQuery = countQuery.or(searchFilter);
      dataQuery = dataQuery.or(searchFilter);
    }

    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (countError) throw countError;
    if (dataError) throw dataError;

    return {
      data: (data ?? []) as CustomerRow[],
      total: count ?? 0,
    };
  }

  async findById(id: string): Promise<CustomerRow | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as CustomerRow;
  }

  async findByGst(gst: string, excludeId?: string): Promise<CustomerRow | null> {
    let query = supabase
      .from('customers')
      .select('*')
      .eq('gst', gst)
      .is('deleted_at', null)
      .maybeSingle();

    const { data, error } = await query;
    if (error) throw error;

    if (data && excludeId && data.id === excludeId) return null;
    return data as CustomerRow | null;
  }

  async create(input: Partial<CustomerRow>): Promise<CustomerRow> {
    const { data, error } = await supabase
      .from('customers')
      .insert(input)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const msg = error.message.toLowerCase();
        if (msg.includes('gst')) {
          throw Object.assign(new Error('GST must be unique'), { code: '23505_gst', statusCode: 409 });
        }
        throw Object.assign(new Error('Duplicate value'), { code: '23505', statusCode: 409 });
      }
      throw error;
    }
    return data as CustomerRow;
  }

  async update(id: string, updates: Partial<CustomerRow>): Promise<CustomerRow> {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const msg = error.message.toLowerCase();
        if (msg.includes('gst')) {
          throw Object.assign(new Error('GST must be unique'), { code: '23505_gst', statusCode: 409 });
        }
        throw Object.assign(new Error('Duplicate value'), { code: '23505', statusCode: 409 });
      }
      throw error;
    }
    return data as CustomerRow;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }
}
