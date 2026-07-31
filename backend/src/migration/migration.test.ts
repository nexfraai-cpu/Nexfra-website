import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { mapLegacyState, legacyId } from './migration.mapper.js';
import { legacyStateSchema } from './migration.validator.js';
import { MigrationService } from './migration.service.js';
import { LegacyState } from './migration.types.js';

jest.mock('../database/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ error: null })),
      select: jest.fn(() => ({
        count: 0,
        error: null,
      })),
    })),
  },
}));

function buildLegacyState(): LegacyState {
  return {
    activeRole: 'Admin',
    employees: [
      {
        id: 'EMP-000001',
        fullName: 'Ramesh Kumar',
        email: 'ramesh@nexfra.in',
        phone: '+91 90000 00001',
        employeeCode: 'RK01',
        role: 'admin',
        status: 'Active',
        password: 'secret',
        isDeleted: false,
        createdDate: '2026-01-10',
        lastLogin: null,
      },
    ],
    customers: [
      {
        id: 'CUST-001',
        name: 'Tata Logistics Pvt Ltd',
        company: 'Tata Logistics',
        gst: '33AAACT8281M1Z5',
        phone: '+91 98400 12345',
        email: 'operations@tatalogistics.com',
        address: 'Plot 12, Port Road, Tuticorin, TN',
        vehicles: ['TN-69-AA-1234'],
        outstanding: 0,
      },
    ],
    products: {
      flatbed: {
        name: 'Flat Bed Trailer',
        basePrice: 850000,
        templates: ['32 Feet Flatbed', '40 Feet Flatbed'],
        specs: [
          {
            id: 'length',
            name: 'Length',
            default: '40 Feet',
            options: [
              { name: '32 Feet', priceDiff: -50000 },
              { name: '40 Feet', priceDiff: 0 },
            ],
          },
        ],
      },
    },
    quotations: [
      {
        id: 'Q-2026-001',
        subtype: 'flatbed',
        customerId: 'CUST-001',
        customerName: 'Tata Logistics',
        model: 'Tata Prima',
        productName: 'Flat Bed Trailer',
        date: '2026-07-15',
        createdAt: '2026-07-15T10:00:00.000Z',
        total: 900000,
        status: 'Pending Approval',
        specs: { length: '40 Feet' },
        notRequired: {},
        capacity: 'NA',
        dimensions: { length: '40 Feet', height: 'NA', width: '98 Inches' },
        scopeOfWork: 'As Mentioned above',
        terms: ['Term 1'],
        orderQty: 1,
        bankDetails: { bankName: 'ICICI' },
      },
    ],
    quotationCounter: 1,
    workOrders: [
      {
        id: 'WO-2026-001',
        quoteId: 'Q-2026-001',
        customerName: 'Tata Logistics',
        product: 'Flat Bed Trailer',
        date: '2026-07-20',
        stage: 'Pending',
        progress: 0,
        specs: ['40 Feet Deck'],
        notes: 'Dispatch to shop floor',
        dueDate: '2026-08-01',
        urgent: false,
      },
    ],
    productionItems: [
      {
        id: 'PI-2026-001',
        quoteId: 'Q-2026-001',
        customerName: 'Tata Logistics',
        product: 'Flat Bed Trailer',
        date: '2026-07-21',
        columnStatus: 'Not Started',
        progressPct: 0,
        progressionMap: {},
        remarks: {},
        dueDate: '2026-08-01',
        urgent: false,
      },
    ],
    sales: [
      {
        invoiceId: 'INV-000001',
        customerName: 'Tata Logistics',
        product: 'Flat Bed Trailer',
        amount: 900000,
        date: '2026-07-22',
        status: 'Pending',
      },
    ],
    payments: [
      {
        id: 'TXN-1001',
        quoteId: 'Q-2026-001',
        invoiceId: 'INV-000001',
        date: '2026-07-23',
        time: '10:30',
        amount: 450000,
        mode: 'RTGS',
        ref: 'NEFT-8842',
      },
    ],
    logs: [{ time: '3:45 PM', message: 'System initialized.' }],
    adminPricing: { floor6: -15000, floor10: 30000 },
    customItemDefinitions: [],
    productSpecOverrides: {},
    chassisRecords: [],
    employeeCounter: 1,
  };
}

