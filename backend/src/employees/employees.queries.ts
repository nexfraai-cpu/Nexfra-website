import { supabase } from '../database/client.js';
import { EmployeeRow } from '../database/types.js';

export class EmployeeQueries {
  async findAll(options: {
    role?: string;
    status?: string;
    search?: string;
    includeDisabled?: boolean;
  }): Promise<EmployeeRow[]> {
    let query = supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (!options.includeDisabled) {
      query = query.is('deleted_at', null);
    }
    if (options.role) {
      query = query.eq('role', options.role);
    }
    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.search) {
      const term = `%${options.search}%`;
      query = query.or(
        `full_name.ilike.${term},email.ilike.${term},employee_number.ilike.${term},employee_code.ilike.${term}`,
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as EmployeeRow[];
  }

  async findById(id: string): Promise<EmployeeRow | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // no rows
      throw error;
    }
    return data as EmployeeRow;
  }

  async findByEmail(email: string): Promise<EmployeeRow | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data as EmployeeRow | null;
  }

  async countByRole(role: string, excludeId?: string): Promise<number> {
    let query = supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('role', role)
      .eq('status', 'Active')
      .is('deleted_at', null);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  }

  async update(id: string, updates: Partial<EmployeeRow>): Promise<EmployeeRow> {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw Object.assign(new Error('Duplicate value'), { code: '23505', statusCode: 409 });
      }
      throw error;
    }
    return data as EmployeeRow;
  }

  async updateByAuthId(authId: string, updates: Partial<EmployeeRow>): Promise<EmployeeRow> {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('auth_id', authId)
      .select()
      .single();

    if (error) throw error;
    return data as EmployeeRow;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async createAuthUser(email: string, password: string, fullName: string, role: string) {
    return supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
  }

  async deleteAuthUser(authId: string) {
    const { error } = await supabase.auth.admin.deleteUser(authId);
    if (error) throw error;
  }

  async resetAuthUserPassword(authId: string, newPassword: string) {
    const { error } = await supabase.auth.admin.updateUserById(authId, {
      password: newPassword,
    });
    if (error) throw error;
  }

  async generatePasswordResetLink(email: string) {
    return supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
    });
  }
}
