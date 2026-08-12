import { supabase } from '../database/client.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import { applyOwnershipScope, OwnershipRule } from '../middleware/ownership.js';

type RowData = Record<string, unknown>;

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

export class ChassisQueries {
  async findAll(user: AuthenticatedUser, workOrderId?: string, customerId?: string): Promise<RowData[]> {
    let query = applyOwnershipScope(
      supabase
        .from('chassis_records')
        .select('*, work_orders(work_order_number, customer_name, product_name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
      user,
      CHASSIS_RULE,
    );

    if (workOrderId) query = query.eq('work_order_id', workOrderId);
    if (customerId) query = query.eq('customer_id', customerId);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async findById(id: string, user: AuthenticatedUser): Promise<RowData | null> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('chassis_records')
        .select('*, work_orders(work_order_number, customer_name, product_name)')
        .eq('id', id)
        .is('deleted_at', null)
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

  async create(input: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('chassis_records')
      .insert(input)
      .select('*, work_orders(work_order_number, customer_name, product_name)')
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: RowData, user: AuthenticatedUser): Promise<RowData> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('chassis_records')
        .update(updates)
        .eq('id', id)
        .is('deleted_at', null)
        .select('*, work_orders(work_order_number, customer_name, product_name)')
        .single(),
      user,
      CHASSIS_RULE,
    );

    if (error) throw error;
    return data;
  }

  async softDelete(id: string, user: AuthenticatedUser): Promise<void> {
    const { error } = await applyOwnershipScope(
      supabase
        .from('chassis_records')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null),
      user,
      CHASSIS_RULE,
    );

    if (error) throw error;
  }

  async findWorkOrderById(id: string, user: AuthenticatedUser): Promise<RowData | null> {
    const { data, error } = await applyOwnershipScope(
      supabase
        .from('work_orders')
        .select('id, work_order_number, customer_name, product_name')
        .eq('id', id)
        .is('deleted_at', null)
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
}