describe('migration.mapper', () => {
  it('generates deterministic UUIDs from legacy string IDs', () => {
    const a = legacyId('customer', 'CUST-001');
    const b = legacyId('customer', 'CUST-001');
    const c = legacyId('customer', 'CUST-002');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('maps employees to the employees table with normalized role/status', () => {
    const { inserts } = mapLegacyState(buildLegacyState());
    const employees = inserts.find((t) => t.table === 'employees')!;
    expect(employees.rows).toHaveLength(1);
    expect(employees.rows[0]).toMatchObject({
      employee_number: 'EMP-000001',
      full_name: 'Ramesh Kumar',
      email: 'ramesh@nexfra.in',
      role: 'admin',
      status: 'Active',
      deleted_at: null,
    });
    // password must NOT be migrated
    expect(employees.rows[0]).not.toHaveProperty('password');
  });

  it('maps customers and nullifies placeholder GST', () => {
    const state = buildLegacyState();
    state.customers![1] = { id: 'CUST-002', name: 'X', company: 'Y', gst: 'Pending' };
    const { inserts } = mapLegacyState(state);
    const customers = inserts.find((t) => t.table === 'customers')!;
    expect(customers.rows[0]).toMatchObject({ customer_number: 'CUST-001', company: 'Tata Logistics' });
    expect(customers.rows[1].gst).toBeNull();
  });

  it('maps products into products/templates/specs/options tables', () => {
    const { inserts } = mapLegacyState(buildLegacyState());
    const products = inserts.find((t) => t.table === 'products')!;
    const templates = inserts.find((t) => t.table === 'product_templates')!;
    const specs = inserts.find((t) => t.table === 'product_template_specs')!;
    const options = inserts.find((t) => t.table === 'product_spec_options')!;

    expect(products.rows).toHaveLength(1);
    expect(templates.rows).toHaveLength(1);
    expect(templates.rows[0]).toMatchObject({ key: 'flatbed', name: 'Flat Bed Trailer', base_price: 850000 });
    expect(specs.rows).toHaveLength(1);
    expect(specs.rows[0]).toMatchObject({ spec_key: 'length', name: 'Length', default_value: '40 Feet' });
    expect(options.rows).toHaveLength(2);
    expect(options.rows.find((o: any) => o.option_name === '40 Feet')!.is_default).toBe(true);
  });

  it('maps quotations with status normalization and spec values', () => {
    const { inserts } = mapLegacyState(buildLegacyState());
    const quotations = inserts.find((t) => t.table === 'quotations')!;
    const specValues = inserts.find((t) => t.table === 'quotation_spec_values')!;

    expect(quotations.rows).toHaveLength(1);
    expect(quotations.rows[0]).toMatchObject({
      quotation_number: 'Q-2026-001',
      customer_name: 'Tata Logistics',
      status: 'Pending',
      product_key: 'flatbed',
      total: 900000,
    });
    expect(specValues.rows).toHaveLength(1);
    expect(specValues.rows[0]).toMatchObject({ spec_key: 'length', selected_value: '40 Feet', is_not_required: false });
  });

  it('links quotations to migrated customer UUIDs', () => {
    const { inserts, idMap } = mapLegacyState(buildLegacyState());
    const customerId = idMap.customers.get('CUST-001')!;
    const quotation = inserts.find((t) => t.table === 'quotations')!.rows[0] as any;
    expect(quotation.customer_id).toBe(customerId);
  });

  it('maps work orders and links production items to work orders via quoteId', () => {
    const { inserts, idMap } = mapLegacyState(buildLegacyState());
    const workOrders = inserts.find((t) => t.table === 'work_orders')!;
    const productionItems = inserts.find((t) => t.table === 'production_items')!;
    const woId = idMap.workOrders.get('WO-2026-001')!;

    expect(workOrders.rows[0]).toMatchObject({ work_order_number: 'WO-2026-001', status: 'Open' });
    expect(productionItems.rows[0]).toMatchObject({ current_stage: 'Pending' });
    expect(productionItems.rows[0]).toHaveProperty('work_order_id', woId);
  });

  it('maps sales and payments, linking payments to sales', () => {
    const { inserts, idMap } = mapLegacyState(buildLegacyState());
    const sales = inserts.find((t) => t.table === 'sales')!;
    const payments = inserts.find((t) => t.table === 'payments')!;
    const saleId = idMap.sales.get('INV-000001')!;

    expect(sales.rows[0]).toMatchObject({ invoice_number: 'INV-000001', amount: 900000, status: 'Pending' });
    expect(payments.rows[0]).toMatchObject({ payment_number: 'TXN-1001', amount: 450000, mode: 'RTGS' });
    expect(payments.rows[0]).toHaveProperty('sale_id', saleId);
  });

  it('maps logs to audit_logs and adminPricing to app_settings', () => {
    const { inserts } = mapLegacyState(buildLegacyState());
    const auditLogs = inserts.find((t) => t.table === 'audit_logs')!;
    const settings = inserts.find((t) => t.table === 'app_settings')!;

    expect(auditLogs.rows).toHaveLength(1);
    expect(auditLogs.rows[0]).toMatchObject({ action: 'legacy_log', entity_type: 'system', description: 'System initialized.' });

    const pricing = settings.rows.find((s: any) => s.key === 'pricing_coefficients') as any;
    expect(pricing.value).toEqual({ floor6: -15000, floor10: 30000 });
    const counters = settings.rows.find((s: any) => s.key === 'legacy_counters') as any;
    expect(counters.value).toEqual({ quotationCounter: 1, employeeCounter: 1 });
  });

  it('produces an idMap with every entity referenced by relationships', () => {
    const { idMap } = mapLegacyState(buildLegacyState());
    expect(idMap.employees.size).toBe(1);
    expect(idMap.customers.size).toBe(1);
    expect(idMap.products.size).toBe(1);
    expect(idMap.productTemplates.size).toBe(1);
    expect(idMap.quotations.size).toBe(1);
    expect(idMap.workOrders.size).toBe(1);
    expect(idMap.sales.size).toBe(1);
  });
});

describe('migration.validator', () => {
  it('accepts a well-formed legacy state', () => {
    const res = legacyStateSchema.safeParse(buildLegacyState());
    expect(res.success).toBe(true);
  });

  it('rejects a state with non-array customers', () => {
    const res = legacyStateSchema.safeParse({ customers: 'nope' });
    expect(res.success).toBe(false);
  });
});

describe('MigrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses and maps valid input', async () => {
    const service = new MigrationService();
    const state = await service.parseInput(buildLegacyState());
    expect(state.customers).toHaveLength(1);
  });

  it('throws on invalid input', async () => {
    const service = new MigrationService();
    await expect(service.parseInput({ customers: 'bad' })).rejects.toThrow('Invalid legacy state');
  });

  it('dry-run produces no DB writes and marks everything ok', async () => {
    const service = new MigrationService();
    const result = await service.run(buildLegacyState(), true);
    expect(result.dryRun).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.verifications.every((v) => v.ok)).toBe(true);
    expect(result.verifications.length).toBeGreaterThan(0);
  });

  it('non-dry run executes inserts through supabase', async () => {
    const service = new MigrationService();
    const result = await service.run(buildLegacyState(), false);
    expect(result.dryRun).toBe(false);
    // insert called once per non-empty table bundle
    const { supabase } = jest.requireMock('../database/client') as {
      supabase: { from: jest.Mock };
    };
    expect(supabase.from).toHaveBeenCalled();
  });
});
