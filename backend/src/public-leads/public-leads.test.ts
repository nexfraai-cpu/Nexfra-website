import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PublicLeadsService } from './public-leads.service.js';

jest.mock('../database/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ error: null })),
    })),
  },
}));

function createMockQueries() {
  return {
    create: jest.fn<any>(),
  };
}

describe('PublicLeadsService', () => {
  let queries: ReturnType<typeof createMockQueries>;
  let service: PublicLeadsService;

  beforeEach(() => {
    queries = createMockQueries();
    service = new PublicLeadsService(queries as any);
  });

  it('creates a customer with a web-form lead address', async () => {
    queries.create.mockResolvedValue({
      id: 'lead-uuid-1',
      customer_number: 'CUS-000001',
    });

    const result = await service.create({
      name: 'Ravi Sharma',
      company: 'Sharma Fabricators',
      phone: '+91-9876543210',
      email: 'ravi@sharmafab.in',
      message: 'Need a tipper quotation',
    });

    expect(queries.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ravi Sharma',
        company: 'Sharma Fabricators',
        phone: '+91-9876543210',
        email: 'ravi@sharmafab.in',
        address: 'Lead via Web Form: Need a tipper quotation',
        vehicles: [],
        created_by: null,
        updated_by: null,
      }),
    );
    expect(result.customer_number).toBe('CUS-000001');
  });

  it('defaults the address when no message is provided', async () => {
    queries.create.mockResolvedValue({ id: 'lead-uuid-2', customer_number: 'CUS-000002' });

    await service.create({ name: 'A', company: 'B' });

    expect(queries.create).toHaveBeenCalledWith(
      expect.objectContaining({ address: 'Lead via Web Form' }),
    );
  });
});
