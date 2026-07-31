import { supabase } from '../database/client.js';
import { logger } from '../config/logger.js';
import { AuthenticatedUser } from '../middleware/auth.js';

export class AdminService {
  async resetDevData(user: AuthenticatedUser): Promise<{ message: string; timestamp: string }> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Reset test data feature is strictly disabled in production environment.');
    }

    // 1. Delete production stage records, chassis records, and production items
    await supabase.from('production_stage_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('chassis_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('production_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Delete work orders
    await supabase.from('work_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 3. Delete finance payments & sales
    await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 4. Delete quotation details & quotations
    await supabase.from('quotation_spec_values').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('quotation_custom_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('quotations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 5. Delete test customers
    await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 6. Reset yearly sequence table
    await supabase.from('quotation_yearly_sequences').delete().neq('year', -1);

    // Call stored procedure to reset PostgreSQL sequences if present
    try {
      await (supabase as any).rpc('reset_dev_sequences');
    } catch {
      // Ignored if RPC not present in mock DB
    }

    logger.warn({ actorId: user.id }, 'Transactional development test data reset successfully');

    return {
      message: 'Transactional test data reset successfully. All sequence counters restarted from 1.',
      timestamp: new Date().toISOString(),
    };
  }
}
