import { CustomerQueries } from '../customers/customers.queries.js';
import { CreateLeadInput } from './public-leads.validator.js';
import { logger } from '../config/logger.js';
import { supabase } from '../database/client.js';

export class PublicLeadsService {
  constructor(private customerQueries: CustomerQueries) {}

  async create(input: CreateLeadInput) {
    const customer = await this.customerQueries.create({
      name: input.name,
      company: input.company,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.message ? `Lead via Web Form: ${input.message}` : 'Lead via Web Form',
      vehicles: [],
      created_by: null,
      updated_by: null,
    } as any);

    const { error } = await supabase.from('audit_logs').insert({
      employee_id: null,
      action: 'create',
      entity_type: 'customer',
      entity_id: customer.id,
      description: 'Lead created via public web form',
      metadata: { source: 'web_form', company: input.company, name: input.name },
    });
    if (error) {
      logger.error({ error }, 'Public lead audit log insertion failed');
    }

    logger.info({ customerId: customer.id, company: input.company }, 'Public lead created');
    return customer;
  }
}
