import { supabase } from '../database/client.js';

type RowData = Record<string, unknown>;

export interface FindSalesParams {
  status?: string; search?: string;
  sortBy: string; sortOrder: string; page: number; perPage: number;
}

export interface FindPaymentsParams {
  saleId?: string; mode?: string; startDate?: string; endDate?: string;
  sortBy: string; sortOrder: string; page: number; perPage: number;
}

export interface FindLedgerParams {
  startDate?: string; endDate?: string; customerName?: string;
  page: number; perPage: number;
}

export interface FindAuditLogsParams {
  entityType?: string; entityId?: string; action?: string;
  page: number; perPage: number;
}

export interface CountResult {
  data: RowData[]; total: number;
}

export class FinanceQueries {
  /*** Sales ***/

  async findSales(params: FindSalesParams): Promise<CountResult> {
    const { status, search, sortBy = 'created_at', sortOrder = 'desc', page, perPage } = params;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let countQuery = supabase.from('sales').select('id', { count: 'exact', head: true }).is('deleted_at', null);
    let dataQuery = supabase.from('sales').select('*').is('deleted_at', null)
      .order(sortBy as any, { ascending: sortOrder === 'asc' }).range(from, to);

    if (status) { countQuery = countQuery.eq('status', status); dataQuery = dataQuery.eq('status', status); }
    if (search) {
      const term = `%${search}%`;
      const flt = `customer_name.ilike.${term},product_name.ilike.${term},invoice_number.ilike.${term}`;
      countQuery = countQuery.or(flt); dataQuery = dataQuery.or(flt);
    }

    const [{ count, error: ce }, { data, error: de }] = await Promise.all([countQuery, dataQuery]);
    if (ce) throw ce;
    if (de) throw de;
    return { data: data ?? [], total: count ?? 0 };
  }

  async findSaleById(id: string): Promise<RowData | null> {
    const { data, error } = await supabase.from('sales').select('*').eq('id', id).single();
    if (error) { if (error.code === 'PGRST116') return null; throw error; }
    return data;
  }

  async findSaleByInvoice(invoiceNumber: string): Promise<RowData | null> {
    const { data, error } = await supabase.from('sales').select('id').eq('invoice_number', invoiceNumber).is('deleted_at', null).maybeSingle();
    if (error) { if (error.code === 'PGRST116') return null; throw error; }
    return data ?? null;
  }

  async getNextInvoiceNumber(): Promise<string> {
    const { data, error } = await supabase
      .from('sales')
      .select('invoice_number')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    const lastNum = data && data.length > 0 ? parseInt((data[0] as any).invoice_number.replace('INV-', ''), 10) : 0;
    return `INV-${String(lastNum + 1).padStart(6, '0')}`;
  }

  async createSale(input: RowData): Promise<RowData> {
    const { data, error } = await supabase.from('sales').insert(input).select().single();
    if (error) {
      if (error.code === '23505') {
        throw Object.assign(new Error('Invoice number already exists'), { code: '23505_inv', statusCode: 409 });
      }
      throw error;
    }
    return data;
  }

  async updateSale(id: string, updates: RowData): Promise<RowData> {
    const { data, error } = await supabase.from('sales').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async softDeleteSale(id: string): Promise<void> {
    const { error } = await supabase.from('sales').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }

  /*** Payments ***/

  async findPaymentsBySale(saleId: string): Promise<RowData[]> {
    const { data, error } = await supabase.from('payments').select('*')
      .eq('sale_id', saleId).is('deleted_at', null).order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findPayments(params: FindPaymentsParams): Promise<CountResult> {
    const { saleId, mode, startDate, endDate, sortBy = 'created_at', sortOrder = 'desc', page, perPage } = params;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let countQuery = supabase.from('payments').select('id', { count: 'exact', head: true }).is('deleted_at', null);
    let dataQuery = supabase.from('payments').select('*, sales!inner(invoice_number, customer_name)').is('deleted_at', null)
      .order(sortBy as any, { ascending: sortOrder === 'asc' }).range(from, to);

    if (saleId) { countQuery = countQuery.eq('sale_id', saleId); dataQuery = dataQuery.eq('sale_id', saleId); }
    if (mode) { countQuery = countQuery.eq('mode', mode); dataQuery = dataQuery.eq('mode', mode); }
    if (startDate) {
      countQuery = countQuery.gte('payment_date', startDate);
      dataQuery = dataQuery.gte('payment_date', startDate);
    }
    if (endDate) {
      countQuery = countQuery.lte('payment_date', endDate);
      dataQuery = dataQuery.lte('payment_date', endDate);
    }

    const [{ count, error: ce }, { data, error: de }] = await Promise.all([countQuery, dataQuery]);
    if (ce) throw ce;
    if (de) throw de;
    return { data: data ?? [], total: count ?? 0 };
  }

  async findPaymentById(id: string): Promise<RowData | null> {
    const { data, error } = await supabase.from('payments').select('*, sales!inner(invoice_number, customer_name)').eq('id', id).single();
    if (error) { if (error.code === 'PGRST116') return null; throw error; }
    return data;
  }

  async createPayment(input: RowData): Promise<RowData> {
    const { data, error } = await supabase.from('payments').insert(input).select().single();
    if (error) throw error;
    return data;
  }

  async updatePayment(id: string, updates: RowData): Promise<RowData> {
    const { data, error } = await supabase.from('payments').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async softDeletePayment(id: string): Promise<void> {
    const { error } = await supabase.from('payments').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }

  /*** Ledger (unified sales + payments) ***/

  async getLedgerEntries(params: FindLedgerParams): Promise<CountResult> {
    const { startDate, endDate, customerName, page, perPage } = params;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let salesQuery = supabase.from('sales').select('id, created_at, invoice_number, customer_name, product_name, amount, notes, status')
      .is('deleted_at', null);
    let paymentsQuery = supabase.from('payments').select('id, payment_date, payment_number, sales!inner(customer_name, product_name), amount, notes, sale_id')
      .is('deleted_at', null);

    if (startDate) {
      salesQuery = salesQuery.gte('created_at', startDate);
      paymentsQuery = paymentsQuery.gte('payment_date', startDate);
    }
    if (endDate) {
      salesQuery = salesQuery.lte('created_at', endDate);
      paymentsQuery = paymentsQuery.lte('payment_date', endDate);
    }
    if (customerName) {
      salesQuery = salesQuery.ilike('customer_name', `%${customerName}%`);
      paymentsQuery = paymentsQuery.ilike('sales.customer_name', `%${customerName}%`);
    }

    const [salesResult, paymentsResult] = await Promise.all([salesQuery, paymentsQuery]);
    if (salesResult.error) throw salesResult.error;
    if (paymentsResult.error) throw paymentsResult.error;

    const salesData = (salesResult.data ?? []).map((r: any) => ({
      id: r.id, date: r.created_at, type: 'sale' as const,
      reference: r.invoice_number, customerName: r.customer_name,
      productName: r.product_name, debit: Number(r.amount), credit: 0,
      description: r.notes, sortDate: r.created_at,
    }));

    const paymentsData = (paymentsResult.data ?? []).map((r: any) => ({
      id: r.id, date: r.payment_date, type: 'payment' as const,
      reference: r.payment_number, customerName: r.sales.customer_name,
      productName: r.sales.product_name, debit: 0, credit: Number(r.amount),
      description: r.notes, sortDate: r.payment_date,
    }));

    const all = [...salesData, ...paymentsData].sort(
      (a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime(),
    );

    const total = all.length;
    const pageData = all.slice(from, to + 1);

    let runningBalance = 0;
    const entries = pageData.reverse().map((e) => {
      runningBalance += (e.type === 'sale' ? e.debit : 0) - (e.type === 'payment' ? e.credit : 0);
      return { ...e, balance: runningBalance };
    }).reverse();

    return { data: entries as any[], total };
  }

  /*** Transactions (unified view) ***/

  async getTransactions(params: FindLedgerParams & { type?: string }): Promise<CountResult> {
    const { type, startDate, endDate, customerName, page, perPage } = params;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const salesOnly = type === 'Sale';
    const paymentsOnly = type === 'Payment';

    let salesQuery: any = null;
    let paymentsQuery: any = null;

    if (!paymentsOnly) {
      salesQuery = supabase.from('sales').select('id, created_at, invoice_number, customer_name, product_name, amount, status, notes')
        .is('deleted_at', null);
      if (startDate) salesQuery = salesQuery.gte('created_at', startDate);
      if (endDate) salesQuery = salesQuery.lte('created_at', endDate);
      if (customerName) salesQuery = salesQuery.ilike('customer_name', `%${customerName}%`);
    }

    if (!salesOnly) {
      paymentsQuery = supabase.from('payments').select('id, payment_date, payment_number, mode, sales!inner(customer_name, product_name), amount, notes')
        .is('deleted_at', null);
      if (startDate) paymentsQuery = paymentsQuery.gte('payment_date', startDate);
      if (endDate) paymentsQuery = paymentsQuery.lte('payment_date', endDate);
      if (customerName) paymentsQuery = paymentsQuery.ilike('sales.customer_name', `%${customerName}%`);
    }

    const results = await Promise.all([
      salesQuery ? salesQuery : Promise.resolve({ data: [], error: null }),
      paymentsQuery ? paymentsQuery : Promise.resolve({ data: [], error: null }),
    ]);

    if (results[0].error) throw results[0].error;
    if (results[1].error) throw results[1].error;

    const salesData = (results[0].data ?? []).map((r: any) => ({
      id: r.id, date: r.created_at, type: 'Sale' as const,
      referenceNumber: r.invoice_number, customerName: r.customer_name,
      productName: r.product_name, amount: Number(r.amount),
      mode: null, status: r.status, description: r.notes,
      sortDate: r.created_at,
    }));

    const paymentsData = (results[1].data ?? []).map((r: any) => ({
      id: r.id, date: r.payment_date, type: 'Payment' as const,
      referenceNumber: r.payment_number, customerName: r.sales.customer_name,
      productName: r.sales.product_name, amount: Number(r.amount),
      mode: r.mode, status: null, description: r.notes,
      sortDate: r.payment_date,
    }));

    const all = [...salesData, ...paymentsData].sort(
      (a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime(),
    );

    const total = all.length;
    return { data: all.slice(from, to + 1) as any[], total };
  }

  /*** Audit Logs ***/

  async findAuditLogs(params: FindAuditLogsParams): Promise<CountResult> {
    const { entityType, entityId, action, page, perPage } = params;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let countQuery = supabase.from('audit_logs').select('id', { count: 'exact', head: true });
    let dataQuery = supabase.from('audit_logs')
      .select('*, employees!left(full_name)')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (entityType) {
      countQuery = countQuery.eq('entity_type', entityType);
      dataQuery = dataQuery.eq('entity_type', entityType);
    }
    if (entityId) {
      countQuery = countQuery.eq('entity_id', entityId);
      dataQuery = dataQuery.eq('entity_id', entityId);
    }
    if (action) {
      countQuery = countQuery.eq('action', action);
      dataQuery = dataQuery.eq('action', action);
    }

    const [{ count, error: ce }, { data, error: de }] = await Promise.all([countQuery, dataQuery]);
    if (ce) throw ce;
    if (de) throw de;
    return { data: data ?? [], total: count ?? 0 };
  }

  /*** Aggregations ***/

  async getSaleTotalPayments(saleId: string): Promise<number> {
    const { data, error } = await supabase
      .from('payments')
      .select('amount', { count: 'exact', head: false })
      .eq('sale_id', saleId)
      .is('deleted_at', null);

    if (error) throw error;
    return (data ?? []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  }

  async getMonthlyStats(): Promise<RowData[]> {
    const { data, error } = await supabase.from('v_monthly_revenue').select('*').limit(12);
    if (error) throw error;
    return data ?? [];
  }

  async getOutstandingBalances(): Promise<RowData[]> {
    const { data, error } = await supabase.from('v_customer_outstanding').select('*').order('outstanding', { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  }

  async recalculateCustomerOutstanding(customerName: string): Promise<void> {
    const { error } = await supabase.rpc('recalculate_customer_outstanding_by_name', { p_customer_name: customerName });
    if (error) {
      const { error: e2 } = await supabase.from('customers').select('id').eq('company', customerName).maybeSingle();
      if (e2) throw e2;
    }
  }

  async findCustomerByCompany(company: string): Promise<RowData | null> {
    const { data, error } = await supabase.from('customers').select('id').eq('company', company).is('deleted_at', null).maybeSingle();
    if (error) { if (error.code === 'PGRST116') return null; throw error; }
    return data ?? null;
  }
}
